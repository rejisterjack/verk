import { prisma } from "@/lib/db";
import {
  groupResource,
  parseGroupOperations,
  scimError,
  scimGuard,
  scimJson,
  type RawGroupMember,
} from "@/lib/scim";
import { paginateScim } from "@/lib/scim-page";
import {
  applyGroupMembership,
  findGroup,
  findTeamByGroupName,
  listGroupMembers,
} from "@/lib/services/scim-groups";

/** `displayName eq "Acme"` is the filter IdPs use to find a group before linking to it. */
function nameFromFilter(filter: string) {
  return filter.match(/displayName eq "([^"]+)"/i)?.[1];
}

export async function GET(request: Request) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  const url = new URL(request.url);
  const name = nameFromFilter(url.searchParams.get("filter") ?? "");
  const teams = await prisma.team.findMany({
    where: name
      ? {
          OR: [
            { name: { equals: name, mode: "insensitive" } },
            { slug: name.toLowerCase() },
          ],
        }
      : {},
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  // The list omits members, as most IdPs expect. GET /Groups/{id} returns them.
  return scimJson(
    paginateScim(
      teams.map((team) => groupResource(team)),
      url.searchParams.get("startIndex"),
      url.searchParams.get("count"),
    ),
  );
}

/**
 * Link an IdP group to an existing Verk team, found by displayName or externalId.
 * It never creates a team, because a team needs an OWNER. Initial members are applied.
 */
export async function POST(request: Request) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  let body: {
    displayName?: string;
    externalId?: string;
    members?: RawGroupMember[];
  };

  try {
    body = await request.json();
  } catch {
    return scimError(400, "Body must be valid JSON", "invalidSyntax");
  }
  if (!body.displayName && !body.externalId) {
    return scimError(
      400,
      "displayName or externalId is required",
      "invalidValue",
    );
  }
  const team = await findTeamByGroupName(body);

  if (!team) {
    return scimError(
      404,
      "No Verk team matches that group. Create the team in Verk first; SCIM only links to existing teams.",
    );
  }
  if (body.members?.length) {
    const { ops } = parseGroupOperations([
      { op: "add", path: "members", value: body.members },
    ]);

    await applyGroupMembership(team.id, ops);
  }

  return scimJson(groupResource(team, await listGroupMembers(team.id)), 201);
}

/**
 * Legacy shape: `PATCH /Groups?id=<teamId>` with `value: [{ value: <email> }]`.
 * Kept so existing integrations keep working. New clients use `PATCH /Groups/{id}`.
 */
export async function PATCH(request: Request) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  const id = new URL(request.url).searchParams.get("id");

  if (!id || !(await findGroup(id))) return scimError(404, "Group not found");
  let body: { Operations?: { op?: string; path?: string; value?: unknown }[] };

  try {
    body = await request.json();
  } catch {
    return scimError(400, "Body must be valid JSON", "invalidSyntax");
  }
  // Old clients sent no path; treat the value as the members list.
  const operations = (body.Operations ?? []).map((operation) => ({
    ...operation,
    path: operation.path ?? "members",
  }));
  const { ops, error } = parseGroupOperations(operations);

  if (error) return scimError(400, error, "invalidValue");
  await applyGroupMembership(id, ops);
  const team = (await findGroup(id))!;

  return scimJson(groupResource(team, await listGroupMembers(id)));
}

export async function PUT(request: Request) {
  return PATCH(request);
}

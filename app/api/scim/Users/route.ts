import { prisma } from "@/lib/db";
import { paginateScim } from "@/lib/scim-page";
import { scimError, scimGuard, scimJson, userResource } from "@/lib/scim";

/** `userName eq "ada@x.dev"` is the only filter IdPs use to look a user up. */
function emailFromFilter(filter: string) {
  return filter.match(/userName eq "([^"]+)"/i)?.[1]?.toLowerCase();
}

export async function GET(request: Request) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  const url = new URL(request.url);
  const teamId = url.searchParams.get("teamId") ?? "";
  const email = emailFromFilter(url.searchParams.get("filter") ?? "");

  // With a teamId: that team's members. Without one: every user, so an IdP can
  // look a user up by userName before it provisions them into a group.
  const users = teamId
    ? (
        await prisma.membership.findMany({
          where: { teamId, ...(email ? { user: { email } } : {}) },
          include: { user: true },
          orderBy: { createdAt: "asc" },
        })
      ).map((row) => row.user)
    : await prisma.user.findMany({
        where: email ? { email } : {},
        orderBy: { createdAt: "asc" },
        take: 1000,
      });

  return scimJson(
    paginateScim(
      users.map(userResource),
      url.searchParams.get("startIndex"),
      url.searchParams.get("count"),
    ),
  );
}

export async function POST(request: Request) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  let body: {
    userName?: string;
    name?: { formatted?: string };
    teamId?: string;
    active?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return scimError(400, "Body must be valid JSON", "invalidSyntax");
  }
  const email = body.userName?.trim().toLowerCase();

  if (!email) return scimError(400, "userName is required", "invalidValue");

  if (body.teamId) {
    const team = await prisma.team.findUnique({ where: { id: body.teamId } });

    if (!team) return scimError(404, "Team not found");
  }
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      disabled: body.active === false,
      ...(body.name?.formatted ? { name: body.name.formatted } : {}),
    },
    create: {
      email,
      name: body.name?.formatted ?? email,
      disabled: body.active === false,
    },
  });

  // teamId is optional: Okta and Entra create the user first, then add them to a group.
  if (body.teamId) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: user.id, teamId: body.teamId } },
      update: {},
      create: { userId: user.id, teamId: body.teamId, role: "MEMBER" },
    });
  }

  return scimJson(userResource(user), 201);
}

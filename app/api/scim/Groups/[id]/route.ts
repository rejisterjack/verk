import { NextResponse } from "next/server";

import {
  groupResource,
  parseGroupOperations,
  scimError,
  scimGuard,
  scimJson,
  type RawGroupMember,
} from "@/lib/scim";
import {
  applyGroupMembership,
  clearGroupMembers,
  findGroup,
  listGroupMembers,
} from "@/lib/services/scim-groups";

type Params = { params: Promise<{ id: string }> };

async function render(id: string) {
  const team = await findGroup(id);

  if (!team) return null;

  return groupResource(team, await listGroupMembers(id));
}

export async function GET(request: Request, { params }: Params) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  const group = await render((await params).id);

  if (!group) return scimError(404, "Group not found");

  return scimJson(group);
}

export async function PATCH(request: Request, { params }: Params) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  const { id } = await params;

  if (!(await findGroup(id))) return scimError(404, "Group not found");
  let body: { Operations?: { op?: string; path?: string; value?: unknown }[] };

  try {
    body = await request.json();
  } catch {
    return scimError(400, "Body must be valid JSON", "invalidSyntax");
  }
  const { ops, error } = parseGroupOperations(body.Operations);

  if (error) return scimError(400, error, "invalidValue");
  await applyGroupMembership(id, ops);

  // RFC 7644: a PATCH may answer 200 with the group, or 204. Okta and Entra accept both.
  return scimJson((await render(id))!);
}

export async function PUT(request: Request, { params }: Params) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  const { id } = await params;

  if (!(await findGroup(id))) return scimError(404, "Group not found");
  let body: { members?: RawGroupMember[] };

  try {
    body = await request.json();
  } catch {
    return scimError(400, "Body must be valid JSON", "invalidSyntax");
  }
  // PUT replaces the whole member list with exactly what the IdP sent.
  const { ops } = parseGroupOperations([
    { op: "replace", path: "members", value: body.members ?? [] },
  ]);

  await applyGroupMembership(id, ops);

  return scimJson((await render(id))!);
}

/** Deleting a group empties it. The Verk team, its OWNERs and its issues are left alone. */
export async function DELETE(request: Request, { params }: Params) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  const { id } = await params;

  if (!(await findGroup(id))) return scimError(404, "Group not found");
  await clearGroupMembers(id);

  return new NextResponse(null, { status: 204 });
}

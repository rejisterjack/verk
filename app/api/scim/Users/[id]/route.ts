import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { scimError, scimGuard, scimJson, userResource } from "@/lib/scim";

type Params = { params: Promise<{ id: string }> };

async function findUser(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function GET(request: Request, { params }: Params) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  const user = await findUser((await params).id);

  if (!user) return scimError(404, "User not found");

  return scimJson(userResource(user));
}

export async function PATCH(request: Request, { params }: Params) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  const { id } = await params;
  let body: {
    active?: boolean;
    teamId?: string;
    Operations?: { op?: string; path?: string; value?: unknown }[];
  };

  try {
    body = await request.json();
  } catch {
    return scimError(400, "Body must be valid JSON", "invalidSyntax");
  }
  const find = (path: string) =>
    body.Operations?.find(
      (operation) =>
        operation.op?.toLowerCase() === "replace" && operation.path === path,
    );
  const replaceActive = find("active");
  const replaceName =
    find("name.formatted") ??
    body.Operations?.find(
      (operation) =>
        operation.op?.toLowerCase() === "replace" && operation.path === "name",
    );
  const replaceEmail = find("userName");
  const active =
    typeof body.active === "boolean"
      ? body.active
      : typeof replaceActive?.value === "boolean"
        ? replaceActive.value
        : undefined;
  const name =
    typeof replaceName?.value === "string" ? replaceName.value : undefined;
  const email =
    typeof replaceEmail?.value === "string"
      ? replaceEmail.value.toLowerCase()
      : undefined;

  if (active === undefined && name === undefined && email === undefined) {
    return scimError(400, "Nothing to update", "noTarget");
  }
  if (!(await findUser(id))) return scimError(404, "User not found");

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(active === undefined ? {} : { disabled: !active }),
      ...(name === undefined ? {} : { name }),
      ...(email === undefined ? {} : { email }),
    },
  });

  if (active === false && body.teamId) {
    await prisma.membership.deleteMany({
      where: { userId: id, teamId: body.teamId },
    });
  }

  return scimJson(userResource(user));
}

export async function PUT(request: Request, { params }: Params) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  const { id } = await params;
  let body: {
    userName?: string;
    active?: boolean;
    name?: { formatted?: string };
  };

  try {
    body = await request.json();
  } catch {
    return scimError(400, "Body must be valid JSON", "invalidSyntax");
  }
  if (!(await findUser(id))) return scimError(404, "User not found");

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(body.userName ? { email: body.userName.toLowerCase() } : {}),
      ...(body.name?.formatted ? { name: body.name.formatted } : {}),
      ...(typeof body.active === "boolean" ? { disabled: !body.active } : {}),
    },
  });

  return scimJson(userResource(user));
}

export async function DELETE(request: Request, { params }: Params) {
  const blocked = await scimGuard(request);

  if (blocked) return blocked;
  const { id } = await params;
  const teamId = new URL(request.url).searchParams.get("teamId");

  if (!(await findUser(id))) return scimError(404, "User not found");
  if (teamId) {
    await prisma.membership.deleteMany({ where: { userId: id, teamId } });
  }
  await prisma.user.update({ where: { id }, data: { disabled: true } });

  return new NextResponse(null, { status: 204 });
}

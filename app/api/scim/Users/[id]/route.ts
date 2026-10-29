import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

function authorized(request: Request) {
  const token = process.env.SCIM_TOKEN;

  if (!token) return false;

  return request.headers.get("authorization") === `Bearer ${token}`;
}

function userResource(user: {
  id: string;
  email: string;
  name: string | null;
  disabled: boolean;
}) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.id,
    userName: user.email,
    name: { formatted: user.name ?? user.email },
    active: !user.disabled,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!rateLimit(`scim:${ip}`).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(userResource(user));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!rateLimit(`scim:${ip}`).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const body = (await request.json()) as {
    active?: boolean;
    teamId?: string;
    Operations?: { op?: string; path?: string; value?: unknown }[];
  };
  const replaceActive = body.Operations?.find(
    (operation) =>
      operation.op?.toLowerCase() === "replace" && operation.path === "active",
  );
  const active =
    typeof body.active === "boolean"
      ? body.active
      : typeof replaceActive?.value === "boolean"
        ? replaceActive.value
        : undefined;

  if (active === undefined) {
    return NextResponse.json({ error: "active required" }, { status: 400 });
  }
  const user = await prisma.user.update({
    where: { id },
    data: { disabled: !active },
  });

  if (!active && body.teamId) {
    await prisma.membership.deleteMany({
      where: { userId: id, teamId: body.teamId },
    });
  }

  return NextResponse.json(userResource(user));
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!rateLimit(`scim:${ip}`).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const teamId = new URL(request.url).searchParams.get("teamId");

  if (teamId) {
    await prisma.membership.deleteMany({ where: { userId: id, teamId } });
  }
  await prisma.user.update({
    where: { id },
    data: { disabled: true },
  });

  return new NextResponse(null, { status: 204 });
}

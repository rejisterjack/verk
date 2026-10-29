import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

function authorized(request: Request) {
  const token = process.env.SCIM_TOKEN;

  if (!token) return false;
  const header = request.headers.get("authorization") ?? "";

  return header === `Bearer ${token}`;
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

function limited(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  return !rateLimit(`scim:${ip}`).ok;
}

export async function GET(request: Request) {
  if (limited(request)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const teamId = url.searchParams.get("teamId") ?? "";
  const filter = url.searchParams.get("filter") ?? "";
  const emailMatch = filter.match(/userName eq "([^"]+)"/i);
  const email = emailMatch?.[1]?.toLowerCase();

  if (!teamId) {
    return NextResponse.json({ error: "teamId required" }, { status: 400 });
  }
  const memberships = await prisma.membership.findMany({
    where: {
      teamId,
      ...(email ? { user: { email } } : {}),
    },
    include: { user: true },
  });
  const resources = memberships.map((row) => userResource(row.user));

  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: resources.length,
    Resources: resources,
  });
}

export async function POST(request: Request) {
  if (limited(request)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    userName?: string;
    name?: { formatted?: string };
    teamId?: string;
  };
  const email = body.userName?.toLowerCase();

  if (!email || !body.teamId) {
    return NextResponse.json({ error: "userName and teamId required" }, { status: 400 });
  }
  const user = await prisma.user.upsert({
    where: { email },
    update: { disabled: false, name: body.name?.formatted },
    create: {
      email,
      name: body.name?.formatted ?? email,
    },
  });

  await prisma.membership.upsert({
    where: { userId_teamId: { userId: user.id, teamId: body.teamId } },
    update: {},
    create: { userId: user.id, teamId: body.teamId, role: "MEMBER" },
  });

  return NextResponse.json(userResource(user), { status: 201 });
}

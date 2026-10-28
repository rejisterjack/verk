import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

function authorized(request: Request) {
  const token = process.env.SCIM_TOKEN;

  if (!token) return false;
  const header = request.headers.get("authorization") ?? "";

  return header === `Bearer ${token}`;
}

export async function POST(request: Request) {
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

  return NextResponse.json({ id: user.id, userName: user.email }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const email = url.searchParams.get("userName")?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "userName required" }, { status: 400 });
  }
  await prisma.user.updateMany({
    where: { email },
    data: { disabled: true },
  });

  return NextResponse.json({ ok: true });
}

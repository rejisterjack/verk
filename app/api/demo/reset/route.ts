import { timingSafeEqual } from "node:crypto";

import { NextRequest } from "next/server";

import { rateLimit } from "@/lib/rate-limit";
import { isDemoMode } from "@/lib/utils";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!rateLimit(`demo-reset:${ip}`).ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!isDemoMode()) {
    return Response.json({ error: "Demo mode disabled" }, { status: 403 });
  }
  const secret = request.headers.get("x-demo-reset-secret") ?? "";
  const expected = process.env.DEMO_RESET_SECRET ?? "";

  if (!expected || !secret || !safeEqual(secret, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { seedDemo } = await import("@/prisma/seed");

  await seedDemo();

  return Response.json({ ok: true });
}

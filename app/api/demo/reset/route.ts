import { NextRequest } from "next/server";

import { isDemoMode } from "@/lib/utils";

export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return Response.json({ error: "Demo mode disabled" }, { status: 403 });
  }
  const secret = request.headers.get("x-demo-reset-secret");

  if (!secret || secret !== process.env.DEMO_RESET_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dynamic import keeps seed logic out of cold paths when unused
  const { execSync } = await import("node:child_process");

  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

  return Response.json({ ok: true });
}

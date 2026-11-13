import { isDemoMode } from "@/lib/utils";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) return new Response(null, { status: 404 });

  const header = request.headers.get("authorization");

  if (header !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDemoMode()) {
    return Response.json({ ok: true, skipped: true });
  }

  const { seedDemo } = await import("@/prisma/seed");

  await seedDemo();

  return Response.json({ ok: true });
}

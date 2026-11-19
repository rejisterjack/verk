import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      ok: true,
      status: "healthy",
      demo: process.env.DEMO_MODE === "true",
      latencyMs: Date.now() - started,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        status: "unhealthy",
        latencyMs: Date.now() - started,
      },
      { status: 503 },
    );
  }
}

import { advanceDueCycles } from "@/lib/services/cycles";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) return new Response(null, { status: 404 });

  const header = request.headers.get("authorization");

  if (header !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const advanced = await advanceDueCycles();

  return Response.json({ advanced });
}

import { auth } from "@/lib/auth";
import { rateLimitShared } from "@/lib/rate-limit";
import { exportMyData } from "@/lib/services/privacy";

/** Download everything Verk holds about the signed-in person, as JSON. */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await rateLimitShared(
    `account-export:${session.user.id}`,
    5,
    60 * 60_000,
  );

  if (!limited.ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const data = await exportMyData(session.user.id);

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="verk-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}

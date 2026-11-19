import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { listAuditLog } from "@/lib/services/audit";

/**
 * `GET ?action=member.removed&actorId=&from=YYYY-MM-DD&to=YYYY-MM-DD&cursor=&take=50`.
 * Admins and owners only. Newest first; `nextCursor` pages back in time.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId, "ADMIN");
    const q = new URL(request.url).searchParams;

    return Response.json(
      await listAuditLog(teamId, {
        action: q.get("action") ?? undefined,
        actorId: q.get("actorId") ?? undefined,
        from: q.get("from") ?? undefined,
        to: q.get("to") ?? undefined,
        cursor: q.get("cursor") ?? undefined,
        take: q.get("take") ? Number(q.get("take")) : undefined,
      }),
    );
  } catch (error) {
    return jsonError(error);
  }
}

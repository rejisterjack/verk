import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { rankWork } from "@/lib/agent-work";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/rate-limit";
import { readableIssueScope } from "@/lib/services/guest-scope";

/**
 * `GET ?limit=5`: the open issues this API key's user could pick up next, best first. Issues
 * blocked by an unfinished issue are left out. Read-only; the agent then claims one by updating
 * it (for example assigning it to itself) through the normal API.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "MEMBER");
    const limited = await rateLimitShared(
      `agent-next:${auth.user.id}`,
      60,
      60_000,
    );

    if (!limited.ok) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }
    const limit = Math.min(
      20,
      Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 5),
    );
    const scope = await readableIssueScope(teamId, auth.user.id);
    const rows = await prisma.issue.findMany({
      where: {
        teamId,
        archivedAt: null,
        status: { in: ["BACKLOG", "TODO", "IN_PROGRESS"] },
        OR: [{ assigneeId: null }, { assigneeId: auth.user.id! }],
        ...(scope ? { AND: [scope] } : {}),
      },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        priority: true,
        assigneeId: true,
        createdAt: true,
        // Blocked while an issue it is "blocked by" is not finished (the same rule as the
        // `blocked` filter).
        relationsFrom: {
          where: {
            type: "BLOCKED_BY",
            toIssue: { status: { notIn: ["DONE", "CANCELLED"] } },
          },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    const ranked = rankWork(
      rows.map((row) => ({
        id: row.id,
        number: row.number,
        title: row.title,
        status: row.status,
        priority: row.priority,
        assigneeId: row.assigneeId,
        createdAt: row.createdAt,
        blocked: row.relationsFrom.length > 0,
      })),
      auth.user.id!,
    );

    return Response.json({ issues: ranked.slice(0, limit) });
  } catch (error) {
    return jsonError(error);
  }
}

import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { guestIssueScope } from "@/lib/services/guest-scope";
import { syncIssues } from "@/lib/services/issues";

export const dynamic = "force-dynamic";

const POLL_MS = 2000;
const HEARTBEAT_MS = 15_000;
/** Serverless hosts cut long requests anyway: close cleanly and let the browser reconnect. */
const MAX_LIFETIME_MS = 4 * 60_000;

/**
 * Server-sent events: a small `data:` message whenever issues, comments or project updates change
 * in this team, a `: ping` comment every 15 seconds so proxies keep the connection open, and a
 * clean close after 4 minutes (EventSource reconnects by itself and sends `Last-Event-ID`).
 * A guest limited to some projects only hears about issues inside them.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "GUEST");
    const scope = await guestIssueScope(teamId, auth.user.id);
    const allowed = scope ? (scope.projectId as { in: string[] }).in : null;
    const encoder = new TextEncoder();
    // Resume from where the browser left off when it reconnects, so nothing is missed.
    const resumeFrom = Number(request.headers.get("last-event-id"));
    let since =
      Number.isFinite(resumeFrom) && resumeFrom > 0
        ? new Date(resumeFrom).toISOString()
        : new Date().toISOString();
    let poll: ReturnType<typeof setInterval> | undefined;
    let beat: ReturnType<typeof setInterval> | undefined;
    let closer: ReturnType<typeof setTimeout> | undefined;
    let busy = false;
    let closed = false;

    const stream = new ReadableStream({
      start(controller) {
        const stop = () => {
          if (closed) return;
          closed = true;
          if (poll) clearInterval(poll);
          if (beat) clearInterval(beat);
          if (closer) clearTimeout(closer);
          try {
            controller.close();
          } catch {
            // already closed
          }
        };

        controller.enqueue(encoder.encode("retry: 3000\n\n"));
        beat = setInterval(() => {
          if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
        }, HEARTBEAT_MS);
        closer = setTimeout(stop, MAX_LIFETIME_MS);
        poll = setInterval(() => {
          if (busy || closed) return; // never stack overlapping polls
          busy = true;
          void Promise.all([
            syncIssues(teamId, since, auth.user.id),
            prisma.comment.count({
              where: {
                issue: { teamId },
                createdAt: { gt: new Date(since) },
              },
            }),
            prisma.projectUpdate.count({
              where: {
                project: { teamId },
                createdAt: { gt: new Date(since) },
              },
            }),
          ])
            .then(([result, comments, updates]) => {
              since = result.serverTime;
              const issues = allowed
                ? result.issues.filter(
                    (issue) =>
                      issue.projectId && allowed.includes(issue.projectId),
                  )
                : result.issues;
              // A guest is not told which deleted ids ever existed in their scope: send none.
              const deletedIds = allowed ? [] : result.deletedIds;

              if (
                !issues.length &&
                !deletedIds.length &&
                (allowed ? true : !comments && !updates)
              ) {
                return;
              }
              controller.enqueue(
                encoder.encode(
                  `id: ${Date.parse(since)}\ndata: ${JSON.stringify({
                    issues: issues.map((issue) => ({
                      id: issue.id,
                      revision: issue.revision,
                    })),
                    deletedIds,
                    comments: allowed ? 0 : comments,
                  })}\n\n`,
                ),
              );
            })
            .catch(() => undefined)
            .finally(() => {
              busy = false;
            });
        }, POLL_MS);
        request.signal.addEventListener("abort", stop);
      },
      cancel() {
        closed = true;
        if (poll) clearInterval(poll);
        if (beat) clearInterval(beat);
        if (closer) clearTimeout(closer);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

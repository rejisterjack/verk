import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { rateLimitShared } from "@/lib/rate-limit";
import * as claims from "@/lib/services/agent-claims";

/** Everyone's current claims in the team, so an agent can see what is already taken. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId, "MEMBER");

    return Response.json({ claims: await claims.listClaims(teamId) });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Work on one issue. Body: `{ action, issueId, ... }` where action is
 *   "claim"     take a lease (optional leaseMinutes, up to 240)
 *   "heartbeat" keep the lease alive (optional leaseMinutes, note)
 *   "complete"  report success (note, resultUrl, markDone)
 *   "fail"      report failure (note); the issue goes back to Todo, unassigned
 *   "release"   let go without a result
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "MEMBER");
    const userId = auth.user.id!;
    const limited = await rateLimitShared(
      `agent-claims:${userId}`,
      120,
      60_000,
    );

    if (!limited.ok) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }
    const body = (await request.json()) as {
      action?: string;
      issueId?: string;
      leaseMinutes?: number;
      note?: unknown;
      resultUrl?: unknown;
      markDone?: boolean;
    };

    if (typeof body.issueId !== "string" || !body.issueId) {
      return Response.json({ error: "issueId is required" }, { status: 400 });
    }
    const role = auth.role;

    switch (body.action) {
      case "claim":
        return Response.json(
          await claims.claimIssue(teamId, userId, body.issueId, {
            leaseMinutes: body.leaseMinutes,
            role,
          }),
          { status: 201 },
        );
      case "heartbeat":
        return Response.json(
          await claims.heartbeat(teamId, userId, body.issueId, body),
        );
      case "complete":
      case "fail":
        return Response.json(
          await claims.reportResult(teamId, userId, body.issueId, {
            outcome: body.action === "complete" ? "completed" : "failed",
            note: body.note,
            resultUrl: body.resultUrl,
            markDone: body.markDone === true,
            role,
          }),
        );
      case "release":
        return Response.json(
          await claims.releaseClaim(teamId, userId, body.issueId, role),
        );
      default:
        return Response.json(
          {
            error: "action must be claim, heartbeat, complete, fail or release",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    return jsonError(error);
  }
}

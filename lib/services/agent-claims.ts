import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import {
  canAct,
  cleanNote,
  decideClaim,
  effectiveState,
  leaseEnd,
  MAX_CLAIMS_PER_AGENT,
} from "@/lib/agent-claims";
import { canSeeIssue } from "@/lib/services/guest-scope";
import { addComment } from "@/lib/services/comments";
import { updateIssue } from "@/lib/services/issues";

async function findIssue(teamId: string, userId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId, archivedAt: null },
    select: {
      id: true,
      number: true,
      status: true,
      assigneeId: true,
      projectId: true,
    },
  });

  if (!issue || !(await canSeeIssue(teamId, userId, issue))) {
    throw new AuthError("Issue not found", "NOT_FOUND", 404);
  }

  return issue;
}

/**
 * Take a lease on an issue. The write is a compare-and-set on the row we just read, so two agents
 * racing for the same issue can't both win: the loser gets 409.
 */
export async function claimIssue(
  teamId: string,
  agentUserId: string,
  issueId: string,
  opts: { leaseMinutes?: number; role: "GUEST" | "MEMBER" | "ADMIN" | "OWNER" },
) {
  const issue = await findIssue(teamId, agentUserId, issueId);

  if (issue.status === "DONE" || issue.status === "CANCELLED") {
    throw new AuthError("That issue is already finished", "CONFLICT", 409);
  }
  const existing = await prisma.agentClaim.findUnique({ where: { issueId } });
  const activeForAgent = await prisma.agentClaim.count({
    where: { agentUserId, state: "active", leaseExpiresAt: { gt: new Date() } },
  });
  const decision = decideClaim(existing, agentUserId, activeForAgent);

  if (!decision.ok) {
    throw new AuthError(
      decision.reason === "held"
        ? "Another agent is working on this issue"
        : `An agent can work on up to ${MAX_CLAIMS_PER_AGENT} issues at once`,
      "CONFLICT",
      409,
    );
  }
  const leaseExpiresAt = leaseEnd(opts.leaseMinutes);

  if (!existing) {
    try {
      await prisma.agentClaim.create({
        data: { issueId, teamId, agentUserId, leaseExpiresAt },
      });
    } catch {
      throw new AuthError(
        "Another agent just took this issue",
        "CONFLICT",
        409,
      );
    }
  } else {
    // Only replace the row we read: if someone else changed it meanwhile, count is 0.
    const swapped = await prisma.agentClaim.updateMany({
      where: { issueId, updatedAt: existing.updatedAt },
      data: {
        agentUserId,
        state: "active",
        leaseExpiresAt,
        note: "",
        resultUrl: "",
        ...(decision.takeOver ? { claimedAt: new Date() } : {}),
      },
    });

    if (swapped.count !== 1) {
      throw new AuthError(
        "Another agent just took this issue",
        "CONFLICT",
        409,
      );
    }
  }
  // The agent becomes the assignee and the issue starts, like a person picking it up.
  await updateIssue(
    teamId,
    issueId,
    {
      assigneeId: agentUserId,
      ...(issue.status === "BACKLOG" || issue.status === "TODO"
        ? { status: "IN_PROGRESS" }
        : {}),
    },
    opts.role,
    agentUserId,
  );

  return { issueId, number: issue.number, leaseExpiresAt };
}

async function ownClaim(issueId: string, agentUserId: string) {
  const claim = await prisma.agentClaim.findUnique({ where: { issueId } });

  if (!canAct(claim, agentUserId)) {
    throw new AuthError(
      "You do not hold a live claim on this issue",
      "CONFLICT",
      409,
    );
  }

  return claim!;
}

/** Keep the lease alive (and optionally leave a progress note). */
export async function heartbeat(
  teamId: string,
  agentUserId: string,
  issueId: string,
  input: { leaseMinutes?: number; note?: unknown },
) {
  await findIssue(teamId, agentUserId, issueId);
  await ownClaim(issueId, agentUserId);
  const note = cleanNote(input.note);
  const leaseExpiresAt = leaseEnd(input.leaseMinutes);

  await prisma.agentClaim.update({
    where: { issueId },
    data: { leaseExpiresAt, ...(note ? { note } : {}) },
  });

  return { leaseExpiresAt };
}

/**
 * Finish: `completed` marks the issue done (or leaves it for review, see `markDone`), `failed`
 * leaves it open with the reason as a comment. Either way a comment records what the agent said.
 */
export async function reportResult(
  teamId: string,
  agentUserId: string,
  issueId: string,
  input: {
    outcome: unknown;
    note?: unknown;
    resultUrl?: unknown;
    markDone?: boolean;
    role: "GUEST" | "MEMBER" | "ADMIN" | "OWNER";
  },
) {
  await findIssue(teamId, agentUserId, issueId);
  await ownClaim(issueId, agentUserId);
  if (input.outcome !== "completed" && input.outcome !== "failed") {
    throw new AuthError(
      'outcome must be "completed" or "failed"',
      "BAD_REQUEST",
      400,
    );
  }
  const note = cleanNote(input.note);
  const resultUrl =
    typeof input.resultUrl === "string" && /^https?:\/\//i.test(input.resultUrl)
      ? input.resultUrl.slice(0, 500)
      : "";

  await prisma.agentClaim.update({
    where: { issueId },
    data: { state: input.outcome, note, resultUrl },
  });
  const lines = [
    input.outcome === "completed"
      ? "Agent finished this issue."
      : "Agent could not finish this issue.",
    note,
    resultUrl ? `Result: ${resultUrl}` : "",
  ].filter(Boolean);

  await addComment(teamId, issueId, agentUserId, { body: lines.join("\n\n") });
  if (input.outcome === "completed" && input.markDone) {
    await updateIssue(
      teamId,
      issueId,
      { status: "DONE" },
      input.role,
      agentUserId,
    );
  }
  if (input.outcome === "failed") {
    // Hand it back: nobody holds it, so another agent or a person can pick it up.
    await updateIssue(
      teamId,
      issueId,
      { assigneeId: null, status: "TODO" },
      input.role,
      agentUserId,
    );
  }

  return { ok: true as const };
}

/** Let go without finishing. */
export async function releaseClaim(
  teamId: string,
  agentUserId: string,
  issueId: string,
  role: "GUEST" | "MEMBER" | "ADMIN" | "OWNER",
) {
  await findIssue(teamId, agentUserId, issueId);
  await ownClaim(issueId, agentUserId);
  await prisma.agentClaim.update({
    where: { issueId },
    data: { state: "released" },
  });
  await updateIssue(
    teamId,
    issueId,
    { assigneeId: null, status: "TODO" },
    role,
    agentUserId,
  );

  return { ok: true as const };
}

/** Claims in a team with their live state, for the Agents page. */
export async function listClaims(teamId: string) {
  const rows = await prisma.agentClaim.findMany({
    where: { teamId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      issue: { select: { number: true, title: true, status: true } },
      agent: { select: { id: true, name: true, email: true } },
    },
  });

  return rows.map((row) => ({
    issueId: row.issueId,
    number: row.issue.number,
    title: row.issue.title,
    issueStatus: row.issue.status,
    agent: row.agent.name ?? row.agent.email,
    state: effectiveState(row),
    leaseExpiresAt: row.leaseExpiresAt,
    note: row.note,
    resultUrl: row.resultUrl,
    claimedAt: row.claimedAt,
  }));
}

/** An admin frees an issue whose agent is stuck. */
export async function forceRelease(teamId: string, issueId: string) {
  const claim = await prisma.agentClaim.findFirst({
    where: { issueId, teamId },
  });

  if (!claim) throw new AuthError("No claim on that issue", "NOT_FOUND", 404);
  await prisma.agentClaim.update({
    where: { issueId },
    data: { state: "released" },
  });
}

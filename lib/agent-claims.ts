/**
 * Delegating an issue to a coding agent. An agent takes a short lease on an issue, keeps it alive
 * with heartbeats, then reports a result or lets go. If the agent crashes, the lease runs out and
 * the issue is free again. Pure rules here; `lib/services/agent-claims.ts` does the database work.
 */

export const LEASE_MINUTES = 30;
export const MAX_LEASE_MINUTES = 240;
export const MAX_NOTE = 2000;
export const MAX_CLAIMS_PER_AGENT = 5;

export type ClaimState =
  "active" | "expired" | "completed" | "failed" | "released";

export type ClaimRow = {
  agentUserId: string;
  /** Stored as text; anything unknown is treated as finished. */
  state: string;
  leaseExpiresAt: Date;
};

/** A claim that is still `active` in the database but past its lease counts as expired. */
export function effectiveState(claim: ClaimRow, now = new Date()): ClaimState {
  if (claim.state === "active") {
    return claim.leaseExpiresAt.getTime() <= now.getTime()
      ? "expired"
      : "active";
  }

  return claim.state === "completed" ||
    claim.state === "failed" ||
    claim.state === "expired"
    ? claim.state
    : "released";
}

export function leaseEnd(minutes: number | undefined, now = new Date()): Date {
  const wanted =
    Number.isFinite(minutes) && minutes! > 0
      ? Math.floor(minutes!)
      : LEASE_MINUTES;

  return new Date(now.getTime() + Math.min(wanted, MAX_LEASE_MINUTES) * 60_000);
}

export type ClaimDecision =
  { ok: true; takeOver: boolean } | { ok: false; reason: "held" | "limit" };

/**
 * Can `agentUserId` take this issue? Yes when nobody holds it, the previous claim ended or ran out,
 * or the agent already holds it (renewing). No while another agent's lease is live, and no once the
 * agent is already working on its maximum number of issues.
 */
export function decideClaim(
  existing: ClaimRow | null,
  agentUserId: string,
  activeForAgent: number,
  now = new Date(),
): ClaimDecision {
  if (existing) {
    const state = effectiveState(existing, now);

    if (state === "active" && existing.agentUserId !== agentUserId) {
      return { ok: false, reason: "held" };
    }
    if (state === "active") return { ok: true, takeOver: false };
  }
  if (activeForAgent >= MAX_CLAIMS_PER_AGENT)
    return { ok: false, reason: "limit" };

  return { ok: true, takeOver: Boolean(existing) };
}

/** Only the agent holding a live lease may heartbeat, report or release. */
export function canAct(
  claim: ClaimRow | null,
  agentUserId: string,
  now = new Date(),
): boolean {
  return Boolean(
    claim &&
    claim.agentUserId === agentUserId &&
    effectiveState(claim, now) === "active",
  );
}

export function cleanNote(value: unknown): string {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .trim()
        .slice(0, MAX_NOTE)
    : "";
}

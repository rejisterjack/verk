/** Pure helpers for outbox ordering, tmp remap, and conflict reduction (unit-tested). */

export type OutboxLike = {
  id?: number;
  issueId: string;
  createdAt: number;
  status: "queued" | "inflight" | "failed";
};

/** Global FIFO; within the same issueId preserve causality. */
export function orderOutboxOps<T extends OutboxLike>(ops: T[]): T[] {
  return ops.slice().sort((a, b) => {
    if (a.issueId === b.issueId) return a.createdAt - b.createdAt;

    return a.createdAt - b.createdAt;
  });
}

/** After create ack, rewrite later outbox rows from tmp id → server id. */
export function remapOutboxIssueIds<T extends { issueId: string }>(
  ops: T[],
  tmpId: string,
  serverId: string,
): T[] {
  return ops.map((op) =>
    op.issueId === tmpId ? { ...op, issueId: serverId } : op,
  );
}

export type ConflictDecision = "keep_server" | "keep_mine";

export function reduceConflict(
  server: { title: string; description: string; revision: number },
  local: { title: string; description: string },
  decision: ConflictDecision,
): {
  title: string;
  description: string;
  revision: number;
  dropLocal: boolean;
} {
  if (decision === "keep_server") {
    return {
      title: server.title,
      description: server.description,
      revision: server.revision,
      dropLocal: true,
    };
  }

  return {
    title: local.title,
    description: local.description,
    revision: server.revision,
    dropLocal: false,
  };
}

export function shouldBlockIssueChain(
  op: { status: string; attempts: number },
  maxAttempts = 10,
): boolean {
  return op.status === "failed" && op.attempts >= maxAttempts;
}

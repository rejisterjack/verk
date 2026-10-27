import { getOfflineDb, type OutboxOp } from "@/lib/offline/db";
import { isOfflineEnabled } from "@/lib/offline/feature";
import {
  applyServerAck,
  markConflict,
  type ServerIssue,
} from "@/lib/offline/issue-repository";

export type SyncState = {
  queued: number;
  inflight: number;
  failed: number;
  sessionExpired: boolean;
};

type SyncListener = (state: SyncState) => void;

const listeners = new Set<SyncListener>();
let sessionExpired = false;
let flushing = false;
let started = false;

const BACKOFF_MS = [1000, 5000, 30000, 120000];
const MAX_ATTEMPTS = 10;

function emptyState(): SyncState {
  return { queued: 0, inflight: 0, failed: 0, sessionExpired };
}

export function getSyncState(): SyncState {
  return emptyState();
}

export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  void refreshState().then(listener);

  return () => listeners.delete(listener);
}

async function refreshState(): Promise<SyncState> {
  if (typeof window === "undefined" || !isOfflineEnabled()) {
    return emptyState();
  }
  try {
    const db = getOfflineDb();
    const ops = await db.outbox.toArray();
    const state: SyncState = {
      queued: ops.filter((o) => o.status === "queued").length,
      inflight: ops.filter((o) => o.status === "inflight").length,
      failed: ops.filter((o) => o.status === "failed").length,
      sessionExpired,
    };

    for (const listener of listeners) listener(state);

    return state;
  } catch {
    return emptyState();
  }
}

export function markSessionExpired(value: boolean) {
  sessionExpired = value;
  void refreshState();
}

export async function requestBackgroundSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const syncManager = (
      reg as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }
    ).sync;

    if (syncManager?.register) {
      await syncManager.register("verk-outbox");
    }
  } catch {
    // Feature not available — online event + interval cover this
  }
}

async function withOutboxLock<T>(fn: () => Promise<T>): Promise<T | undefined> {
  if (typeof navigator === "undefined" || !navigator.locks?.request) {
    return fn();
  }

  return navigator.locks.request(
    "verk-outbox",
    { ifAvailable: true },
    async (lock) => {
      if (!lock) return undefined;

      return fn();
    },
  );
}

function channelBroadcast(msg: unknown) {
  try {
    const bc = new BroadcastChannel("verk-sync");

    bc.postMessage(msg);
    bc.close();
  } catch {
    // ignore
  }
}

export function startSyncEngine() {
  if (typeof window === "undefined" || !isOfflineEnabled() || started) return;
  started = true;

  window.addEventListener("online", () => {
    markSessionExpired(false);
    void flushOutbox();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      void flushOutbox();
    }
  });

  try {
    const bc = new BroadcastChannel("verk-sync");

    bc.onmessage = (event) => {
      if (event.data?.type === "flush") void flushOutbox();
      if (event.data?.type === "state") void refreshState();
    };
  } catch {
    // ignore
  }

  window.setInterval(() => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      void flushOutbox();
    }
  }, 60_000);

  void flushOutbox();
}

export async function flushOutbox(): Promise<void> {
  if (!isOfflineEnabled() || typeof window === "undefined") return;
  if (!navigator.onLine || sessionExpired) return;
  if (flushing) return;

  await withOutboxLock(async () => {
    if (flushing) return;
    flushing = true;
    try {
      await processQueue();
    } finally {
      flushing = false;
      await refreshState();
      channelBroadcast({ type: "state" });
    }
  });
}

async function processQueue() {
  const db = getOfflineDb();
  const ops = (await db.outbox.orderBy("createdAt").toArray()).filter(
    (o) => o.status === "queued" || o.status === "failed",
  );

  // Group by issueId; process FIFO globally but skip blocked chains
  const blockedIssues = new Set<string>();
  const byIssue = new Map<string, OutboxOp[]>();

  for (const op of ops) {
    const list = byIssue.get(op.issueId) ?? [];

    list.push(op);
    byIssue.set(op.issueId, list);
  }

  const ordered = ops.slice().sort((a, b) => a.createdAt - b.createdAt);

  for (const op of ordered) {
    if (blockedIssues.has(op.issueId)) continue;
    if (op.status === "failed" && op.attempts >= MAX_ATTEMPTS) {
      blockedIssues.add(op.issueId);
      continue;
    }

    const result = await flushOne(op);

    if (result === "block") blockedIssues.add(op.issueId);
  }
}

type FlushResult = "ok" | "block" | "retry";

async function flushOne(op: OutboxOp): Promise<FlushResult> {
  const db = getOfflineDb();

  if (op.id == null) return "block";
  await db.outbox.update(op.id, { status: "inflight" });
  await refreshState();

  try {
    const res = await executeOp(op);

    if (res.status === 401) {
      markSessionExpired(true);
      await db.outbox.update(op.id, { status: "queued" });

      return "block";
    }

    if (res.status === 409) {
      const body = (await res.json().catch(() => null)) as {
        issue?: ServerIssue;
      } | null;

      if (body?.issue) {
        await markConflict(op.issueId, body.issue, op.teamId);
      }
      await db.outbox.update(op.id, {
        status: "failed",
        lastError: "conflict",
        attempts: op.attempts + 1,
      });
      // eslint-disable-next-line no-console -- gated sync telemetry
      console.info("sync_conflict", { op: op.op, issueId: op.issueId });

      return "block";
    }

    if (!res.ok) {
      const attempts = op.attempts + 1;
      const failed = attempts >= MAX_ATTEMPTS;

      await db.outbox.update(op.id, {
        status: failed ? "failed" : "queued",
        attempts,
        lastError: `HTTP ${res.status}`,
      });
      if (failed) {
        // eslint-disable-next-line no-console -- gated sync telemetry
        console.info("sync_failed", { op: op.op, issueId: op.issueId });

        return "block";
      }
      const delay = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)];

      await sleep(delay);

      return "retry";
    }

    if (op.op === "create") {
      const issue = (await res.json()) as ServerIssue;

      await applyServerAck(op.issueId, issue, op.teamId);
    } else if (op.op === "delete") {
      await db.issues.delete(op.issueId);
    } else if (res.status !== 204) {
      const issue = (await res.json()) as ServerIssue;
      const local = await db.issues.get(op.issueId);

      if (local) {
        await db.issues.put({
          ...local,
          ...issue,
          number: issue.number,
          revision: issue.revision ?? local.revision + 1,
          updatedAt: issue.updatedAt ?? new Date().toISOString(),
          syncStatus: "synced",
          teamId: op.teamId,
        });
      }
    }

    await db.outbox.delete(op.id);
    // eslint-disable-next-line no-console -- gated sync telemetry
    console.info("sync_flush_ok", { op: op.op, issueId: op.issueId });

    return "ok";
  } catch (error) {
    const attempts = op.attempts + 1;

    await db.outbox.update(op.id, {
      status: attempts >= MAX_ATTEMPTS ? "failed" : "queued",
      attempts,
      lastError: error instanceof Error ? error.message : "network",
    });

    return attempts >= MAX_ATTEMPTS ? "block" : "retry";
  }
}

async function executeOp(op: OutboxOp): Promise<Response> {
  const base = `/api/teams/${op.teamId}/issues`;

  if (op.op === "create") {
    return fetch(base, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...op.payload,
        clientMutationId: op.clientMutationId,
      }),
    });
  }

  if (op.op === "delete") {
    return fetch(`${base}/${op.issueId}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(op.baseRevision != null
          ? { "If-Match": `"${op.baseRevision}"` }
          : {}),
      },
      body: JSON.stringify({
        revision: op.baseRevision,
        clientMutationId: op.clientMutationId,
      }),
    });
  }

  // update | reorder
  return fetch(`${base}/${op.issueId}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(op.baseRevision != null
        ? { "If-Match": `"${op.baseRevision}"` }
        : {}),
    },
    body: JSON.stringify({
      ...op.payload,
      revision: op.baseRevision,
      clientMutationId: op.clientMutationId,
      ...(op.op === "reorder"
        ? { status: op.payload.status, order: op.payload.order }
        : {}),
    }),
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

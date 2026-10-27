import {
  getOfflineDb,
  ISSUES_CACHE_CAP,
  lastSyncKey,
  type LocalIssue,
  type OutboxOp,
} from "@/lib/offline/db";
import { isOfflineEnabled } from "@/lib/offline/feature";
import {
  isTmpIssueId,
  newClientMutationId,
  newTmpIssueId,
} from "@/lib/offline/ids";

export type ServerIssue = {
  id: string;
  teamId?: string;
  number: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  order: number;
  assigneeId?: string | null;
  cycleId?: string | null;
  creatorId?: string;
  revision?: number;
  updatedAt?: string;
  createdAt?: string;
  assignee?: LocalIssue["assignee"];
};

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeIssues(listener: Listener): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) listener();
}

function toLocal(
  issue: ServerIssue,
  teamId: string,
  syncStatus: LocalIssue["syncStatus"] = "synced",
): LocalIssue {
  return {
    id: issue.id,
    teamId,
    number: issue.number ?? null,
    title: issue.title,
    description: issue.description ?? "",
    status: issue.status,
    priority: issue.priority,
    order: issue.order,
    assigneeId: issue.assigneeId ?? null,
    cycleId: issue.cycleId ?? null,
    creatorId: issue.creatorId ?? "",
    revision: issue.revision ?? 0,
    updatedAt: issue.updatedAt ?? new Date().toISOString(),
    createdAt: issue.createdAt ?? new Date().toISOString(),
    syncStatus,
    assignee: issue.assignee ?? null,
  };
}

async function enqueue(op: Omit<OutboxOp, "id">) {
  const db = getOfflineDb();

  await db.outbox.add(op);
  notify();
  const { flushOutbox, requestBackgroundSync } =
    await import("@/lib/offline/sync-engine");

  await requestBackgroundSync();
  if (typeof navigator !== "undefined" && navigator.onLine) {
    void flushOutbox();
  }
}

async function evictOldest(teamId: string) {
  const db = getOfflineDb();
  const count = await db.issues.where("teamId").equals(teamId).count();

  if (count <= ISSUES_CACHE_CAP) return;

  const excess = count - ISSUES_CACHE_CAP;
  const oldest = await db.issues
    .where("teamId")
    .equals(teamId)
    .sortBy("updatedAt");

  const toDelete = oldest
    .filter((i) => i.syncStatus === "synced")
    .slice(0, excess)
    .map((i) => i.id);

  if (toDelete.length) await db.issues.bulkDelete(toDelete);
}

export async function upsertTeam(team: {
  id: string;
  slug: string;
  name: string;
}) {
  if (!isOfflineEnabled() || typeof window === "undefined") return;
  await getOfflineDb().teams.put(team);
}

export async function hydrateIssuesFromServer(
  teamId: string,
  issues: ServerIssue[],
) {
  if (!isOfflineEnabled() || typeof window === "undefined") return;

  const db = getOfflineDb();
  const pendingIds = new Set(
    (
      await db.issues
        .where("teamId")
        .equals(teamId)
        .filter(
          (i) => i.syncStatus === "pending" || i.syncStatus === "conflict",
        )
        .toArray()
    ).map((i) => i.id),
  );

  const rows = issues
    .filter((i) => !pendingIds.has(i.id))
    .map((i) => toLocal(i, teamId, "synced"));

  await db.transaction("rw", db.issues, db.meta, async () => {
    if (rows.length) await db.issues.bulkPut(rows);
    await db.meta.put({
      key: lastSyncKey(teamId),
      value: new Date().toISOString(),
    });
  });

  await evictOldest(teamId);
  notify();
}

export async function listLocalIssues(
  teamId: string,
  filters?: {
    status?: string | string[];
    priority?: string;
    cycleId?: string;
    search?: string;
  },
): Promise<LocalIssue[]> {
  const db = getOfflineDb();
  let rows = await db.issues.where("teamId").equals(teamId).toArray();

  rows = rows.filter((i) => i.syncStatus !== "tombstone");

  if (filters?.status) {
    const set = new Set(
      Array.isArray(filters.status) ? filters.status : [filters.status],
    );

    rows = rows.filter((i) => set.has(i.status));
  }
  if (filters?.priority) {
    rows = rows.filter((i) => i.priority === filters.priority);
  }
  if (filters?.cycleId) {
    rows = rows.filter((i) => i.cycleId === filters.cycleId);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();

    rows = rows.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
    );
  }

  return rows.sort(
    (a, b) => a.order - b.order || (a.number ?? 0) - (b.number ?? 0),
  );
}

export async function getLocalIssue(
  teamId: string,
  issueIdOrNumber: string | number,
): Promise<LocalIssue | undefined> {
  const db = getOfflineDb();

  if (typeof issueIdOrNumber === "string") {
    const byId = await db.issues.get(issueIdOrNumber);

    if (byId && byId.teamId === teamId) return byId;
  }

  const number =
    typeof issueIdOrNumber === "number"
      ? issueIdOrNumber
      : Number(issueIdOrNumber);

  if (!Number.isFinite(number)) return undefined;

  return db.issues
    .where("teamId")
    .equals(teamId)
    .filter((i) => i.number === number)
    .first();
}

export async function pullDelta(teamId: string, since?: string) {
  if (!isOfflineEnabled() || typeof window === "undefined") return;
  if (!navigator.onLine) return;

  const db = getOfflineDb();
  const meta = since ? since : (await db.meta.get(lastSyncKey(teamId)))?.value;

  const url = meta
    ? `/api/teams/${teamId}/issues/sync?since=${encodeURIComponent(meta)}`
    : `/api/teams/${teamId}/issues?take=100`;

  const res = await fetch(url, { credentials: "same-origin" });

  if (res.status === 401) {
    const { markSessionExpired } = await import("@/lib/offline/sync-engine");

    markSessionExpired(true);

    return;
  }
  if (!res.ok) return;

  const data = await res.json();

  if (Array.isArray(data.issues)) {
    await hydrateIssuesFromServer(teamId, data.issues);
  }
  if (Array.isArray(data.deletedIds) && data.deletedIds.length) {
    await db.issues.bulkDelete(data.deletedIds);
    notify();
  }

  // Paginate initial full sync
  if (!meta && data.nextCursor) {
    let cursor = data.nextCursor as string | undefined;

    while (cursor) {
      const page = await fetch(
        `/api/teams/${teamId}/issues?take=100&cursor=${cursor}`,
        { credentials: "same-origin" },
      );

      if (!page.ok) break;
      const body = await page.json();

      await hydrateIssuesFromServer(teamId, body.issues ?? []);
      cursor = body.nextCursor;
    }
  }
}

export async function createIssueLocal(
  teamId: string,
  input: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    cycleId?: string | null;
    creatorId?: string;
  },
): Promise<LocalIssue> {
  const db = getOfflineDb();
  const id = newTmpIssueId();
  const now = new Date().toISOString();
  const clientMutationId = newClientMutationId();
  const local: LocalIssue = {
    id,
    teamId,
    number: null,
    title: input.title,
    description: input.description ?? "",
    status: input.status ?? "BACKLOG",
    priority: input.priority ?? "NONE",
    order: Date.now(),
    assigneeId: input.assigneeId ?? null,
    cycleId: input.cycleId ?? null,
    creatorId: input.creatorId ?? "",
    revision: 0,
    updatedAt: now,
    createdAt: now,
    syncStatus: "pending",
  };

  await db.issues.put(local);
  await enqueue({
    teamId,
    op: "create",
    issueId: id,
    payload: {
      title: local.title,
      description: local.description,
      status: local.status,
      priority: local.priority,
      assigneeId: local.assigneeId,
      cycleId: local.cycleId,
      clientMutationId,
    },
    createdAt: Date.now(),
    status: "queued",
    attempts: 0,
    clientMutationId,
  });

  return local;
}

export async function updateIssueLocal(
  teamId: string,
  issueId: string,
  patch: Partial<
    Pick<
      LocalIssue,
      | "title"
      | "description"
      | "status"
      | "priority"
      | "assigneeId"
      | "cycleId"
      | "order"
    >
  >,
): Promise<LocalIssue | undefined> {
  const db = getOfflineDb();
  const existing = await db.issues.get(issueId);

  if (!existing || existing.teamId !== teamId) return undefined;

  const next: LocalIssue = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  };

  await db.issues.put(next);
  await enqueue({
    teamId,
    op: "update",
    issueId,
    payload: { ...patch },
    baseRevision: existing.revision,
    createdAt: Date.now(),
    status: "queued",
    attempts: 0,
    clientMutationId: newClientMutationId(),
  });

  return next;
}

export async function reorderIssueLocal(
  teamId: string,
  issueId: string,
  status: string,
  order: number,
): Promise<LocalIssue | undefined> {
  const db = getOfflineDb();
  const existing = await db.issues.get(issueId);

  if (!existing || existing.teamId !== teamId) return undefined;

  const next: LocalIssue = {
    ...existing,
    status,
    order,
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  };

  await db.issues.put(next);
  await enqueue({
    teamId,
    op: "reorder",
    issueId,
    payload: { status, order },
    baseRevision: existing.revision,
    createdAt: Date.now(),
    status: "queued",
    attempts: 0,
    clientMutationId: newClientMutationId(),
  });

  return next;
}

export async function deleteIssueLocal(
  teamId: string,
  issueId: string,
): Promise<void> {
  const db = getOfflineDb();
  const existing = await db.issues.get(issueId);

  if (!existing || existing.teamId !== teamId) return;

  if (isTmpIssueId(issueId)) {
    await db.issues.delete(issueId);
    await db.outbox.where("issueId").equals(issueId).delete();
    notify();

    return;
  }

  await db.issues.put({
    ...existing,
    syncStatus: "tombstone",
    updatedAt: new Date().toISOString(),
  });
  await enqueue({
    teamId,
    op: "delete",
    issueId,
    payload: {},
    baseRevision: existing.revision,
    createdAt: Date.now(),
    status: "queued",
    attempts: 0,
    clientMutationId: newClientMutationId(),
  });
}

export async function applyServerAck(
  tmpId: string,
  serverIssue: ServerIssue,
  teamId: string,
) {
  const db = getOfflineDb();

  await db.transaction("rw", db.issues, db.outbox, async () => {
    await db.issues.delete(tmpId);
    await db.issues.put(toLocal(serverIssue, teamId, "synced"));
    const pending = await db.outbox.where("issueId").equals(tmpId).toArray();

    for (const op of pending) {
      await db.outbox.update(op.id!, { issueId: serverIssue.id });
    }
  });
  notify();
}

export async function markConflict(
  issueId: string,
  serverIssue: ServerIssue,
  teamId: string,
) {
  const db = getOfflineDb();
  const local = await db.issues.get(issueId);

  await db.issues.put({
    ...toLocal(serverIssue, teamId, "conflict"),
    conflictLocal: local
      ? {
          title: local.title,
          description: local.description,
          status: local.status,
          priority: local.priority,
        }
      : null,
  });
  notify();
}

export async function resolveConflictKeepServer(issueId: string) {
  const db = getOfflineDb();
  const issue = await db.issues.get(issueId);

  if (!issue) return;
  await db.issues.put({
    ...issue,
    syncStatus: "synced",
    conflictLocal: null,
  });
  await db.outbox
    .where("issueId")
    .equals(issueId)
    .filter((o) => o.status === "failed" || o.status === "queued")
    .delete();
  notify();
}

export async function resolveConflictKeepMine(
  teamId: string,
  issueId: string,
  patch: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
  },
) {
  const db = getOfflineDb();
  const issue = await db.issues.get(issueId);

  if (!issue) return;
  await db.issues.put({
    ...issue,
    ...patch,
    syncStatus: "pending",
    conflictLocal: null,
  });
  await db.outbox.where("issueId").equals(issueId).delete();
  await enqueue({
    teamId,
    op: "update",
    issueId,
    payload: { ...patch },
    baseRevision: issue.revision,
    createdAt: Date.now(),
    status: "queued",
    attempts: 0,
    clientMutationId: newClientMutationId(),
  });
}

export { isTmpIssueId };

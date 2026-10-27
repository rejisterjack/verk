import Dexie, { type EntityTable } from "dexie";

export type SyncStatus = "synced" | "pending" | "conflict" | "tombstone";

export type LocalIssue = {
  id: string;
  teamId: string;
  number: number | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  order: number;
  assigneeId: string | null;
  cycleId: string | null;
  creatorId: string;
  revision: number;
  updatedAt: string;
  createdAt: string;
  syncStatus: SyncStatus;
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  /** Local fields parked during conflict for UI diff */
  conflictLocal?: Partial<LocalIssue> | null;
};

export type OutboxOpType = "create" | "update" | "reorder" | "delete";

export type OutboxStatus = "queued" | "inflight" | "failed";

export type OutboxOp = {
  id?: number;
  teamId: string;
  op: OutboxOpType;
  issueId: string;
  payload: Record<string, unknown>;
  baseRevision?: number;
  createdAt: number;
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
  clientMutationId: string;
};

export type LocalTeam = {
  id: string;
  slug: string;
  name: string;
};

export type MetaRow = {
  key: string;
  value: string;
};

class VerkOfflineDB extends Dexie {
  teams!: EntityTable<LocalTeam, "id">;
  issues!: EntityTable<LocalIssue, "id">;
  outbox!: EntityTable<OutboxOp, "id">;
  meta!: EntityTable<MetaRow, "key">;

  constructor() {
    super("verk-offline");
    this.version(1).stores({
      teams: "id, slug",
      issues: "id, teamId, number, [teamId+status], updatedAt, syncStatus",
      outbox: "++id, teamId, createdAt, status, issueId",
      meta: "key",
    });
  }
}

let dbInstance: VerkOfflineDB | null = null;

export function getOfflineDb(): VerkOfflineDB {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbInstance) {
    dbInstance = new VerkOfflineDB();
  }

  return dbInstance;
}

export const ISSUES_CACHE_CAP = 500;

export function lastSyncKey(teamId: string) {
  return `lastSyncAt:${teamId}`;
}

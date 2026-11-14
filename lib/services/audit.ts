import type { Prisma } from "@/lib/generated/prisma/client";

import { AUDIT_ACTIONS } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/export";
import { retentionCutoff } from "@/lib/privacy";

export const AUDIT_PAGE_SIZE = 50;

export type AuditQuery = {
  action?: string;
  actorId?: string;
  /** ISO day, inclusive. */
  from?: string;
  to?: string;
  /** Opaque cursor: the id of the last row of the previous page. */
  cursor?: string;
  take?: number;
};

function day(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
  );

  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Newest first. Admins only: the caller enforces the role. */
export async function listAuditLog(teamId: string, query: AuditQuery = {}) {
  const take = Math.min(200, Math.max(1, query.take ?? AUDIT_PAGE_SIZE));
  const from = day(query.from, false);
  const to = day(query.to, true);
  const where: Prisma.AuditLogWhereInput = {
    teamId,
    ...(query.action && query.action in AUDIT_ACTIONS
      ? { action: query.action }
      : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > take;

  return {
    entries: rows.slice(0, take),
    nextCursor: hasMore ? rows[take - 1]!.id : undefined,
  };
}

/**
 * Keep the log bounded. Every team has its own retention (default one year, 0 = forever), so each
 * team is pruned to its own cutoff.
 */
export async function pruneAuditLog(): Promise<number> {
  const teams = await prisma.team.findMany({
    select: { id: true, auditRetentionDays: true },
  });
  let removed = 0;

  for (const team of teams) {
    const cutoff = retentionCutoff(team.auditRetentionDays);

    if (!cutoff) continue;
    const result = await prisma.auditLog.deleteMany({
      where: { teamId: team.id, createdAt: { lt: cutoff } },
    });

    removed += result.count;
  }

  return removed;
}

export const AUDIT_EXPORT_CAP = 50_000;

/** The whole log (newest first, capped) as CSV for an auditor. Admins only: the caller enforces it. */
export async function exportAuditCsv(teamId: string): Promise<string> {
  const rows = await prisma.auditLog.findMany({
    where: { teamId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: AUDIT_EXPORT_CAP,
  });
  const columns = [
    "time",
    "actor",
    "action",
    "description",
    "targetType",
    "targetId",
    "summary",
    "details",
  ] as const;

  return toCsv(
    rows.map((row) => ({
      time: row.createdAt.toISOString(),
      actor: row.actorLabel,
      action: row.action,
      description:
        AUDIT_ACTIONS[row.action as keyof typeof AUDIT_ACTIONS] ?? "",
      targetType: row.targetType,
      targetId: row.targetId ?? "",
      summary: row.summary,
      details: row.metadata ? JSON.stringify(row.metadata) : "",
    })),
    [...columns],
  );
}

import type {
  IssueStatus,
  Role,
  WorkflowStatusType,
} from "@/lib/generated/prisma/client";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { assertRole } from "@/lib/rbac";
import {
  defaultForType,
  deletionBlocker,
  isValidColor,
  MAX_WORKFLOW_STATUSES,
  nameTaken,
  slugifyKey,
  STATUS_TO_TYPE,
  type StatusRow,
  TYPE_TO_STATUS,
  uniqueKey,
  WORKFLOW_TYPES,
} from "@/lib/workflow";

const DEFAULTS = [
  { key: "backlog", name: "Backlog", type: "backlog", color: "#94a3b8" },
  { key: "todo", name: "Todo", type: "unstarted", color: "#64748b" },
  {
    key: "in_progress",
    name: "In Progress",
    type: "started",
    color: "#f59e0b",
  },
  { key: "done", name: "Done", type: "completed", color: "#22c55e" },
  { key: "canceled", name: "Canceled", type: "canceled", color: "#ef4444" },
] as const satisfies readonly {
  key: string;
  name: string;
  type: WorkflowStatusType;
  color: string;
}[];

/** All of a team's statuses in board order. Seeds the five defaults for a brand-new team. */
export async function getWorkflow(teamId: string) {
  let rows = await prisma.workflowStatus.findMany({
    where: { teamId },
    orderBy: { position: "asc" },
  });

  if (rows.length === 0) {
    await prisma.workflowStatus.createMany({
      data: DEFAULTS.map((d, position) => ({ ...d, teamId, position })),
      skipDuplicates: true,
    });
    rows = await prisma.workflowStatus.findMany({
      where: { teamId },
      orderBy: { position: "asc" },
    });
  }

  return rows;
}

/**
 * The workflow status an issue should carry, and the coarse `IssueStatus` that goes with it.
 * Give a `workflowStatusId` (checked against the team) or just an `IssueStatus` (mapped to the
 * first status of that type). The two always agree, so an issue can never be half-updated.
 */
export async function resolveStatus(
  teamId: string,
  input: { workflowStatusId?: string | null; status?: IssueStatus | null },
): Promise<{ workflowStatusId: string; status: IssueStatus } | null> {
  if (!input.workflowStatusId && !input.status) return null;
  const rows = await getWorkflow(teamId);

  if (input.workflowStatusId) {
    const hit = rows.find((row) => row.id === input.workflowStatusId);

    if (!hit) {
      throw new AuthError("Unknown status for this team", "BAD_REQUEST", 400);
    }

    return { workflowStatusId: hit.id, status: TYPE_TO_STATUS[hit.type] };
  }
  const type = STATUS_TO_TYPE[input.status!];
  const fallback = defaultForType(rows, type);

  if (!fallback) {
    throw new AuthError(`This team has no ${type} status`, "BAD_REQUEST", 400);
  }

  return { workflowStatusId: fallback.id, status: input.status! };
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  type: z.enum(WORKFLOW_TYPES),
  color: z.string().optional(),
  key: z.string().trim().max(40).optional(),
});

export async function createWorkflowStatus(
  teamId: string,
  input: unknown,
  role: Role,
) {
  assertRole(role, "ADMIN");
  const data = createSchema.parse(input);
  const rows = await getWorkflow(teamId);

  if (rows.length >= MAX_WORKFLOW_STATUSES) {
    throw new AuthError(
      `A team can have at most ${MAX_WORKFLOW_STATUSES} statuses`,
      "BAD_REQUEST",
      400,
    );
  }
  if (nameTaken(rows, data.name)) {
    throw new AuthError(
      "A status with that name already exists",
      "BAD_REQUEST",
      400,
    );
  }
  if (data.color !== undefined && !isValidColor(data.color)) {
    throw new AuthError("Color must look like #1a2b3c", "BAD_REQUEST", 400);
  }
  const key = uniqueKey(
    /^[a-z0-9_]+$/.test(data.key ?? "") ? data.key! : slugifyKey(data.name),
    rows.map((row) => row.key),
  );
  // A new status goes at the end of its own type, so the board stays grouped by type.
  const lastOfType = rows
    .filter((row) => row.type === data.type)
    .reduce((max, row) => Math.max(max, row.position), -1);
  const position = lastOfType >= 0 ? lastOfType + 1 : rows.length;

  return prisma.$transaction(async (tx) => {
    // Make room so positions stay unique and dense.
    await tx.workflowStatus.updateMany({
      where: { teamId, position: { gte: position } },
      data: { position: { increment: 1 } },
    });

    return tx.workflowStatus.create({
      data: {
        teamId,
        key,
        name: data.name,
        type: data.type,
        color: data.color ?? "#94a3b8",
        position,
      },
    });
  });
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  color: z.string().optional(),
});

/** Rename or recolor. The type cannot change, because issues in it would change meaning. */
export async function updateWorkflowStatus(
  teamId: string,
  statusId: string,
  input: unknown,
  role: Role,
) {
  assertRole(role, "ADMIN");
  const data = updateSchema.parse(input);
  const rows = await getWorkflow(teamId);
  const existing = rows.find((row) => row.id === statusId);

  if (!existing) throw new AuthError("Status not found", "NOT_FOUND", 404);
  if (data.name !== undefined && nameTaken(rows, data.name, statusId)) {
    throw new AuthError(
      "A status with that name already exists",
      "BAD_REQUEST",
      400,
    );
  }
  if (data.color !== undefined && !isValidColor(data.color)) {
    throw new AuthError("Color must look like #1a2b3c", "BAD_REQUEST", 400);
  }

  return prisma.workflowStatus.update({
    where: { id: statusId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
    },
  });
}

/**
 * Put the statuses in the given order. Ids must be exactly the team's statuses. Statuses are
 * kept grouped by type (backlog, unstarted, started, completed, canceled), because that is
 * the order a board reads in; a drag across types is rejected.
 */
export async function reorderWorkflow(
  teamId: string,
  orderedIds: string[],
  role: Role,
) {
  assertRole(role, "ADMIN");
  const rows = await getWorkflow(teamId);
  const byId = new Map(rows.map((row) => [row.id, row]));

  if (
    orderedIds.length !== rows.length ||
    new Set(orderedIds).size !== rows.length ||
    orderedIds.some((id) => !byId.has(id))
  ) {
    throw new AuthError(
      "Order must list every status once",
      "BAD_REQUEST",
      400,
    );
  }
  const rank = (id: string) => WORKFLOW_TYPES.indexOf(byId.get(id)!.type);

  for (let i = 1; i < orderedIds.length; i += 1) {
    if (rank(orderedIds[i]!) < rank(orderedIds[i - 1]!)) {
      throw new AuthError(
        "Statuses stay grouped by type: backlog, unstarted, started, completed, canceled",
        "BAD_REQUEST",
        400,
      );
    }
  }
  await prisma.$transaction(
    orderedIds.map((id, position) =>
      prisma.workflowStatus.update({ where: { id }, data: { position } }),
    ),
  );
}

/**
 * Delete a status, moving its issues to `moveToId`. The target must be of the same type, so
 * deleting never changes what "done" or "started" means for an issue.
 */
export async function deleteWorkflowStatus(
  teamId: string,
  statusId: string,
  moveToId: string | null,
  role: Role,
) {
  assertRole(role, "ADMIN");
  const rows = await getWorkflow(teamId);
  const blocker = deletionBlocker(rows as StatusRow[], statusId);

  if (blocker) throw new AuthError(blocker, "BAD_REQUEST", 400);
  const target = rows.find((row) => row.id === statusId)!;
  const candidates = rows.filter(
    (row) => row.id !== statusId && row.type === target.type,
  );
  const destination = moveToId
    ? candidates.find((row) => row.id === moveToId)
    : candidates[0];

  if (!destination) {
    throw new AuthError(
      "Move its issues to another status of the same type",
      "BAD_REQUEST",
      400,
    );
  }

  const moved = await prisma.$transaction(async (tx) => {
    const result = await tx.issue.updateMany({
      where: { teamId, workflowStatusId: statusId },
      data: {
        workflowStatusId: destination.id,
        status: TYPE_TO_STATUS[destination.type],
        revision: { increment: 1 },
      },
    });

    await tx.workflowStatus.delete({ where: { id: statusId } });
    // Close the gap so positions stay dense.
    await tx.workflowStatus.updateMany({
      where: { teamId, position: { gt: target.position } },
      data: { position: { decrement: 1 } },
    });

    return result.count;
  });

  return { moved, movedTo: destination.id };
}

/** How many issues sit in each status, for the settings page. */
export async function statusIssueCounts(teamId: string) {
  const groups = await prisma.issue.groupBy({
    by: ["workflowStatusId"],
    where: { teamId, archivedAt: null },
    _count: { _all: true },
  });

  return new Map(
    groups.flatMap((group) =>
      group.workflowStatusId
        ? [[group.workflowStatusId, group._count._all] as const]
        : [],
    ),
  );
}

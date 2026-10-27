import {
  IssueStatus,
  Prisma,
  Priority,
  Role,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AuthError, ConflictError } from "@/lib/errors";
import { assertRole } from "@/lib/rbac";
import {
  createIssueSchema,
  listIssuesQuerySchema,
  reorderIssueSchema,
  updateIssueSchema,
} from "@/lib/validators";

const issueInclude = {
  assignee: { select: { id: true, name: true, email: true, image: true } },
  cycle: { select: { id: true, name: true, isActive: true } },
  creator: { select: { id: true, name: true, email: true } },
} as const;

function parseRevision(
  input: unknown,
  header?: string | null,
): number | undefined {
  if (typeof input === "object" && input && "revision" in input) {
    const rev = (input as { revision?: unknown }).revision;

    if (typeof rev === "number" && Number.isFinite(rev)) return rev;
  }
  if (header) {
    const m = header.match(/"?(\d+)"?/);

    if (m) return Number(m[1]);
  }

  return undefined;
}

export async function listIssues(teamId: string, query: unknown) {
  const q = listIssuesQuerySchema.parse(query);
  const where: Prisma.IssueWhereInput = { teamId };

  if (q.status) {
    where.status = Array.isArray(q.status) ? { in: q.status } : q.status;
  }
  if (q.priority) where.priority = q.priority;
  if (q.cycleId) where.cycleId = q.cycleId;
  if (q.assigneeId) where.assigneeId = q.assigneeId;
  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: "insensitive" } },
      { description: { contains: q.search, mode: "insensitive" } },
    ];
  }

  const issues = await prisma.issue.findMany({
    where,
    include: issueInclude,
    orderBy: [{ order: "asc" }, { number: "desc" }],
    take: q.take + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });

  let nextCursor: string | undefined;

  if (issues.length > q.take) {
    const next = issues.pop();

    nextCursor = next?.id;
  }

  return { issues, nextCursor };
}

export async function syncIssues(teamId: string, sinceIso: string) {
  const since = new Date(sinceIso);

  if (Number.isNaN(since.getTime())) {
    throw new AuthError("Invalid since timestamp", "BAD_REQUEST", 400);
  }

  const [issues, deletions] = await Promise.all([
    prisma.issue.findMany({
      where: { teamId, updatedAt: { gt: since } },
      include: issueInclude,
      orderBy: { updatedAt: "asc" },
      take: 200,
    }),
    prisma.issueDeletion.findMany({
      where: { teamId, deletedAt: { gt: since } },
      select: { issueId: true },
      take: 500,
    }),
  ]);

  return {
    issues,
    deletedIds: deletions.map((d) => d.issueId),
    serverTime: new Date().toISOString(),
  };
}

export async function getIssueByNumber(teamId: string, number: number) {
  return prisma.issue.findUnique({
    where: { teamId_number: { teamId, number } },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      cycle: true,
      creator: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getIssueById(teamId: string, issueId: string) {
  return prisma.issue.findFirst({
    where: { id: issueId, teamId },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      cycle: true,
      creator: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function createIssue(
  teamId: string,
  userId: string,
  input: unknown,
) {
  const raw =
    typeof input === "object" && input
      ? (input as Record<string, unknown>)
      : {};
  const clientMutationId =
    typeof raw.clientMutationId === "string" ? raw.clientMutationId : undefined;

  if (clientMutationId) {
    const receipt = await prisma.mutationReceipt.findUnique({
      where: {
        teamId_clientMutationId: { teamId, clientMutationId },
      },
    });

    if (receipt?.issueId) {
      const existing = await getIssueById(teamId, receipt.issueId);

      if (existing) return existing;
    }
  }

  const data = createIssueSchema.parse(input);

  const issue = await prisma.$transaction(async (tx) => {
    const team = await tx.team.update({
      where: { id: teamId },
      data: { issueCounter: { increment: 1 } },
    });

    const maxOrder = await tx.issue.aggregate({
      where: { teamId, status: data.status ?? "BACKLOG" },
      _max: { order: true },
    });

    const created = await tx.issue.create({
      data: {
        teamId,
        number: team.issueCounter,
        title: data.title,
        description: data.description ?? "",
        status: data.status ?? "BACKLOG",
        priority: data.priority ?? "NONE",
        assigneeId: data.assigneeId ?? null,
        cycleId: data.cycleId ?? null,
        creatorId: userId,
        order: (maxOrder._max.order ?? 0) + 1,
        revision: 0,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        cycle: true,
      },
    });

    if (clientMutationId) {
      await tx.mutationReceipt.create({
        data: {
          teamId,
          clientMutationId,
          issueId: created.id,
        },
      });
    }

    return created;
  });

  return issue;
}

export async function updateIssue(
  teamId: string,
  issueId: string,
  input: unknown,
  role: Role,
  userId: string,
  ifMatch?: string | null,
) {
  const existing = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!existing) {
    throw new AuthError("Issue not found", "NOT_FOUND", 404);
  }
  assertRole(role, "MEMBER");
  void userId;

  const expected = parseRevision(input, ifMatch);
  const parsed = updateIssueSchema.parse(input);
  const {
    revision: ignoredRevision,
    clientMutationId: ignoredMutationId,
    ...data
  } = parsed;

  void ignoredRevision;
  void ignoredMutationId;

  if (expected != null && existing.revision !== expected) {
    const current = await getIssueById(teamId, issueId);

    throw new ConflictError("Issue revision conflict", current);
  }

  const updated = await prisma.issue.updateMany({
    where: {
      id: issueId,
      teamId,
      ...(expected != null ? { revision: expected } : {}),
    },
    data: {
      ...data,
      assigneeId: data.assigneeId === undefined ? undefined : data.assigneeId,
      cycleId: data.cycleId === undefined ? undefined : data.cycleId,
      revision: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    const current = await getIssueById(teamId, issueId);

    throw new ConflictError("Issue revision conflict", current);
  }

  return getIssueById(teamId, issueId);
}

export async function reorderIssue(
  teamId: string,
  input: unknown,
  ifMatch?: string | null,
) {
  const data = reorderIssueSchema.parse(input);
  const existing = await prisma.issue.findFirst({
    where: { id: data.issueId, teamId },
  });

  if (!existing) {
    throw new AuthError("Issue not found", "NOT_FOUND", 404);
  }

  const expected = parseRevision(input, ifMatch);

  if (expected != null && existing.revision !== expected) {
    throw new ConflictError("Issue revision conflict", existing);
  }

  const updated = await prisma.issue.updateMany({
    where: {
      id: data.issueId,
      teamId,
      ...(expected != null ? { revision: expected } : {}),
    },
    data: {
      status: data.status,
      order: data.order,
      revision: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    const current = await getIssueById(teamId, data.issueId);

    throw new ConflictError("Issue revision conflict", current);
  }

  return getIssueById(teamId, data.issueId);
}

export async function deleteIssue(
  teamId: string,
  issueId: string,
  role: Role,
  userId: string,
  input?: unknown,
  ifMatch?: string | null,
) {
  const existing = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!existing) {
    throw new AuthError("Issue not found", "NOT_FOUND", 404);
  }
  if (role !== "ADMIN" && role !== "OWNER" && existing.creatorId !== userId) {
    throw new AuthError(
      "Only admins or the creator can delete issues",
      "FORBIDDEN",
      403,
    );
  }

  const expected = parseRevision(input, ifMatch);

  if (expected != null && existing.revision !== expected) {
    throw new ConflictError("Issue revision conflict", existing);
  }

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.issue.deleteMany({
      where: {
        id: issueId,
        teamId,
        ...(expected != null ? { revision: expected } : {}),
      },
    });

    if (deleted.count === 0) {
      throw new ConflictError("Issue revision conflict", existing);
    }

    await tx.issueDeletion.upsert({
      where: { issueId },
      create: { issueId, teamId },
      update: { deletedAt: new Date(), teamId },
    });
  });
}

export const BOARD_STATUSES: IssueStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "DONE",
];

export async function getBoardIssues(
  teamId: string,
  filters?: {
    cycleId?: string;
    priority?: Priority;
    search?: string;
  },
) {
  const where: Prisma.IssueWhereInput = {
    teamId,
    status: { in: [...BOARD_STATUSES, "CANCELLED"] },
  };

  if (filters?.cycleId) where.cycleId = filters.cycleId;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.issue.findMany({
    where,
    select: {
      id: true,
      number: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      order: true,
      revision: true,
      updatedAt: true,
      assigneeId: true,
      cycleId: true,
      creatorId: true,
      assignee: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: [{ order: "asc" }, { number: "asc" }],
  });
}

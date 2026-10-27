import {
  IssueStatus,
  Prisma,
  Priority,
  Role,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AuthError, assertRole } from "@/lib/rbac";
import {
  createIssueSchema,
  listIssuesQuerySchema,
  reorderIssueSchema,
  updateIssueSchema,
} from "@/lib/validators";

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
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      cycle: { select: { id: true, name: true, isActive: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
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
  const data = createIssueSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const team = await tx.team.update({
      where: { id: teamId },
      data: { issueCounter: { increment: 1 } },
    });

    const maxOrder = await tx.issue.aggregate({
      where: { teamId, status: data.status ?? "BACKLOG" },
      _max: { order: true },
    });

    return tx.issue.create({
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
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        cycle: true,
      },
    });
  });
}

export async function updateIssue(
  teamId: string,
  issueId: string,
  input: unknown,
  role: Role,
  userId: string,
) {
  const existing = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!existing) {
    throw new AuthError("Issue not found", "NOT_FOUND", 404);
  }
  // Members can update any issue fields (Linear-like); delete restricted below
  assertRole(role, "MEMBER");
  void userId;

  const data = updateIssueSchema.parse(input);

  return prisma.issue.update({
    where: { id: issueId },
    data: {
      ...data,
      assigneeId: data.assigneeId === undefined ? undefined : data.assigneeId,
      cycleId: data.cycleId === undefined ? undefined : data.cycleId,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      cycle: true,
    },
  });
}

export async function reorderIssue(teamId: string, input: unknown) {
  const data = reorderIssueSchema.parse(input);
  const existing = await prisma.issue.findFirst({
    where: { id: data.issueId, teamId },
  });

  if (!existing) {
    throw new AuthError("Issue not found", "NOT_FOUND", 404);
  }

  return prisma.issue.update({
    where: { id: data.issueId },
    data: { status: data.status, order: data.order },
  });
}

export async function deleteIssue(
  teamId: string,
  issueId: string,
  role: Role,
  userId: string,
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
  await prisma.issue.delete({ where: { id: issueId } });
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
      status: true,
      priority: true,
      order: true,
      assigneeId: true,
      cycleId: true,
      assignee: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: [{ order: "asc" }, { number: "asc" }],
  });
}

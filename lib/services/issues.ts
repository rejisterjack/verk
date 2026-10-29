import {
  IssueStatus,
  Prisma,
  Priority,
  Role,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { nextTriageAt, snoozeTriage } from "@/lib/triage";
import { WORKFLOW_TYPE_TO_STATUS } from "@/lib/labels";
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
  project: { select: { id: true, name: true, status: true } },
  labels: { include: { label: true } },
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
  if (q.projectId) where.projectId = q.projectId;
  if (q.workflowStatusId) where.workflowStatusId = q.workflowStatusId;
  if (q.number) where.number = q.number;
  if (q.triage) {
    const now = new Date();

    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          {
            status: "BACKLOG",
            assigneeId: null,
            OR: [{ triageAt: null }, { triageAt: { lte: now } }],
          },
          {
            triageAt: { lte: now },
            status: { notIn: ["DONE", "CANCELLED"] },
          },
        ],
      },
    ];
  }
  if (q.search) {
    const digitMatch = /^\d+$/.test(q.search) ? Number(q.search) : null;
    const searchOr: Prisma.IssueWhereInput[] = [
      { title: { contains: q.search, mode: "insensitive" } },
      { description: { contains: q.search, mode: "insensitive" } },
    ];

    if (digitMatch != null && Number.isFinite(digitMatch)) {
      searchOr.push({ number: digitMatch });
    }

    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { OR: searchOr },
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
    include: issueInclude,
  });
}

export async function getIssueById(teamId: string, issueId: string) {
  return prisma.issue.findFirst({
    where: { id: issueId, teamId },
    include: issueInclude,
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
  const { labelIds, clientMutationId: _cm, ...issueData } = data;

  void _cm;

  if (issueData.workflowStatusId) {
    const workflow = await prisma.workflowStatus.findFirst({
      where: { id: issueData.workflowStatusId, teamId },
    });

    if (workflow) {
      issueData.status = WORKFLOW_TYPE_TO_STATUS[workflow.type] ?? "TODO";
    }
  }

  const issue = await prisma.$transaction(async (tx) => {
    const team = await tx.team.update({
      where: { id: teamId },
      data: { issueCounter: { increment: 1 } },
    });

    const maxOrder = await tx.issue.aggregate({
      where: { teamId, status: issueData.status ?? "BACKLOG" },
      _max: { order: true },
    });

    const created = await tx.issue.create({
      data: {
        teamId,
        number: team.issueCounter,
        title: issueData.title,
        description: issueData.description ?? "",
        status: issueData.status ?? "BACKLOG",
        priority: issueData.priority ?? "NONE",
        estimate: issueData.estimate ?? "NONE",
        dueDate: issueData.dueDate ?? null,
        assigneeId: issueData.assigneeId ?? null,
        cycleId: issueData.cycleId ?? null,
        projectId: issueData.projectId ?? null,
        milestoneId: issueData.milestoneId ?? null,
        workflowStatusId: issueData.workflowStatusId ?? null,
        creatorId: userId,
        triageAt: issueData.status === "BACKLOG" ? new Date() : null,
        order: (maxOrder._max.order ?? 0) + 1,
        revision: 0,
        labels: labelIds?.length
          ? { create: labelIds.map((labelId) => ({ labelId })) }
          : undefined,
      },
      include: issueInclude,
    });

    await tx.issueSubscription.create({
      data: { issueId: created.id, userId },
    });

    if (issueData.assigneeId && issueData.assigneeId !== userId) {
      await tx.issueSubscription.upsert({
        where: {
          issueId_userId: {
            issueId: created.id,
            userId: issueData.assigneeId,
          },
        },
        create: { issueId: created.id, userId: issueData.assigneeId },
        update: {},
      });
      await tx.notification.create({
        data: {
          userId: issueData.assigneeId,
          teamId,
          issueId: created.id,
          type: "ASSIGNED",
          title: `Assigned: ${created.title}`,
        },
      });
    }

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

  try {
    const { dispatchWebhooks } = await import("@/lib/services/webhooks");
    const { notifySlack } = await import("@/lib/services/surface");

    await dispatchWebhooks(teamId, "issue.created", issue);
    const team = await prisma.team.findUnique({ where: { id: teamId } });

    if (!issue.assigneeId && team?.triageOwnerId && team.triageOwnerId !== userId) {
      await prisma.notification.create({
        data: {
          userId: team.triageOwnerId,
          teamId,
          issueId: issue.id,
          type: "ASSIGNED",
          title: `Triage: ${issue.title}`,
        },
      });
    }
    await notifySlack(team?.slackWebhookUrl, `Created: ${issue.title}`);
    const { recordActivity } = await import("@/lib/services/surface");

    await recordActivity(issue.id, userId, "created", "", issue.title);
  } catch {
    // non-blocking
  }

  return issue;
}

export async function snoozeIssueTriage(
  teamId: string,
  issueId: string,
  until: Date,
) {
  await snoozeTriage(teamId, issueId, until);

  return getIssueById(teamId, issueId);
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

  if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
    const { ensureSubscribed, notifyIssueSubscribers } =
      await import("@/lib/services/notifications");

    await ensureSubscribed(issueId, data.assigneeId);
    await notifyIssueSubscribers({
      teamId,
      issueId,
      actorId: userId,
      type: "ASSIGNED",
      title: `Assigned: ${existing.title}`,
    });
  }

  const triageAt = nextTriageAt(existing, {
    status: data.status,
    assigneeId: data.assigneeId,
  });

  if (data.workflowStatusId) {
    const workflow = await prisma.workflowStatus.findFirst({
      where: { id: data.workflowStatusId, teamId },
    });

    if (workflow) {
      data.status = WORKFLOW_TYPE_TO_STATUS[workflow.type] ?? data.status;
    }
  }

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
      ...(triageAt !== undefined ? { triageAt } : {}),
      revision: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    const current = await getIssueById(teamId, issueId);

    throw new ConflictError("Issue revision conflict", current);
  }

  const saved = await getIssueById(teamId, issueId);

  if (data.status && data.status !== existing.status && saved) {
    const { notifyIssueSubscribers } = await import(
      "@/lib/services/notifications"
    );

    await notifyIssueSubscribers({
      teamId,
      issueId,
      actorId: userId,
      type: "STATUS_CHANGED",
      title: `Status changed: ${saved.title}`,
    });
  }

  if (saved) {
    const { recordActivity, notifySlack } = await import("@/lib/services/surface");
    const fields = [
      "title",
      "description",
      "status",
      "priority",
      "estimate",
      "dueDate",
      "assigneeId",
      "cycleId",
      "projectId",
    ] as const;

    const asText = (value: unknown) => {
      if (value == null || value === "") return "";
      if (value instanceof Date) return value.toISOString();

      return String(value);
    };

    for (const field of fields) {
      if (data[field] !== undefined && asText(data[field]) !== asText(existing[field])) {
        await recordActivity(
          issueId,
          userId,
          field,
          asText(existing[field]),
          asText(data[field]),
        );
      }
    }
    const team = await prisma.team.findUnique({ where: { id: teamId } });

    if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
      await notifySlack(team?.slackWebhookUrl, `Assigned: ${saved.title}`);
    }
    if (data.status && data.status !== existing.status) {
      await notifySlack(
        team?.slackWebhookUrl,
        `Status ${existing.status} → ${data.status}: ${saved.title}`,
      );
      try {
        const { commentOnLinkedPullRequest } = await import("@/lib/github");

        await commentOnLinkedPullRequest(issueId, String(data.status));
      } catch (error) {
        console.error("GitHub status comment failed", error);
      }
    }
    const { dispatchWebhooks } = await import("@/lib/services/webhooks");

    await dispatchWebhooks(teamId, "issue.updated", saved);
  }

  return saved;
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
      ...(data.workflowStatusId
        ? { workflowStatusId: data.workflowStatusId }
        : {}),
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

  const { dispatchWebhooks } = await import("@/lib/services/webhooks");

  await dispatchWebhooks(teamId, "issue.deleted", { id: issueId });
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
      projectId: true,
      workflowStatusId: true,
      creatorId: true,
      assignee: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: [{ order: "asc" }, { number: "asc" }],
  });
}

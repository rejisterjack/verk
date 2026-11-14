import {
  IssueStatus,
  Prisma,
  Priority,
  Role,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { lifecycleStamps } from "@/lib/cycle-stats";
import { guestIssueScope } from "@/lib/services/guest-scope";
import {
  isAllowedEstimate,
  normalizeScale,
  SCALE_LABELS,
} from "@/lib/estimate-points";
import { resolveStatus } from "@/lib/services/workflow";
import { nextTriageAt, snoozeTriage } from "@/lib/triage";
import { AuthError, ConflictError } from "@/lib/errors";
import { assertRole } from "@/lib/rbac";
import {
  bulkIssuesSchema,
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

/**
 * `opts.userId` is who "me" means inside a `filter`. A `filter` may be a filter tree or a
 * JSON string of one; it is validated here, so callers can pass user input straight in.
 */
export async function listIssues(
  teamId: string,
  query: unknown,
  opts: { userId?: string | null } = {},
) {
  const q = listIssuesQuerySchema.parse(query);
  const where: Prisma.IssueWhereInput = {
    teamId,
    archivedAt: q.archived ? { not: null } : null,
  };
  const guestScope = await guestIssueScope(teamId, opts.userId);

  if (guestScope) where.AND = [guestScope];

  if (q.filter !== undefined && q.filter !== null && q.filter !== "") {
    const { compileFilter, parseFilter } = await import("@/lib/issue-filter");
    const compiled = compileFilter(parseFilter(q.filter), {
      userId: opts.userId,
    });

    if (Object.keys(compiled).length) {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), compiled];
    }
  }

  if (q.status) {
    where.status = Array.isArray(q.status) ? { in: q.status } : q.status;
  }
  if (q.priority) where.priority = q.priority;
  if (q.cycleId) where.cycleId = q.cycleId;
  if (q.assigneeId) where.assigneeId = q.assigneeId;
  if (q.projectId) where.projectId = q.projectId;
  if (q.workflowStatusId) where.workflowStatusId = q.workflowStatusId;
  if (q.labelGroup) {
    where.labels = { some: { label: { group: q.labelGroup } } };
  }
  if (q.number) where.number = q.number;
  if (q.parentId) where.parentId = q.parentId;
  else if (q.topLevel) where.parentId = null;
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

  const [issues, deletions, archived] = await Promise.all([
    prisma.issue.findMany({
      where: { teamId, archivedAt: null, updatedAt: { gt: since } },
      include: issueInclude,
      orderBy: { updatedAt: "asc" },
      take: 200,
    }),
    prisma.issueDeletion.findMany({
      where: { teamId, deletedAt: { gt: since } },
      select: { issueId: true },
      take: 500,
    }),
    // An archived issue leaves the offline cache the same way a deleted one does.
    // Restoring bumps `updatedAt`, so it comes back through `issues` above.
    prisma.issue.findMany({
      where: { teamId, archivedAt: { not: null }, updatedAt: { gt: since } },
      select: { id: true },
      take: 500,
    }),
  ]);

  return {
    issues,
    deletedIds: [
      ...deletions.map((d) => d.issueId),
      ...archived.map((a) => a.id),
    ],
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
  const { labelIds: parsedLabels, clientMutationId: _cm, ...issueData } = data;
  let labelIds = parsedLabels ? [...parsedLabels] : [];

  void _cm;

  // A sub-issue starts from its parent: same project and cycle, and its labels when the
  // team wants that. Anything the caller set explicitly wins.
  if (issueData.parentId) {
    const { assertValidParent } = await import("@/lib/services/sub-issues");

    await assertValidParent(teamId, null, issueData.parentId);
    const [teamRow, parentRow] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        select: { subIssueInherit: true },
      }),
      prisma.issue.findFirst({
        where: { id: issueData.parentId, teamId },
        select: {
          projectId: true,
          cycleId: true,
          milestoneId: true,
          labels: { select: { labelId: true } },
        },
      }),
    ]);

    if (teamRow?.subIssueInherit && parentRow) {
      if (issueData.projectId === undefined) {
        issueData.projectId = parentRow.projectId;
      }
      if (issueData.cycleId === undefined)
        issueData.cycleId = parentRow.cycleId;
      if (issueData.milestoneId === undefined) {
        issueData.milestoneId = parentRow.milestoneId;
      }
      if (parsedLabels === undefined) {
        labelIds = parentRow.labels.map((row) => row.labelId);
      }
    }
  }

  const { matchTriageRule, applyMatchedRule } =
    await import("@/lib/services/triage-rules");
  const rule = await matchTriageRule(teamId, {
    title: issueData.title,
    priority: issueData.priority ?? "NONE",
    labelIds,
  });

  if (rule) {
    const applied = applyMatchedRule(rule, {
      assigneeId: issueData.assigneeId,
      status: issueData.status,
      labelIds,
    });

    issueData.assigneeId = applied.assigneeId;
    if (applied.status) issueData.status = applied.status;
    labelIds = applied.labelIds;
  }

  // An estimate has to be one the team's scale offers (or "no estimate").
  if (issueData.estimate && issueData.estimate !== "NONE") {
    await assertEstimateAllowed(teamId, issueData.estimate);
  }

  // The workflow status is the source of truth; `status` is its type. Resolve both together so
  // a new issue always has a valid pair, whichever one the caller gave.
  const resolved = await resolveStatus(teamId, {
    workflowStatusId: issueData.workflowStatusId,
    status: issueData.status ?? "BACKLOG",
  });

  if (resolved) {
    issueData.status = resolved.status;
    issueData.workflowStatusId = resolved.workflowStatusId;
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
        parentId: issueData.parentId ?? null,
        creatorId: userId,
        // An issue created already started or finished still gets its timestamps.
        ...lifecycleStamps(
          "BACKLOG",
          issueData.status ?? "BACKLOG",
          { startedAt: null, completedAt: null, canceledAt: null },
          new Date(),
        ),
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
      const assigneePrefs = await tx.notificationPreference.findUnique({
        where: { userId: issueData.assigneeId },
        select: { mutedTypes: true },
      });

      if (!assigneePrefs?.mutedTypes.includes("ASSIGNED")) {
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
    const { notifyTeamSlack } = await import("@/lib/services/surface");

    await dispatchWebhooks(teamId, "issue.created", issue);
    const team = await prisma.team.findUnique({ where: { id: teamId } });

    if (
      !issue.assigneeId &&
      team?.triageOwnerId &&
      team.triageOwnerId !== userId
    ) {
      const { filterUnmuted } = await import("@/lib/services/notifications");
      const [owner] = await filterUnmuted([team.triageOwnerId], "ASSIGNED");

      if (owner) {
        await prisma.notification.create({
          data: {
            userId: owner,
            teamId,
            issueId: issue.id,
            type: "ASSIGNED",
            title: `Triage: ${issue.title}`,
          },
        });
      }
    }
    await notifyTeamSlack(team, `Created: ${issue.title}`);
    const { recordActivity } = await import("@/lib/services/surface");

    await recordActivity(issue.id, userId, "created", "", issue.title);
  } catch {
    // non-blocking
  }

  // Automations run last and write straight to the row, so they can't re-trigger themselves.
  const { runAutomations } = await import("@/lib/services/automations");
  const ranOnCreate = await runAutomations(teamId, issue.id, "created", userId);

  if (ranOnCreate) {
    const fresh = await prisma.issue.findFirst({
      where: { id: issue.id, teamId },
      include: issueInclude,
    });

    if (fresh) return fresh;
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

  // Changing the estimate must use a value from the team's scale. Leaving it as it is stays
  // allowed, so an issue estimated under an older scale can still be edited.
  if (
    data.estimate !== undefined &&
    data.estimate !== "NONE" &&
    data.estimate !== existing.estimate
  ) {
    await assertEstimateAllowed(teamId, data.estimate);
  }

  if (data.parentId !== undefined && data.parentId !== existing.parentId) {
    if (data.parentId) {
      const { assertValidParent } = await import("@/lib/services/sub-issues");

      await assertValidParent(teamId, issueId, data.parentId);
    }
  }

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

  let workflowRuleId: string | null = null;

  // Keep `status` and `workflowStatusId` a matching pair on every change.
  if (data.workflowStatusId) {
    const resolved = await resolveStatus(teamId, {
      workflowStatusId: data.workflowStatusId,
    });
    const workflow = await prisma.workflowStatus.findFirst({
      where: { id: data.workflowStatusId, teamId },
      select: { statusRuleId: true },
    });

    if (resolved) data.status = resolved.status;
    workflowRuleId = workflow?.statusRuleId ?? null;
  } else if (data.status && data.status !== existing.status) {
    // A bare status change moves the issue to the first workflow status of that type.
    const resolved = await resolveStatus(teamId, { status: data.status });

    if (resolved) data.workflowStatusId = resolved.workflowStatusId;
  }

  if (data.status && data.status !== existing.status) {
    const { matchStatusRule } = await import("@/lib/services/status-rules");
    const rule = workflowRuleId
      ? await prisma.statusRule.findFirst({
          where: { id: workflowRuleId, teamId },
        })
      : await matchStatusRule(teamId, data.status);

    if (rule?.setAssigneeId && data.assigneeId === undefined) {
      data.assigneeId = rule.setAssigneeId;
    }
    if (rule?.setPriority && data.priority === undefined) {
      data.priority = rule.setPriority;
    }
    if (rule?.setCycleId && data.cycleId === undefined) {
      data.cycleId = rule.setCycleId;
    }
    if (rule?.commentBody) {
      await prisma.comment.create({
        data: {
          issueId,
          authorId: userId,
          body: rule.commentBody,
        },
      });
    }
    if (rule?.addLabelId) {
      await prisma.issueLabel.upsert({
        where: {
          issueId_labelId: { issueId, labelId: rule.addLabelId },
        },
        create: { issueId, labelId: rule.addLabelId },
        update: {},
      });
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
      ...(data.status
        ? lifecycleStamps(existing.status, data.status, existing, new Date())
        : {}),
      revision: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    const current = await getIssueById(teamId, issueId);

    throw new ConflictError("Issue revision conflict", current);
  }

  const saved = await getIssueById(teamId, issueId);

  if (data.status && data.status !== existing.status && saved) {
    const { notifyIssueSubscribers } =
      await import("@/lib/services/notifications");

    await notifyIssueSubscribers({
      teamId,
      issueId,
      actorId: userId,
      type: "STATUS_CHANGED",
      title: `Status changed: ${saved.title}`,
    });
  }

  if (saved) {
    const { recordActivity, notifyTeamSlack } =
      await import("@/lib/services/surface");
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
      "parentId",
    ] as const;

    const asText = (value: unknown) => {
      if (value == null || value === "") return "";
      if (value instanceof Date) return value.toISOString();

      return String(value);
    };

    for (const field of fields) {
      if (
        data[field] !== undefined &&
        asText(data[field]) !== asText(existing[field])
      ) {
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
      await notifyTeamSlack(team, `Assigned: ${saved.title}`);
    }
    if (data.status && data.status !== existing.status) {
      await notifyTeamSlack(
        team,
        `Status ${existing.status} → ${data.status}: ${saved.title}`,
      );
      try {
        const { commentOnLinkedPullRequest } = await import("@/lib/github");

        await commentOnLinkedPullRequest(issueId, String(data.status));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("GitHub status comment failed", error);
      }
    }
    const { dispatchWebhooks } = await import("@/lib/services/webhooks");

    await dispatchWebhooks(teamId, "issue.updated", saved);
  }

  if (saved) {
    const { runAutomations } = await import("@/lib/services/automations");
    const ran = await runAutomations(
      teamId,
      issueId,
      {
        statusChanged: Boolean(data.status && data.status !== existing.status),
        priorityChanged: Boolean(
          data.priority && data.priority !== existing.priority,
        ),
        assigneeChanged: Boolean(
          data.assigneeId && data.assigneeId !== existing.assigneeId,
        ),
      },
      userId,
    );

    if (ran) {
      const fresh = await getIssueById(teamId, issueId);

      if (fresh) return fresh;
    }
  }

  // A finished sub-issue may finish its parent (team setting).
  if (
    saved?.parentId &&
    data.status &&
    data.status !== existing.status &&
    (data.status === "DONE" || data.status === "CANCELLED")
  ) {
    try {
      const { completeParentIfDone } =
        await import("@/lib/services/sub-issues");

      await completeParentIfDone(teamId, saved.parentId, userId);
    } catch {
      // non-blocking
    }
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

  // Dropping a card on a column sets its workflow status. With no column id, fall back to the
  // first status of the dropped-on type, so the pair never drifts apart.
  const placed = await resolveStatus(teamId, {
    workflowStatusId: data.workflowStatusId,
    status: data.status,
  });

  const updated = await prisma.issue.updateMany({
    where: {
      id: data.issueId,
      teamId,
      ...(expected != null ? { revision: expected } : {}),
    },
    data: {
      status: placed?.status ?? data.status,
      order: data.order,
      ...(placed ? { workflowStatusId: placed.workflowStatusId } : {}),
      ...lifecycleStamps(
        existing.status,
        placed?.status ?? data.status,
        existing,
        new Date(),
      ),
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
    labelGroup?: string;
    /** A filter tree (object or JSON string). Validated here. */
    filter?: unknown;
  },
  opts: { userId?: string | null } = {},
) {
  const where: Prisma.IssueWhereInput = {
    teamId,
    archivedAt: null,
    status: { in: [...BOARD_STATUSES, "CANCELLED"] },
  };
  const boardScope = await guestIssueScope(teamId, opts.userId);

  if (boardScope) where.AND = [boardScope];

  if (
    filters?.filter !== undefined &&
    filters.filter !== null &&
    filters.filter !== ""
  ) {
    const { compileFilter, parseFilter } = await import("@/lib/issue-filter");
    const compiled = compileFilter(parseFilter(filters.filter), {
      userId: opts.userId,
    });

    if (Object.keys(compiled).length) where.AND = [compiled];
  }
  if (filters?.cycleId) where.cycleId = filters.cycleId;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.labelGroup) {
    where.labels = { some: { label: { group: filters.labelGroup } } };
  }
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
      labels: { select: { labelId: true } },
      creatorId: true,
      assignee: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: [{ order: "asc" }, { number: "asc" }],
  });
}

/** Reject an estimate the team's scale does not offer. */
async function assertEstimateAllowed(teamId: string, estimate: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { estimateScale: true },
  });
  const scale = normalizeScale(team?.estimateScale);

  if (!isAllowedEstimate(scale, estimate)) {
    throw new AuthError(
      scale === "off"
        ? "This team does not use estimates"
        : `That estimate is not on this team's ${SCALE_LABELS[scale].split(" (")[0]!.toLowerCase()} scale`,
      "BAD_REQUEST",
      400,
    );
  }
}

/** Archived issues are purged for good this many days after they were archived. */
export const ARCHIVE_RETENTION_DAYS = 30;

function canDelete(
  role: Role,
  issue: { creatorId: string },
  userId: string,
): boolean {
  return role === "ADMIN" || role === "OWNER" || issue.creatorId === userId;
}

/** Hide an issue from lists, boards, counts and sync. It keeps its number and history. */
export async function archiveIssue(
  teamId: string,
  issueId: string,
  role: Role,
  userId: string,
) {
  assertRole(role, "MEMBER");
  const existing = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!existing) throw new AuthError("Issue not found", "NOT_FOUND", 404);
  if (existing.archivedAt) return getIssueById(teamId, issueId);

  await prisma.issue.update({
    where: { id: issueId },
    data: {
      archivedAt: new Date(),
      archivedById: userId,
      revision: { increment: 1 },
    },
  });
  const saved = await getIssueById(teamId, issueId);

  try {
    const { recordActivity } = await import("@/lib/services/surface");
    const { dispatchWebhooks } = await import("@/lib/services/webhooks");

    await recordActivity(issueId, userId, "archived", "", "archived");
    await dispatchWebhooks(teamId, "issue.archived", saved);
  } catch {
    // non-blocking
  }

  return saved;
}

export async function restoreIssue(
  teamId: string,
  issueId: string,
  role: Role,
  userId: string,
) {
  assertRole(role, "MEMBER");
  const existing = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!existing) throw new AuthError("Issue not found", "NOT_FOUND", 404);
  if (!existing.archivedAt) return getIssueById(teamId, issueId);

  await prisma.issue.update({
    where: { id: issueId },
    data: { archivedAt: null, archivedById: null, revision: { increment: 1 } },
  });
  const saved = await getIssueById(teamId, issueId);

  try {
    const { recordActivity } = await import("@/lib/services/surface");
    const { dispatchWebhooks } = await import("@/lib/services/webhooks");

    await recordActivity(issueId, userId, "archived", "archived", "");
    await dispatchWebhooks(teamId, "issue.restored", saved);
  } catch {
    // non-blocking
  }

  return saved;
}

/** Permanently delete issues that have sat in the archive past the retention window. */
export async function purgeArchivedIssues(now = new Date()) {
  const cutoff = new Date(
    now.getTime() - ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const old = await prisma.issue.findMany({
    where: { archivedAt: { lt: cutoff } },
    select: { id: true, teamId: true },
    take: 500,
  });

  if (!old.length) return 0;
  await prisma.$transaction([
    prisma.issueDeletion.createMany({
      data: old.map((row) => ({ issueId: row.id, teamId: row.teamId })),
      skipDuplicates: true,
    }),
    prisma.issue.deleteMany({
      where: { id: { in: old.map((row) => row.id) } },
    }),
  ]);

  return old.length;
}

export type BulkResult = {
  ok: string[];
  failed: { id: string; error: string }[];
};

/**
 * Apply one action to many issues. Each issue goes through the same service path as a
 * single edit (revision bump, activity, webhooks, status rules), so a bulk edit can never
 * do what a single edit would refuse. One bad issue does not stop the rest.
 */
export async function bulkUpdateIssues(
  teamId: string,
  input: unknown,
  role: Role,
  userId: string,
): Promise<BulkResult> {
  const data = bulkIssuesSchema.parse(input);

  assertRole(role, "MEMBER");
  if (data.action === "update" && !data.patch) {
    throw new AuthError("patch is required for update", "BAD_REQUEST", 400);
  }
  const ids = [...new Set(data.ids)];
  const found = await prisma.issue.findMany({
    where: { teamId, id: { in: ids } },
    select: { id: true, creatorId: true },
  });
  const byId = new Map(found.map((row) => [row.id, row]));
  const result: BulkResult = { ok: [], failed: [] };

  const { addLabelIds = [], removeLabelIds = [], ...fields } = data.patch ?? {};

  if (addLabelIds.length || removeLabelIds.length) {
    const wanted = [...new Set([...addLabelIds, ...removeLabelIds])];
    const valid = await prisma.label.count({
      where: { teamId, id: { in: wanted } },
    });

    if (valid !== wanted.length) {
      throw new AuthError("Unknown label", "BAD_REQUEST", 400);
    }
  }

  async function run(id: string) {
    const issue = byId.get(id);

    if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);
    switch (data.action) {
      case "archive":
        await archiveIssue(teamId, id, role, userId);
        break;
      case "restore":
        await restoreIssue(teamId, id, role, userId);
        break;
      case "delete":
        if (!canDelete(role, issue, userId)) {
          throw new AuthError(
            "Only admins or the creator can delete issues",
            "FORBIDDEN",
            403,
          );
        }
        await deleteIssue(teamId, id, role, userId);
        break;
      default: {
        if (Object.keys(fields).length) {
          await updateIssue(teamId, id, fields, role, userId);
        }
        if (addLabelIds.length) {
          await prisma.issueLabel.createMany({
            data: addLabelIds.map((labelId) => ({ issueId: id, labelId })),
            skipDuplicates: true,
          });
        }
        if (removeLabelIds.length) {
          await prisma.issueLabel.deleteMany({
            where: { issueId: id, labelId: { in: removeLabelIds } },
          });
        }
        if (addLabelIds.length || removeLabelIds.length) {
          await prisma.issue.update({
            where: { id },
            data: { revision: { increment: 1 } },
          });
        }
      }
    }
  }

  // Small batches: fast enough, and never opens hundreds of connections at once.
  const BATCH = 8;

  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    const settled = await Promise.allSettled(slice.map((id) => run(id)));

    settled.forEach((outcome, index) => {
      const id = slice[index]!;

      if (outcome.status === "fulfilled") {
        result.ok.push(id);
      } else {
        const reason = outcome.reason;

        result.failed.push({
          id,
          error: reason instanceof Error ? reason.message : "Failed",
        });
      }
    });
  }

  return result;
}

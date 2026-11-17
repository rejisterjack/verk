import type { Role } from "@/lib/generated/prisma/client";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { isValidEmoji, MAX_DISTINCT_EMOJI } from "@/lib/reactions";
import { assertRole } from "@/lib/roles";
import { postSlackMessage } from "@/lib/slack";
import { mergeThreeWay } from "@/lib/three-way-merge";

export async function toggleReaction(
  teamId: string,
  commentId: string,
  userId: string,
  symbol: string,
) {
  if (!isValidEmoji(symbol)) {
    throw new AuthError("That is not an emoji", "BAD_REQUEST", 400);
  }
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, issue: { teamId } },
  });

  if (!comment) throw new AuthError("Comment not found", "NOT_FOUND", 404);
  const existing = await prisma.commentReaction.findFirst({
    where: { commentId, userId, emoji: symbol },
  });

  if (existing) {
    await prisma.commentReaction.delete({ where: { id: existing.id } });

    return { on: false };
  }
  // Keep one comment from turning into an emoji wall.
  const distinct = await prisma.commentReaction.findMany({
    where: { commentId },
    distinct: ["emoji"],
    select: { emoji: true },
  });

  if (
    distinct.length >= MAX_DISTINCT_EMOJI &&
    !distinct.some((row) => row.emoji === symbol)
  ) {
    throw new AuthError(
      `A comment can have at most ${MAX_DISTINCT_EMOJI} different reactions`,
      "BAD_REQUEST",
      400,
    );
  }
  await prisma.commentReaction.create({
    data: { commentId, userId, emoji: symbol },
  });

  return { on: true };
}

export async function listProjectUpdates(teamId: string, projectId: string) {
  return prisma.projectUpdate.findMany({
    where: { projectId, project: { teamId } },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function addProjectUpdate(
  teamId: string,
  projectId: string,
  authorId: string,
  input: unknown,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, teamId },
  });

  if (!project) throw new AuthError("Project not found", "NOT_FOUND", 404);
  const data = z
    .object({
      body: z.string().min(1).max(5000),
      health: z.enum(["ON_TRACK", "AT_RISK", "OFF_TRACK"]).optional(),
    })
    .parse(input);
  const update = await prisma.projectUpdate.create({
    data: {
      projectId,
      authorId,
      body: data.body,
      health: data.health ?? "ON_TRACK",
    },
  });
  const { dispatchWebhooks } = await import("@/lib/services/webhooks");

  await dispatchWebhooks(teamId, "project.updated", update);

  return update;
}

export async function listTemplates(teamId: string) {
  return prisma.issueTemplate.findMany({
    where: { teamId },
    orderBy: { name: "asc" },
  });
}

export async function createTemplate(teamId: string, input: unknown) {
  const data = z
    .object({
      name: z.string().min(1).max(80),
      title: z.string().min(1).max(200),
      description: z.string().max(20000).optional().default(""),
      priority: z.string().optional(),
      estimate: z.string().optional(),
      labelId: z.string().cuid().nullable().optional(),
    })
    .parse(input);

  return prisma.issueTemplate.create({
    data: {
      teamId,
      name: data.name,
      title: data.title,
      description: data.description,
      priority: (data.priority as "NONE") || "NONE",
      estimate: (data.estimate as "NONE") || "NONE",
      labelId: data.labelId ?? null,
    },
  });
}

const templateSchema = z.object({
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  description: z.string().max(20000).optional().default(""),
  priority: z.string().optional(),
  estimate: z.string().optional(),
});

export async function updateTemplate(
  teamId: string,
  templateId: string,
  input: unknown,
) {
  const existing = await prisma.issueTemplate.findFirst({
    where: { id: templateId, teamId },
  });

  if (!existing) throw new AuthError("Template not found", "NOT_FOUND", 404);
  const data = templateSchema.parse(input);

  return prisma.issueTemplate.update({
    where: { id: templateId },
    data: {
      name: data.name,
      title: data.title,
      description: data.description,
      priority: (data.priority as "NONE") || "NONE",
      estimate: (data.estimate as "NONE") || "NONE",
    },
  });
}

export async function deleteTemplate(teamId: string, templateId: string) {
  const existing = await prisma.issueTemplate.findFirst({
    where: { id: templateId, teamId },
  });

  if (!existing) throw new AuthError("Template not found", "NOT_FOUND", 404);
  await prisma.issueTemplate.delete({ where: { id: templateId } });
}

export async function listActivity(teamId: string, issueId: string) {
  const [changes, comments] = await Promise.all([
    prisma.issueActivity.findMany({
      where: { issueId, issue: { teamId } },
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.comment.findMany({
      where: { issueId, issue: { teamId } },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return [
    ...changes.map((row) => ({
      id: row.id,
      kind: "change" as const,
      field: row.field,
      fromValue: row.fromValue,
      toValue: row.toValue,
      createdAt: row.createdAt,
      actor: row.actor,
    })),
    ...comments.map((row) => ({
      id: `comment-${row.id}`,
      kind: "comment" as const,
      field: "comment",
      fromValue: "",
      toValue: row.body.slice(0, 180),
      createdAt: row.createdAt,
      actor: row.author,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function listDocuments(teamId: string) {
  return prisma.document.findMany({
    where: { teamId },
    include: {
      comments: {
        include: {
          author: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function saveDocument(
  teamId: string,
  userId: string,
  input: unknown,
  id?: string,
) {
  const data = z
    .object({
      title: z.string().min(1).max(160),
      body: z.string().max(50000).optional().default(""),
      /** The body this edit started from. Lets the server merge with a save made in between. */
      baseBody: z.string().max(50000).optional(),
      projectId: z.string().cuid().nullable().optional(),
      initiativeId: z.string().cuid().nullable().optional(),
    })
    .parse(input);

  if (id) {
    // Scoped to the team: an id from another team must never be editable here.
    const existing = await prisma.document.findFirst({ where: { id, teamId } });

    if (!existing) throw new AuthError("Document not found", "NOT_FOUND", 404);
    // Someone else saved since this editor opened the page: merge their change with mine
    // instead of overwriting it. Different parts of the text combine; the same lines conflict.
    if (data.baseBody !== undefined && data.baseBody !== existing.body) {
      const merged = mergeThreeWay(data.baseBody, data.body, existing.body);

      if (!merged.ok) {
        throw new AuthError(
          `Someone else edited this document at the same time, in the same place (${merged.conflicts} conflict${merged.conflicts === 1 ? "" : "s"}). Reload to see their version, then re-apply your change.`,
          "CONFLICT",
          409,
        );
      }
      data.body = merged.text;
    }
    // Keep what is about to be overwritten, unless nothing actually changed.
    if (existing.title !== data.title || existing.body !== data.body) {
      await prisma.documentRevision.create({
        data: {
          documentId: id,
          title: existing.title,
          body: existing.body,
          authorId: existing.updatedById,
        },
      });
      const old = await prisma.documentRevision.findMany({
        where: { documentId: id },
        orderBy: { createdAt: "desc" },
        skip: 50,
        select: { id: true },
      });

      if (old.length) {
        await prisma.documentRevision.deleteMany({
          where: { id: { in: old.map((row) => row.id) } },
        });
      }
    }

    return prisma.document.update({
      where: { id },
      data: {
        title: data.title,
        body: data.body,
        updatedById: userId,
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
        ...(data.initiativeId !== undefined
          ? { initiativeId: data.initiativeId }
          : {}),
      },
    });
  }

  return prisma.document.create({
    data: {
      teamId,
      title: data.title,
      body: data.body,
      updatedById: userId,
      projectId: data.projectId ?? null,
      initiativeId: data.initiativeId ?? null,
    },
  });
}

export async function listDocumentRevisions(
  teamId: string,
  documentId: string,
) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, teamId },
    select: { id: true },
  });

  if (!doc) throw new AuthError("Document not found", "NOT_FOUND", 404);

  return prisma.documentRevision.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/** Put an old revision back. The current text is itself saved as a revision first. */
export async function restoreDocumentRevision(
  teamId: string,
  userId: string,
  revisionId: string,
) {
  const revision = await prisma.documentRevision.findFirst({
    where: { id: revisionId, document: { teamId } },
  });

  if (!revision) throw new AuthError("Revision not found", "NOT_FOUND", 404);

  return saveDocument(
    teamId,
    userId,
    { title: revision.title, body: revision.body },
    revision.documentId,
  );
}

export async function listSavedInsights(teamId: string) {
  return prisma.savedInsight.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
  });
}

export async function saveInsight(
  teamId: string,
  name: string,
  filter: InsightFilter,
) {
  const title = name.trim();

  if (!title) throw new AuthError("Name is required", "BAD_REQUEST", 400);

  return prisma.savedInsight.create({
    data: { teamId, name: title, filterJson: filter },
  });
}

export async function deleteSavedInsight(teamId: string, insightId: string) {
  const existing = await prisma.savedInsight.findFirst({
    where: { id: insightId, teamId },
  });

  if (!existing) throw new AuthError("Insight not found", "NOT_FOUND", 404);
  await prisma.savedInsight.delete({ where: { id: insightId } });
}

export async function deleteDocument(teamId: string, documentId: string) {
  const existing = await prisma.document.findFirst({
    where: { id: documentId, teamId },
  });

  if (!existing) throw new AuthError("Document not found", "NOT_FOUND", 404);
  await prisma.document.delete({ where: { id: documentId } });
}

export async function listCustomers(teamId: string) {
  return prisma.customer.findMany({
    where: { teamId },
    include: {
      _count: { select: { requests: true } },
      requests: { select: { id: true, body: true, issueId: true } },
    },
    orderBy: [{ arr: "desc" }, { name: "asc" }],
  });
}

const customerValueSchema = {
  tier: z.string().trim().max(60).optional(),
  /** Whole currency units per year. Accepts "50000" from a form. */
  arr: z.coerce.number().int().min(0).max(1_000_000_000_000).optional(),
};

export async function createCustomer(teamId: string, input: unknown) {
  const data = z
    .object({
      name: z.string().min(1).max(120),
      domain: z.string().max(120).optional().default(""),
      ...customerValueSchema,
    })
    .parse(input);

  return prisma.customer.create({
    data: {
      teamId,
      name: data.name,
      domain: data.domain,
      tier: data.tier ?? "",
      arr: data.arr ?? 0,
    },
  });
}

/** Change a customer's tier or annual revenue. Scoped to the team. */
export async function updateCustomerValue(
  teamId: string,
  customerId: string,
  input: unknown,
  role: Role,
) {
  assertRole(role, "MEMBER");
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, teamId },
  });

  if (!existing) throw new AuthError("Customer not found", "NOT_FOUND", 404);
  const data = z.object(customerValueSchema).parse(input);

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(data.tier !== undefined ? { tier: data.tier } : {}),
      ...(data.arr !== undefined ? { arr: data.arr } : {}),
    },
  });
}

export async function addCustomerRequest(
  teamId: string,
  customerId: string,
  input: unknown,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, teamId },
  });

  if (!customer) throw new AuthError("Customer not found", "NOT_FOUND", 404);
  const data = z
    .object({
      body: z.string().min(1).max(5000),
      issueId: z.string().optional(),
      issueNumber: z.coerce.number().int().positive().optional(),
    })
    .parse(input);
  let issueId = data.issueId || null;

  if (data.issueNumber) {
    const issue = await prisma.issue.findFirst({
      where: { teamId, number: data.issueNumber },
    });

    if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);
    issueId = issue.id;
  }

  return prisma.customerRequest.create({
    data: {
      customerId,
      body: data.body,
      issueId,
    },
  });
}

export async function deleteCustomer(teamId: string, customerId: string) {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, teamId },
  });

  if (!existing) throw new AuthError("Customer not found", "NOT_FOUND", 404);
  await prisma.customer.delete({ where: { id: customerId } });
}

export async function deleteCustomerRequest(teamId: string, requestId: string) {
  const existing = await prisma.customerRequest.findFirst({
    where: { id: requestId, customer: { teamId } },
  });

  if (!existing) throw new AuthError("Request not found", "NOT_FOUND", 404);
  await prisma.customerRequest.delete({ where: { id: requestId } });
}

export async function listIssueLinks(teamId: string, issueId: string) {
  return prisma.issueLink.findMany({
    where: { issueId, issue: { teamId } },
    orderBy: { createdAt: "desc" },
  });
}

export async function addIssueLink(
  teamId: string,
  issueId: string,
  input: unknown,
) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);
  const data = z
    .object({
      kind: z.enum(["figma", "sentry", "link", "github"]),
      url: z.string().url(),
    })
    .parse(input);

  let title = "";
  let description = "";

  try {
    const response = await fetch(data.url, {
      headers: { "User-Agent": "verk" },
      signal: AbortSignal.timeout(4000),
    });
    const html = await response.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descriptionMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    );

    title = match?.[1]?.trim().slice(0, 180) ?? "";
    description = descriptionMatch?.[1]?.trim().slice(0, 280) ?? "";
  } catch {
    title = "";
  }

  return prisma.issueLink.create({
    data: { issueId, kind: data.kind, url: data.url, title, description },
  });
}

export async function deleteIssueLink(
  teamId: string,
  issueId: string,
  linkId: string,
) {
  const link = await prisma.issueLink.findFirst({
    where: { id: linkId, issueId, issue: { teamId } },
  });

  if (!link) throw new AuthError("Link not found", "NOT_FOUND", 404);
  await prisma.issueLink.delete({ where: { id: linkId } });
}

export async function recordActivity(
  issueId: string,
  actorId: string,
  field: string,
  fromValue: string,
  toValue: string,
) {
  if (fromValue === toValue) return;

  await prisma.issueActivity.create({
    data: { issueId, actorId, field, fromValue, toValue },
  });
}

export type InsightFilter = {
  status?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
  cycleId?: string;
  labelId?: string;
  from?: string;
  to?: string;
  group?: string;
};

export async function insightCounts(
  teamId: string,
  filter: InsightFilter = {},
) {
  const since = filter.from ? new Date(filter.from) : new Date();

  if (!filter.from) since.setDate(since.getDate() - 56);
  const until = filter.to ? new Date(filter.to) : new Date();
  const issueWhere = {
    teamId,
    archivedAt: null,
    createdAt: { gte: since, lte: until },
    ...(filter.status ? { status: filter.status as never } : {}),
    ...(filter.priority ? { priority: filter.priority as never } : {}),
    ...(filter.assigneeId ? { assigneeId: filter.assigneeId } : {}),
    ...(filter.projectId ? { projectId: filter.projectId } : {}),
    ...(filter.cycleId ? { cycleId: filter.cycleId } : {}),
    ...(filter.labelId
      ? { labels: { some: { labelId: filter.labelId } } }
      : {}),
  };
  const weekStarts: Date[] = [];

  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date();

    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i * 7);
    weekStarts.push(start);
  }

  const [
    created,
    done,
    statusGroups,
    assigneeGroups,
    projectGroups,
    cycles,
    recentIssues,
  ] = await Promise.all([
    prisma.issue.count({ where: issueWhere }),
    filter.status && filter.status !== "DONE"
      ? Promise.resolve(0)
      : prisma.issue.count({
          where: { ...issueWhere, status: "DONE" },
        }),
    prisma.issue.groupBy({
      by: ["status"],
      where: issueWhere,
      _count: { _all: true },
    }),
    prisma.issue.groupBy({
      by: ["assigneeId"],
      where: issueWhere,
      _count: { _all: true },
    }),
    prisma.issue.groupBy({
      by: ["projectId"],
      where: issueWhere,
      _count: { _all: true },
    }),
    prisma.cycle.findMany({
      where: { teamId },
      include: { issues: { select: { status: true } } },
      orderBy: { startDate: "desc" },
      take: 6,
    }),
    prisma.issue.findMany({
      where: issueWhere,
      select: { createdAt: true, status: true, updatedAt: true },
    }),
  ]);

  const weekly = weekStarts.map((start, index) => {
    const end =
      index < weekStarts.length - 1
        ? weekStarts[index + 1]!
        : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const createdCount = recentIssues.filter(
      (issue) => issue.createdAt >= start && issue.createdAt < end,
    ).length;
    const doneCount = recentIssues.filter(
      (issue) =>
        issue.status === "DONE" &&
        issue.updatedAt >= start &&
        issue.updatedAt < end,
    ).length;

    return {
      label: start.toISOString().slice(5, 10),
      created: createdCount,
      done: doneCount,
    };
  });

  return {
    created,
    done,
    weekly,
    byStatus: Object.fromEntries(
      statusGroups.map((row) => [row.status, row._count._all]),
    ),
    byAssignee: assigneeGroups.map((row) => ({
      assigneeId: row.assigneeId,
      count: row._count._all,
    })),
    byProject: projectGroups.map((row) => ({
      projectId: row.projectId,
      count: row._count._all,
    })),
    byLabel: (
      await prisma.issueLabel.groupBy({
        by: ["labelId"],
        where: { issue: issueWhere },
        _count: { _all: true },
      })
    ).map((row) => ({
      labelId: row.labelId,
      count: row._count._all,
    })),
    cycles: cycles.map((cycle) => {
      const total = cycle.issues.length;
      const finished = cycle.issues.filter(
        (issue) => issue.status === "DONE",
      ).length;

      return {
        id: cycle.id,
        name: cycle.name,
        percent: total ? Math.round((finished / total) * 100) : 0,
      };
    }),
  };
}

export async function listDocumentComments(documentId: string) {
  return prisma.documentComment.findMany({
    where: { documentId },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function addDocumentComment(
  teamId: string,
  documentId: string,
  authorId: string,
  body: string,
) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, teamId },
  });

  if (!document) throw new AuthError("Document not found", "NOT_FOUND", 404);
  const text = body.trim();

  if (!text) throw new AuthError("Comment is empty", "BAD_REQUEST", 400);

  return prisma.documentComment.create({
    data: { documentId, authorId, body: text },
  });
}

export async function listPulse(teamId: string) {
  const [activity, updates, comments] = await Promise.all([
    prisma.issueActivity.findMany({
      where: { issue: { teamId } },
      include: {
        actor: { select: { name: true, email: true } },
        issue: { select: { number: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.projectUpdate.findMany({
      where: { project: { teamId } },
      include: {
        author: { select: { name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.comment.findMany({
      where: { issue: { teamId } },
      include: {
        author: { select: { name: true, email: true } },
        issue: { select: { number: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return [
    ...activity.map((item) => ({
      id: `issue-${item.id}`,
      at: item.createdAt,
      href: item.issue.number,
      title: item.issue.title,
      detail: `${item.actor.name ?? item.actor.email} ${item.field}`,
      kind: "issue" as const,
    })),
    ...comments.map((item) => ({
      id: `comment-${item.id}`,
      at: item.createdAt,
      href: item.issue.number,
      title: item.issue.title,
      detail: `${item.author.name ?? item.author.email} commented`,
      kind: "issue" as const,
    })),
    ...updates.map((item) => ({
      id: `project-${item.id}`,
      at: item.createdAt,
      href: item.project.id,
      title: item.project.name,
      detail: `${item.author.name ?? item.author.email} posted an update`,
      kind: "project" as const,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 20);
}

type SlackTarget = {
  slackWebhookUrl?: string | null;
  slackChannelId?: string | null;
};

/**
 * Post a team notification to Slack exactly once.
 *   - bot token + team channel  -> chat.postMessage to that channel
 *   - otherwise                 -> the team's incoming webhook (the fallback)
 * Never both, so nothing double-posts, and it never throws, so a Slack outage
 * can't fail the issue update that triggered it.
 */
export async function notifyTeamSlack(
  team: SlackTarget | null | undefined,
  text: string,
  deps: { token?: string | null; post?: typeof postSlackMessage } = {},
) {
  if (!team) return "skipped" as const;
  const token =
    deps.token === undefined ? process.env.SLACK_BOT_TOKEN : deps.token;
  const channel = team.slackChannelId || process.env.SLACK_CHANNEL;

  if (token && channel) {
    const posted = await (deps.post ?? postSlackMessage)({
      token,
      channel,
      text,
    });

    if (posted) return "bot" as const;
    // The bot couldn't post (bad channel, not invited...). Fall through to the webhook.
  }
  if (team.slackWebhookUrl) {
    await notifySlack(team.slackWebhookUrl, text);

    return "webhook" as const;
  }

  return "skipped" as const;
}

export async function notifySlack(
  url: string | null | undefined,
  text: string,
) {
  if (!url) return;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error(`Slack webhook failed: ${response.status}`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Slack webhook failed", error);
  }
}

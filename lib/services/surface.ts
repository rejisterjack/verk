import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";

export const REACTION_EMOJIS = ["👍", "👀", "🎉", "❤️", "🚀"] as const;

export async function toggleReaction(
  teamId: string,
  commentId: string,
  userId: string,
  symbol: string,
) {
  if (!REACTION_EMOJIS.includes(symbol as (typeof REACTION_EMOJIS)[number])) {
    throw new AuthError("Unsupported reaction", "BAD_REQUEST", 400);
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
  return prisma.issueActivity.findMany({
    where: { issueId, issue: { teamId } },
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listDocuments(teamId: string) {
  return prisma.document.findMany({
    where: { teamId },
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
    })
    .parse(input);

  if (id) {
    return prisma.document.update({
      where: { id },
      data: { title: data.title, body: data.body, updatedById: userId },
    });
  }

  return prisma.document.create({
    data: { teamId, title: data.title, body: data.body, updatedById: userId },
  });
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
    orderBy: { name: "asc" },
  });
}

export async function createCustomer(teamId: string, input: unknown) {
  const data = z
    .object({
      name: z.string().min(1).max(120),
      domain: z.string().max(120).optional().default(""),
    })
    .parse(input);

  return prisma.customer.create({
    data: { teamId, name: data.name, domain: data.domain },
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
  const issue = await prisma.issue.findFirst({ where: { id: issueId, teamId } });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);
  const data = z
    .object({
      kind: z.enum(["figma", "sentry", "link", "github"]),
      url: z.string().url(),
    })
    .parse(input);

  return prisma.issueLink.create({
    data: { issueId, kind: data.kind, url: data.url },
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

export async function insightCounts(teamId: string) {
  const since = new Date();

  since.setDate(since.getDate() - 56);
  const [created, done, statusGroups, cycles] = await Promise.all([
    prisma.issue.count({ where: { teamId, createdAt: { gte: since } } }),
    prisma.issue.count({
      where: { teamId, status: "DONE", updatedAt: { gte: since } },
    }),
    prisma.issue.groupBy({
      by: ["status"],
      where: { teamId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.cycle.findMany({
      where: { teamId },
      include: { issues: { select: { status: true } } },
      orderBy: { startDate: "desc" },
      take: 6,
    }),
  ]);

  return {
    created,
    done,
    byStatus: Object.fromEntries(
      statusGroups.map((row) => [row.status, row._count._all]),
    ),
    cycles: cycles.map((cycle) => {
      const total = cycle.issues.length;
      const finished = cycle.issues.filter((issue) => issue.status === "DONE").length;

      return {
        id: cycle.id,
        name: cycle.name,
        percent: total ? Math.round((finished / total) * 100) : 0,
      };
    }),
  };
}

export async function notifySlack(url: string | null | undefined, text: string) {
  if (!url) return;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.error(`Slack webhook failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Slack webhook failed", error);
  }
}

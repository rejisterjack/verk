import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";

const ruleSchema = z
  .object({
    titleContains: z.string().max(120).optional().default(""),
    priority: z
      .enum(["NONE", "URGENT", "HIGH", "MEDIUM", "LOW"])
      .nullable()
      .optional(),
    labelId: z.string().cuid().nullable().optional(),
    setAssigneeId: z.string().cuid().nullable().optional(),
    setStatus: z
      .enum(["BACKLOG", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"])
      .nullable()
      .optional(),
    addLabelId: z.string().cuid().nullable().optional(),
  })
  .refine(
    (rule) =>
      Boolean(rule.titleContains?.trim()) ||
      Boolean(rule.priority) ||
      Boolean(rule.labelId),
    { message: "Add a title, priority, or label to match" },
  );

export async function listTriageRules(teamId: string) {
  return prisma.triageRule.findMany({
    where: { teamId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      label: { select: { id: true, name: true } },
      addLabel: { select: { id: true, name: true } },
      setAssignee: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function createTriageRule(teamId: string, input: unknown) {
  const data = ruleSchema.parse(input);
  const last = await prisma.triageRule.aggregate({
    where: { teamId },
    _max: { position: true },
  });

  return prisma.triageRule.create({
    data: {
      teamId,
      position: (last._max.position ?? 0) + 1,
      titleContains: data.titleContains.trim(),
      priority: data.priority ?? null,
      labelId: data.labelId ?? null,
      setAssigneeId: data.setAssigneeId ?? null,
      setStatus: data.setStatus ?? null,
      addLabelId: data.addLabelId ?? null,
    },
  });
}

export async function deleteTriageRule(teamId: string, ruleId: string) {
  const rule = await prisma.triageRule.findFirst({
    where: { id: ruleId, teamId },
  });

  if (!rule) throw new AuthError("Rule not found", "NOT_FOUND", 404);
  await prisma.triageRule.delete({ where: { id: ruleId } });
}

export async function matchTriageRule(
  teamId: string,
  issue: { title: string; priority: Priority; labelIds: string[] },
) {
  const rules = await prisma.triageRule.findMany({
    where: { teamId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  const title = issue.title.toLowerCase();

  return (
    rules.find((rule) => {
      if (
        rule.titleContains &&
        !title.includes(rule.titleContains.toLowerCase())
      ) {
        return false;
      }
      if (rule.priority && rule.priority !== issue.priority) return false;
      if (rule.labelId && !issue.labelIds.includes(rule.labelId)) return false;

      return true;
    }) ?? null
  );
}

export function applyMatchedRule(
  rule: {
    setAssigneeId: string | null;
    setStatus: IssueStatus | null;
    addLabelId: string | null;
  },
  issue: {
    assigneeId?: string | null;
    status?: IssueStatus;
    labelIds?: string[];
  },
) {
  const labelIds = [...(issue.labelIds ?? [])];

  if (rule.addLabelId && !labelIds.includes(rule.addLabelId)) {
    labelIds.push(rule.addLabelId);
  }

  return {
    assigneeId: rule.setAssigneeId ?? issue.assigneeId ?? null,
    status: rule.setStatus ?? issue.status,
    labelIds,
  };
}

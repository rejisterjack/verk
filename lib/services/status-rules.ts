import type { IssueStatus } from "@/lib/generated/prisma/client";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";

const ruleSchema = z.object({
  fromStatus: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"]),
  setAssigneeId: z.string().cuid().nullable().optional(),
  addLabelId: z.string().cuid().nullable().optional(),
  setPriority: z
    .enum(["NONE", "URGENT", "HIGH", "MEDIUM", "LOW"])
    .nullable()
    .optional(),
  setCycleId: z.string().cuid().nullable().optional(),
  commentBody: z.string().max(2000).optional().default(""),
});

export async function listStatusRules(teamId: string) {
  return prisma.statusRule.findMany({
    where: { teamId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      setAssignee: { select: { id: true, name: true, email: true } },
      addLabel: { select: { id: true, name: true } },
    },
  });
}

export async function createStatusRule(teamId: string, input: unknown) {
  const data = ruleSchema.parse(input);

  if (
    !data.setAssigneeId &&
    !data.addLabelId &&
    !data.setPriority &&
    !data.setCycleId &&
    !data.commentBody.trim()
  ) {
    throw new AuthError("Choose an action for the rule", "BAD_REQUEST", 400);
  }
  const last = await prisma.statusRule.aggregate({
    where: { teamId },
    _max: { position: true },
  });

  return prisma.statusRule.create({
    data: {
      teamId,
      position: (last._max.position ?? 0) + 1,
      fromStatus: data.fromStatus,
      setAssigneeId: data.setAssigneeId ?? null,
      addLabelId: data.addLabelId ?? null,
      setPriority: data.setPriority ?? null,
      setCycleId: data.setCycleId ?? null,
      commentBody: data.commentBody.trim(),
    },
  });
}

export async function deleteStatusRule(teamId: string, ruleId: string) {
  const rule = await prisma.statusRule.findFirst({
    where: { id: ruleId, teamId },
  });

  if (!rule) throw new AuthError("Rule not found", "NOT_FOUND", 404);
  await prisma.statusRule.delete({ where: { id: ruleId } });
}

export async function matchStatusRule(teamId: string, status: IssueStatus) {
  return prisma.statusRule.findFirst({
    where: { teamId, fromStatus: status },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}

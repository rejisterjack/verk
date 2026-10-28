import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";

const labelSchema = z.object({
  name: z.string().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function listLabels(teamId: string) {
  return prisma.label.findMany({
    where: { teamId },
    orderBy: { name: "asc" },
  });
}

export async function createLabel(teamId: string, input: unknown) {
  const data = labelSchema.parse(input);

  return prisma.label.create({
    data: {
      teamId,
      name: data.name,
      color: data.color ?? "#0f766e",
    },
  });
}

export async function deleteLabel(teamId: string, labelId: string) {
  const existing = await prisma.label.findFirst({
    where: { id: labelId, teamId },
  });

  if (!existing) throw new AuthError("Label not found", "NOT_FOUND", 404);
  await prisma.label.delete({ where: { id: labelId } });
}

export async function setIssueLabels(
  teamId: string,
  issueId: string,
  labelIds: string[],
) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);

  await prisma.$transaction([
    prisma.issueLabel.deleteMany({ where: { issueId } }),
    prisma.issueLabel.createMany({
      data: labelIds.map((labelId) => ({ issueId, labelId })),
      skipDuplicates: true,
    }),
  ]);

  return prisma.issue.findUnique({
    where: { id: issueId },
    include: { labels: { include: { label: true } } },
  });
}

import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";

const labelSchema = z.object({
  name: z.string().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  group: z.string().max(40).optional(),
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
      group: data.group,
    },
  });
}

export async function updateLabel(
  teamId: string,
  labelId: string,
  input: unknown,
) {
  const existing = await prisma.label.findFirst({
    where: { id: labelId, teamId },
  });

  if (!existing) throw new AuthError("Label not found", "NOT_FOUND", 404);
  const data = labelSchema.partial().parse(input);

  return prisma.label.update({
    where: { id: labelId },
    data,
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
  actorId?: string,
) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
    include: { labels: { include: { label: true } } },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);
  const before = issue.labels
    .map((row) => row.label.name)
    .sort()
    .join(", ");

  await prisma.$transaction([
    prisma.issueLabel.deleteMany({ where: { issueId } }),
    ...(labelIds.length
      ? [
          prisma.issueLabel.createMany({
            data: labelIds.map((labelId) => ({ issueId, labelId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  const saved = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { labels: { include: { label: true } } },
  });

  if (actorId && saved) {
    const after = saved.labels
      .map((row) => row.label.name)
      .sort()
      .join(", ");

    if (before !== after) {
      const { recordActivity } = await import("@/lib/services/surface");

      await recordActivity(issueId, actorId, "labels", before, after);
    }
  }

  return saved;
}

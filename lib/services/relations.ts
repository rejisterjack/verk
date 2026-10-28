import type { RelationType } from "@/lib/generated/prisma/client";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { inverseRelation } from "@/lib/relation-pairs";

const relationSchema = z.object({
  toIssueId: z.string().cuid(),
  type: z.enum(["BLOCKS", "BLOCKED_BY", "RELATED", "PARENT", "CHILD"]),
});

export async function listRelations(teamId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);

  return prisma.issueRelation.findMany({
    where: { OR: [{ fromIssueId: issueId }, { toIssueId: issueId }] },
    include: {
      fromIssue: { select: { id: true, number: true, title: true } },
      toIssue: { select: { id: true, number: true, title: true } },
    },
  });
}

export async function addRelation(
  teamId: string,
  fromIssueId: string,
  input: unknown,
) {
  const data = relationSchema.parse(input);
  const [from, to] = await Promise.all([
    prisma.issue.findFirst({ where: { id: fromIssueId, teamId } }),
    prisma.issue.findFirst({ where: { id: data.toIssueId, teamId } }),
  ]);

  if (!from || !to) throw new AuthError("Issue not found", "NOT_FOUND", 404);

  const type = data.type as RelationType;
  const inverse = inverseRelation(type);

  return prisma.$transaction(async (tx) => {
    const created = await tx.issueRelation.create({
      data: {
        fromIssueId,
        toIssueId: data.toIssueId,
        type,
      },
    });

    if (inverse) {
      await tx.issueRelation.create({
        data: {
          fromIssueId: data.toIssueId,
          toIssueId: fromIssueId,
          type: inverse,
        },
      });
    }

    return created;
  });
}

export async function removeRelation(teamId: string, relationId: string) {
  const rel = await prisma.issueRelation.findFirst({
    where: { id: relationId },
    include: { fromIssue: true },
  });

  if (!rel || rel.fromIssue.teamId !== teamId) {
    throw new AuthError("Relation not found", "NOT_FOUND", 404);
  }
  const inverse = inverseRelation(rel.type);

  await prisma.issueRelation.deleteMany({
    where: {
      OR: [
        { id: relationId },
        ...(inverse
          ? [
              {
                fromIssueId: rel.toIssueId,
                toIssueId: rel.fromIssueId,
                type: inverse,
              },
            ]
          : []),
      ],
    },
  });
}

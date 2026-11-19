import type { RelationType, Role } from "@/lib/generated/prisma/client";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import {
  forwardEdge,
  inverseRelation,
  wouldCreateCycle,
} from "@/lib/relation-pairs";
import { rankSimilar } from "@/lib/similar-issues";

export const RELATION_TYPES = [
  "BLOCKS",
  "BLOCKED_BY",
  "RELATED",
  "PARENT",
  "CHILD",
  "DUPLICATE",
  "DUPLICATED_BY",
] as const;

const relationSchema = z.object({
  toIssueId: z.string().cuid(),
  type: z.enum(RELATION_TYPES),
});

export async function listRelations(teamId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);
  const select = { id: true, number: true, title: true, status: true } as const;

  const [rows, parent, children] = await Promise.all([
    prisma.issueRelation.findMany({
      where: { OR: [{ fromIssueId: issueId }, { toIssueId: issueId }] },
      include: { fromIssue: { select }, toIssue: { select } },
    }),
    issue.parentId
      ? prisma.issue.findFirst({
          where: { id: issue.parentId, teamId },
          select,
        })
      : Promise.resolve(null),
    prisma.issue.findMany({
      where: { parentId: issueId, teamId, archivedAt: null },
      select,
      orderBy: { number: "asc" },
    }),
  ]);
  const self = {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    status: issue.status,
  };

  // Parent and sub-issues are stored on `Issue.parentId`. Present them in the same shape as
  // other relations (`CHILD` runs parent -> child) so callers need no special case.
  const synthetic = [
    ...(parent
      ? [
          {
            id: `parent:${issue.id}`,
            fromIssueId: parent.id,
            toIssueId: issue.id,
            type: "CHILD" as const,
            createdAt: issue.createdAt,
            fromIssue: parent,
            toIssue: self,
          },
        ]
      : []),
    ...children.map((child) => ({
      id: `parent:${child.id}`,
      fromIssueId: issue.id,
      toIssueId: child.id,
      type: "CHILD" as const,
      createdAt: issue.createdAt,
      fromIssue: self,
      toIssue: child,
    })),
  ];

  return [...rows, ...synthetic];
}

/** Blocking edges between issues of the team, blocker first. */
async function loadEdges(teamId: string) {
  const rows = await prisma.issueRelation.findMany({
    where: { type: "BLOCKS", fromIssue: { teamId } },
    select: { fromIssueId: true, toIssueId: true },
  });

  return rows.map((row) => ({ from: row.fromIssueId, to: row.toIssueId }));
}

export async function addRelation(
  teamId: string,
  fromIssueId: string,
  input: unknown,
  actorId?: string,
) {
  const data = relationSchema.parse(input);
  const [from, to] = await Promise.all([
    prisma.issue.findFirst({ where: { id: fromIssueId, teamId } }),
    prisma.issue.findFirst({ where: { id: data.toIssueId, teamId } }),
  ]);

  if (!from || !to) throw new AuthError("Issue not found", "NOT_FOUND", 404);
  if (from.id === to.id) {
    throw new AuthError("An issue cannot relate to itself", "BAD_REQUEST", 400);
  }

  const type = data.type as RelationType;

  // Parent and child live on the issue itself (`Issue.parentId`), not in relation rows.
  // Setting a new parent replaces the old one; loops and over-deep nesting are rejected.
  if (type === "CHILD" || type === "PARENT") {
    const { setParent } = await import("@/lib/services/sub-issues");
    const childId = type === "CHILD" ? to.id : from.id;
    const parentId = type === "CHILD" ? from.id : to.id;

    await setParent(
      teamId,
      childId,
      parentId,
      "MEMBER",
      actorId ?? from.creatorId,
    );

    return {
      id: `parent:${childId}`,
      fromIssueId: parentId,
      toIssueId: childId,
      type: "CHILD" as const,
    };
  }

  const inverse = inverseRelation(type);
  const forward = forwardEdge(type, from.id, to.id);

  // A blocks B blocks A can never resolve.
  if (forward) {
    const edges = await loadEdges(teamId);

    if (wouldCreateCycle(edges, forward.edge.from, forward.edge.to)) {
      throw new AuthError(
        "That would make the issues block each other in a loop",
        "BAD_REQUEST",
        400,
      );
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const existing = await tx.issueRelation.findFirst({
      where: { fromIssueId, toIssueId: data.toIssueId, type },
    });

    if (existing) return existing;

    const row = await tx.issueRelation.create({
      data: { fromIssueId, toIssueId: data.toIssueId, type },
    });

    if (inverse) {
      await tx.issueRelation.upsert({
        where: {
          fromIssueId_toIssueId_type: {
            fromIssueId: data.toIssueId,
            toIssueId: fromIssueId,
            type: inverse,
          },
        },
        create: {
          fromIssueId: data.toIssueId,
          toIssueId: fromIssueId,
          type: inverse,
        },
        update: {},
      });
    }

    return row;
  });

  // "A duplicates B" closes A: it is the same work, tracked on B.
  if (type === "DUPLICATE" || type === "DUPLICATED_BY") {
    const duplicate = type === "DUPLICATE" ? from : to;
    const canonical = type === "DUPLICATE" ? to : from;

    await markDuplicate(teamId, duplicate.id, canonical.id, actorId);
  }

  return created;
}

/**
 * Close `duplicateId` as cancelled and move everyone watching it onto the canonical issue,
 * so nobody loses track of the work.
 */
async function markDuplicate(
  teamId: string,
  duplicateId: string,
  canonicalId: string,
  actorId?: string,
) {
  const duplicate = await prisma.issue.findFirst({
    where: { id: duplicateId, teamId },
    select: { status: true },
  });

  if (!duplicate) return;
  const subscribers = await prisma.issueSubscription.findMany({
    where: { issueId: duplicateId },
    select: { userId: true },
  });

  if (subscribers.length) {
    await prisma.issueSubscription.createMany({
      data: subscribers.map((row) => ({
        issueId: canonicalId,
        userId: row.userId,
      })),
      skipDuplicates: true,
    });
  }
  if (duplicate.status !== "CANCELLED") {
    const cancelled = await prisma.workflowStatus.findFirst({
      where: { teamId, type: "canceled" },
      orderBy: { position: "asc" },
    });

    await prisma.issue.update({
      where: { id: duplicateId },
      data: {
        status: "CANCELLED",
        ...(cancelled ? { workflowStatusId: cancelled.id } : {}),
        revision: { increment: 1 },
      },
    });
    if (actorId) {
      const { recordActivity } = await import("@/lib/services/surface");

      await recordActivity(
        duplicateId,
        actorId,
        "status",
        duplicate.status,
        "CANCELLED",
      );
      await recordActivity(duplicateId, actorId, "duplicate", "", canonicalId);
    }
  }
}

/** Convenience used by the "Mark as duplicate" action. */
export async function markIssueAsDuplicate(
  teamId: string,
  duplicateId: string,
  canonicalId: string,
  role: Role,
  actorId?: string,
) {
  const { assertRole } = await import("@/lib/rbac");

  assertRole(role, "MEMBER");

  return addRelation(
    teamId,
    duplicateId,
    { toIssueId: canonicalId, type: "DUPLICATE" },
    actorId,
  );
}

export async function removeRelation(teamId: string, relationId: string) {
  // Synthetic parent/child rows: `parent:<childId>` clears that issue's parent.
  if (relationId.startsWith("parent:")) {
    const childId = relationId.slice("parent:".length);
    const { setParent } = await import("@/lib/services/sub-issues");
    const child = await prisma.issue.findFirst({
      where: { id: childId, teamId },
      select: { creatorId: true },
    });

    if (!child) throw new AuthError("Relation not found", "NOT_FOUND", 404);
    await setParent(teamId, childId, null, "MEMBER", child.creatorId);

    return;
  }
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

/** Open issues in the team whose title looks like `title`. Used to warn before filing a duplicate. */
export async function findSimilarIssues(
  teamId: string,
  title: string,
  opts: { excludeId?: string; limit?: number } = {},
) {
  const clean = title.trim();

  if (clean.length < 4) return [];
  const candidates = await prisma.issue.findMany({
    where: {
      teamId,
      archivedAt: null,
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
    },
    select: { id: true, number: true, title: true, status: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  return rankSimilar(clean, candidates, opts.limit ?? 5);
}

/** For each issue id: is it blocked by an issue that is not finished yet? */
export async function blockedIssueIds(teamId: string, issueIds: string[]) {
  if (!issueIds.length) return new Set<string>();
  const rows = await prisma.issueRelation.findMany({
    where: {
      type: "BLOCKED_BY",
      fromIssueId: { in: issueIds },
      fromIssue: { teamId },
      toIssue: { status: { notIn: ["DONE", "CANCELLED"] } },
    },
    select: { fromIssueId: true },
  });

  return new Set(rows.map((row) => row.fromIssueId));
}

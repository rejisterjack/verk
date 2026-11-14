import type { Role } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { assertRole } from "@/lib/rbac";
import {
  checkParentChain,
  MAX_SUBISSUE_DEPTH,
  subIssueProgress,
} from "@/lib/sub-issues";

const personSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

/** `parentId` and its parents, nearest first. Stops on a loop or after the depth limit. */
export async function loadAncestors(
  teamId: string,
  parentId: string,
): Promise<string[]> {
  const chain: string[] = [];
  const seen = new Set<string>();
  let current: string | null = parentId;

  while (current && !seen.has(current) && chain.length <= MAX_SUBISSUE_DEPTH) {
    seen.add(current);
    chain.push(current);
    const row: { parentId: string | null } | null =
      await prisma.issue.findFirst({
        where: { id: current, teamId },
        select: { parentId: true },
      });

    current = row?.parentId ?? null;
  }

  return chain;
}

/**
 * Throw unless `parentId` can be the parent of `issueId` (null: an issue not created yet).
 * Returns the parent so callers can inherit from it.
 */
export async function assertValidParent(
  teamId: string,
  issueId: string | null,
  parentId: string,
) {
  const parent = await prisma.issue.findFirst({
    where: { id: parentId, teamId, archivedAt: null },
    select: { id: true, number: true, projectId: true, cycleId: true },
  });

  if (!parent) throw new AuthError("Parent issue not found", "NOT_FOUND", 404);
  if (issueId && parent.id === issueId) {
    throw new AuthError(
      "An issue cannot be its own parent",
      "BAD_REQUEST",
      400,
    );
  }
  const problem = checkParentChain(
    await loadAncestors(teamId, parent.id),
    issueId,
  );

  if (problem) throw new AuthError(problem, "BAD_REQUEST", 400);

  return parent;
}

/** Set (or with `null`, clear) an issue's parent. Re-parenting replaces the old parent. */
export async function setParent(
  teamId: string,
  issueId: string,
  parentId: string | null,
  role: Role,
  userId: string,
) {
  assertRole(role, "MEMBER");
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
    select: { id: true, parentId: true },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);
  if (issue.parentId === parentId) return getIssue(teamId, issueId);
  if (parentId) await assertValidParent(teamId, issueId, parentId);

  await prisma.issue.update({
    where: { id: issueId },
    data: { parentId, revision: { increment: 1 } },
  });

  try {
    const { recordActivity } = await import("@/lib/services/surface");
    const { dispatchWebhooks } = await import("@/lib/services/webhooks");
    const numbers = await prisma.issue.findMany({
      where: {
        id: { in: [issue.parentId, parentId].filter(Boolean) as string[] },
      },
      select: { id: true, number: true },
    });
    const label = (id: string | null) =>
      id ? `#${numbers.find((row) => row.id === id)?.number ?? "?"}` : "";

    await recordActivity(
      issueId,
      userId,
      "parent",
      label(issue.parentId),
      label(parentId),
    );
    await dispatchWebhooks(teamId, "issue.updated", { id: issueId, parentId });
  } catch {
    // non-blocking
  }

  return getIssue(teamId, issueId);
}

function getIssue(teamId: string, issueId: string) {
  return prisma.issue.findFirst({ where: { id: issueId, teamId } });
}

/** The parent, the live sub-issues and how many are finished. */
export async function listSubIssues(teamId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
    select: {
      id: true,
      parent: {
        select: { id: true, number: true, title: true, status: true },
      },
    },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);
  const children = await prisma.issue.findMany({
    where: { parentId: issueId, teamId, archivedAt: null },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      priority: true,
      assignee: { select: personSelect },
    },
    orderBy: { number: "asc" },
  });

  return {
    parent: issue.parent,
    children,
    progress: subIssueProgress(children),
  };
}

/** A new issue under `parentId`. Project, cycle and labels are copied unless given. */
export async function createSubIssue(
  teamId: string,
  parentId: string,
  userId: string,
  input: Record<string, unknown>,
) {
  const parent = await prisma.issue.findFirst({
    where: { id: parentId, teamId, archivedAt: null },
    select: { id: true },
  });

  if (!parent) throw new AuthError("Parent issue not found", "NOT_FOUND", 404);
  const { createIssue } = await import("@/lib/services/issues");

  return createIssue(teamId, userId, { ...input, parentId });
}

/**
 * When the last open sub-issue finishes, finish the parent too, if the team asked for that.
 * Walks up: finishing a parent may in turn finish its own parent.
 */
export async function completeParentIfDone(
  teamId: string,
  parentId: string | null,
  userId: string,
) {
  let current = parentId;
  let guard = 0;

  while (current && guard < MAX_SUBISSUE_DEPTH) {
    guard += 1;
    const [team, parent, children] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        select: { autoCloseParent: true },
      }),
      prisma.issue.findFirst({
        where: { id: current, teamId, archivedAt: null },
        select: { id: true, status: true, parentId: true },
      }),
      prisma.issue.findMany({
        where: { parentId: current, teamId, archivedAt: null },
        select: { status: true },
      }),
    ]);

    if (!team?.autoCloseParent || !parent || !children.length) return;
    if (parent.status === "DONE" || parent.status === "CANCELLED") return;
    const progress = subIssueProgress(children);

    // Every child cancelled is not "done work": leave the parent for a person to decide.
    if (progress.done !== progress.total) return;
    if (children.every((child) => child.status === "CANCELLED")) return;

    const { updateIssue } = await import("@/lib/services/issues");

    // updateIssue calls this again for the grandparent, so one step is enough.
    await updateIssue(teamId, parent.id, { status: "DONE" }, "MEMBER", userId);

    return;
  }
}

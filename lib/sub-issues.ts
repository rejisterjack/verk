/** Pure helpers for sub-issues (parent / child issues). */

export const MAX_SUBISSUE_DEPTH = 8;

/**
 * Check a proposed parent. `ancestors` is the parent followed by its parents, nearest first.
 * `issueId` is the issue getting the parent (null for an issue that does not exist yet).
 * Returns a message when the move is not allowed, otherwise null.
 */
export function checkParentChain(
  ancestors: string[],
  issueId: string | null,
  maxDepth = MAX_SUBISSUE_DEPTH,
): string | null {
  if (issueId && ancestors.includes(issueId)) {
    return "That would make an issue its own ancestor";
  }
  if (ancestors.length >= maxDepth) {
    return `Sub-issues can be nested up to ${maxDepth} levels`;
  }

  return null;
}

export type SubIssueRow = { status: string };

/** Done and cancelled sub-issues both count as finished work. */
export function subIssueProgress(children: SubIssueRow[]) {
  const total = children.length;
  const done = children.filter(
    (child) => child.status === "DONE" || child.status === "CANCELLED",
  ).length;

  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

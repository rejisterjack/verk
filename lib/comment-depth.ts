/** Root comments are depth 1. A reply may nest two more times (depth 3). */

export const MAX_COMMENT_DEPTH = 3;

export type CommentParent = {
  id: string;
  parentId: string | null;
};

/** Depth of a new comment whose parent is `parentId` (null = root). */
export function nextCommentDepth(
  parentId: string | null | undefined,
  byId: Map<string, CommentParent>,
): number {
  if (!parentId) return 1;

  let depth = 1;
  let current: string | null = parentId;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current)) break;
    seen.add(current);
    depth += 1;
    current = byId.get(current)?.parentId ?? null;
  }

  return depth;
}

export function replyExceedsMax(depth: number): boolean {
  return depth > MAX_COMMENT_DEPTH;
}

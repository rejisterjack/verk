import { describe, expect, it } from "vitest";

import {
  MAX_COMMENT_DEPTH,
  nextCommentDepth,
  replyExceedsMax,
  type CommentParent,
} from "@/lib/comment-depth";

function chain(ids: string[]): Map<string, CommentParent> {
  const map = new Map<string, CommentParent>();

  ids.forEach((id, index) => {
    map.set(id, { id, parentId: index === 0 ? null : ids[index - 1]! });
  });

  return map;
}

describe("nextCommentDepth", () => {
  it("treats a root comment as depth 1", () => {
    expect(nextCommentDepth(null, new Map())).toBe(1);
  });

  it("allows a reply through depth 3 and rejects depth 4", () => {
    const map = chain(["root", "level2", "level3"]);

    expect(nextCommentDepth("root", map)).toBe(2);
    expect(nextCommentDepth("level2", map)).toBe(3);
    expect(replyExceedsMax(nextCommentDepth("level2", map))).toBe(false);
    expect(nextCommentDepth("level3", map)).toBe(4);
    expect(replyExceedsMax(nextCommentDepth("level3", map))).toBe(true);
    expect(MAX_COMMENT_DEPTH).toBe(3);
  });
});

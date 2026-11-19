import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  groupReactions,
  isValidEmoji,
  MAX_DISTINCT_EMOJI,
  PICKER_EMOJIS,
  QUICK_REACTIONS,
} from "@/lib/reactions";

describe("isValidEmoji", () => {
  it.each([
    "👍",
    "❤️",
    "🎉",
    "👍🏽", // skin tone
    "👨‍👩‍👧", // ZWJ family
    "🏳️‍🌈", // ZWJ flag
    "🇮🇳", // regional-indicator flag
    "1️⃣", // keycap
    "✅",
    "⚠️",
  ])("accepts %s", (emoji) => {
    expect(isValidEmoji(emoji)).toBe(true);
  });

  it.each([
    "",
    "a",
    "1",
    "ok",
    "👍👍", // two emoji
    "👍 ", // trailing space
    "<script>",
    "👍<b>",
    "x".repeat(64),
  ])("rejects %j", (value) => {
    expect(isValidEmoji(value)).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isValidEmoji(undefined)).toBe(false);
    expect(isValidEmoji(null)).toBe(false);
    expect(isValidEmoji(5)).toBe(false);
  });

  it("accepts every emoji the picker offers", () => {
    for (const emoji of [...PICKER_EMOJIS, ...QUICK_REACTIONS]) {
      expect(isValidEmoji(emoji), emoji).toBe(true);
    }
  });
});

describe("groupReactions", () => {
  it("counts per emoji in first-used order and flags mine", () => {
    const groups = groupReactions(
      [
        { userId: "a", emoji: "🎉" },
        { userId: "b", emoji: "👍" },
        { userId: "c", emoji: "🎉" },
        { userId: "me", emoji: "👍" },
      ],
      "me",
    );

    expect(groups).toEqual([
      { emoji: "🎉", count: 2, mine: false },
      { emoji: "👍", count: 2, mine: true },
    ]);
  });

  it("is empty for no reactions and never marks anything mine for anonymous", () => {
    expect(groupReactions([], "me")).toEqual([]);
    expect(groupReactions([{ userId: "a", emoji: "👍" }])[0]!.mine).toBe(false);
  });
});

const db = vi.hoisted(() => ({
  comment: { findFirst: vi.fn() },
  commentReaction: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));

import { toggleReaction } from "@/lib/services/surface";

describe("toggleReaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.comment.findFirst.mockResolvedValue({ id: "c1" });
    db.commentReaction.findFirst.mockResolvedValue(null);
    db.commentReaction.findMany.mockResolvedValue([]);
  });

  it("accepts any emoji, not just the old five", async () => {
    await expect(toggleReaction("t1", "c1", "u1", "🦄")).resolves.toEqual({
      on: true,
    });
    expect(db.commentReaction.create).toHaveBeenCalledWith({
      data: { commentId: "c1", userId: "u1", emoji: "🦄" },
    });
  });

  it("rejects text so a reaction cannot carry a message", async () => {
    await expect(toggleReaction("t1", "c1", "u1", "hello")).rejects.toThrow(
      /not an emoji/,
    );
    expect(db.commentReaction.create).not.toHaveBeenCalled();
  });

  it("removes the reaction when it is toggled again", async () => {
    db.commentReaction.findFirst.mockResolvedValue({ id: "r1" });
    await expect(toggleReaction("t1", "c1", "u1", "👍")).resolves.toEqual({
      on: false,
    });
    expect(db.commentReaction.delete).toHaveBeenCalledWith({
      where: { id: "r1" },
    });
  });

  it("404s on a comment from another team", async () => {
    db.comment.findFirst.mockResolvedValue(null);
    await expect(toggleReaction("t1", "c1", "u1", "👍")).rejects.toThrow(
      /not found/i,
    );
    expect(db.comment.findFirst.mock.calls[0]![0].where.issue).toEqual({
      teamId: "t1",
    });
  });

  it("caps the number of different emoji on a comment", async () => {
    db.commentReaction.findMany.mockResolvedValue(
      Array.from({ length: MAX_DISTINCT_EMOJI }, (_, i) => ({ emoji: `e${i}` })),
    );
    await expect(toggleReaction("t1", "c1", "u1", "🦄")).rejects.toThrow(
      /at most/,
    );
  });

  it("still lets people add to an emoji that is already on a full comment", async () => {
    db.commentReaction.findMany.mockResolvedValue(
      Array.from({ length: MAX_DISTINCT_EMOJI }, (_, i) =>
        i === 0 ? { emoji: "🦄" } : { emoji: `e${i}` },
      ),
    );
    await expect(toggleReaction("t1", "c1", "u1", "🦄")).resolves.toEqual({
      on: true,
    });
  });
});
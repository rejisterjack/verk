/** Emoji reactions: validation and grouping. Pure, so it is shared by server and client. */

/** Shown first in the picker and as the quick-react bar. */
export const QUICK_REACTIONS = ["👍", "❤️", "🎉", "👀", "🚀"] as const;

/** The picker grid. Anything else can still be pasted into the picker's text field. */
export const PICKER_EMOJIS = [
  "👍",
  "👎",
  "❤️",
  "🎉",
  "🚀",
  "👀",
  "🙏",
  "👏",
  "🔥",
  "💯",
  "✅",
  "❌",
  "⚠️",
  "💡",
  "🤔",
  "😄",
  "😂",
  "😅",
  "😍",
  "😢",
  "😮",
  "🙌",
  "💪",
  "🐛",
  "🔧",
  "📌",
  "⏳",
  "🏁",
  "🧪",
  "📝",
  "🔒",
  "⭐",
] as const;

/** A comment can carry this many different emoji. */
export const MAX_DISTINCT_EMOJI = 20;

const MAX_EMOJI_LENGTH = 32;

function graphemes(value: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });

    return [...segmenter.segment(value)].map((part) => part.segment);
  }

  return [...value];
}

/**
 * True for exactly one emoji: a pictograph (with skin tone, ZWJ sequence or variation
 * selector), a flag, or a keycap such as 1️⃣. Plain letters, digits and text are refused,
 * so a reaction can never carry a message or markup.
 */
export function isValidEmoji(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value || value.length > MAX_EMOJI_LENGTH) return false;
  if (graphemes(value).length !== 1) return false;

  return (
    /\p{Extended_Pictographic}/u.test(value) ||
    /^\p{Regional_Indicator}{2}$/u.test(value) ||
    /^[0-9#*]\uFE0F?\u20E3$/u.test(value)
  );
}

export type ReactionRow = { userId: string; emoji: string };
export type ReactionGroup = { emoji: string; count: number; mine: boolean };

/** One entry per emoji, in the order each emoji was first used. */
export function groupReactions(
  rows: ReactionRow[],
  currentUserId?: string | null,
): ReactionGroup[] {
  const groups = new Map<string, ReactionGroup>();

  for (const row of rows) {
    const group = groups.get(row.emoji) ?? {
      emoji: row.emoji,
      count: 0,
      mine: false,
    };

    group.count += 1;
    if (currentUserId && row.userId === currentUserId) group.mine = true;
    groups.set(row.emoji, group);
  }

  return [...groups.values()];
}

/** Cheap "is this probably a duplicate" matching. No extension or vendor needed. */

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "not",
  "when",
  "from",
  "that",
  "this",
  "are",
  "was",
  "can",
  "cant",
  "does",
  "doesnt",
  "should",
  "issue",
  "bug",
  "error",
  "problem",
  "fix",
  "add",
  "new",
  "update",
  "please",
]);

/** Lower-case words of 3+ letters or digits, minus filler. Order is kept, repeats dropped. */
export function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

  return [...new Set(words)];
}

/** Jaccard overlap of the two titles' words, 0 to 1. */
export function titleSimilarity(a: string, b: string): number {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));

  if (!left.size || !right.size) return 0;
  let shared = 0;

  for (const word of left) if (right.has(word)) shared += 1;

  return shared / (left.size + right.size - shared);
}

export const SIMILARITY_THRESHOLD = 0.34;

export function rankSimilar<T extends { title: string }>(
  title: string,
  candidates: T[],
  limit = 5,
): (T & { score: number })[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: titleSimilarity(title, candidate.title),
    }))
    .filter((candidate) => candidate.score >= SIMILARITY_THRESHOLD)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

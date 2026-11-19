/**
 * A small line-level diff (longest common subsequence) for showing what changed between two
 * versions of a document. Lines only: that is enough for prose and avoids a dependency. Inputs
 * are capped, because LCS is quadratic.
 */

export type DiffLine = { kind: "same" | "add" | "del"; text: string };

const MAX_LINES = 1500;

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n").slice(0, MAX_LINES);
  const b = after.split("\n").slice(0, MAX_LINES);
  const n = a.length;
  const m = b.length;
  // lcs[i][j] = length of the LCS of a[i..] and b[j..]
  const lcs: Uint16Array[] = Array.from(
    { length: n + 1 },
    () => new Uint16Array(m + 1),
  );

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i]![j] =
        a[i] === b[j]
          ? lcs[i + 1]![j + 1]! + 1
          : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i]! });
      i += 1;
      j += 1;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      out.push({ kind: "del", text: a[i]! });
      i += 1;
    } else {
      out.push({ kind: "add", text: b[j]! });
      j += 1;
    }
  }
  while (i < n) out.push({ kind: "del", text: a[i++]! });
  while (j < m) out.push({ kind: "add", text: b[j++]! });

  return out;
}

/** Counts for a one-line summary: "+3 −1". */
export function diffStats(lines: DiffLine[]): {
  added: number;
  removed: number;
} {
  return {
    added: lines.filter((line) => line.kind === "add").length,
    removed: lines.filter((line) => line.kind === "del").length,
  };
}

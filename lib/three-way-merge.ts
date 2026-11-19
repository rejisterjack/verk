/**
 * A line-based three-way merge, for two people editing the same document. `base` is the version
 * both started from, `mine` is what I am saving, `theirs` is what someone else saved in the
 * meantime. Changes in different places merge cleanly; changes to the same lines are reported as
 * conflicts, never silently dropped. Lines only, no dependency (same trade-off as `line-diff.ts`).
 */

export type MergeResult =
  | { ok: true; text: string; autoMerged: boolean }
  | { ok: false; conflicts: number; text: string };

const MAX_LINES = 2000;

/** Matching blocks between two line arrays via LCS: pairs of equal-line indexes, ascending. */
function matches(a: string[], b: string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
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
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) i += 1;
    else j += 1;
  }

  return pairs;
}

type Hunk = {
  /** Range in base replaced, [start, end). */
  start: number;
  end: number;
  /** What replaces it. */
  lines: string[];
};

/** The edits that turn `base` into `other`, as non-overlapping hunks over base. */
function hunks(base: string[], other: string[]): Hunk[] {
  const out: Hunk[] = [];
  const pairs = matches(base, other);
  let bi = 0;
  let oi = 0;

  for (const [pb, po] of [
    ...pairs,
    [base.length, other.length] as [number, number],
  ]) {
    if (pb > bi || po > oi) {
      out.push({ start: bi, end: pb, lines: other.slice(oi, po) });
    }
    bi = pb + 1;
    oi = po + 1;
  }

  return out;
}

const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every((line, index) => line === b[index]);

export function mergeThreeWay(
  baseText: string,
  mineText: string,
  theirsText: string,
): MergeResult {
  if (mineText === theirsText)
    return { ok: true, text: mineText, autoMerged: false };
  if (mineText === baseText)
    return { ok: true, text: theirsText, autoMerged: false };
  if (theirsText === baseText)
    return { ok: true, text: mineText, autoMerged: false };

  const base = baseText.split("\n");
  const mine = mineText.split("\n");
  const theirs = theirsText.split("\n");

  if (
    base.length > MAX_LINES ||
    mine.length > MAX_LINES ||
    theirs.length > MAX_LINES
  ) {
    return { ok: false, conflicts: 1, text: mineText };
  }
  const a = hunks(base, mine);
  const b = hunks(base, theirs);
  const out: string[] = [];
  let pos = 0;
  let conflicts = 0;
  let ia = 0;
  let ib = 0;

  while (ia < a.length || ib < b.length) {
    const ha = a[ia];
    const hb = b[ib];
    const next = Math.min(ha?.start ?? Infinity, hb?.start ?? Infinity);

    out.push(...base.slice(pos, next));
    pos = next;

    // Only one side touches this spot: take its change.
    const overlaps =
      ha &&
      hb &&
      // Two edits collide when their base ranges overlap, or both insert at the same point.
      (ha.start < hb.end || ha.start === hb.start) &&
      (hb.start < ha.end || hb.start === ha.start);

    if (!overlaps) {
      const take = !hb || (ha && ha.start <= hb.start) ? ha! : hb;

      out.push(...take.lines);
      pos = take.end;
      if (take === ha) ia += 1;
      else ib += 1;
      continue;
    }
    // Both changed overlapping lines. Identical changes are not a conflict.
    if (
      same(ha.lines, hb.lines) &&
      ha.start === hb.start &&
      ha.end === hb.end
    ) {
      out.push(...ha.lines);
    } else {
      conflicts += 1;
      out.push(
        "<<<<<<< yours",
        ...ha.lines,
        "=======",
        ...hb.lines,
        ">>>>>>> theirs",
      );
    }
    pos = Math.max(ha.end, hb.end);
    ia += 1;
    ib += 1;
    // Any further hunks swallowed by the same overlap region move along with it.
    while (a[ia] && a[ia]!.start < pos) ia += 1;
    while (b[ib] && b[ib]!.start < pos) ib += 1;
  }
  out.push(...base.slice(pos));
  const text = out.join("\n");

  return conflicts
    ? { ok: false, conflicts, text }
    : { ok: true, text, autoMerged: true };
}

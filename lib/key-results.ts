export type KeyResultScore = {
  target: number;
  current: number;
};

/** Average completion across key results, from 0 to 1. A zero target counts as done when current is too. */
export function keyResultProgress(rows: KeyResultScore[]) {
  if (!rows.length) return null;
  const scores = rows.map((row) => {
    if (row.target <= 0) return row.current <= 0 ? 1 : 0;

    return Math.min(1, Math.max(0, row.current / row.target));
  });

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

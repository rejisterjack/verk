export type PersonCapacity = {
  userId: string;
  points: number;
  daysOff: number;
};

/** Person rows are a split of the cycle. They may not add up past the team cap when one is set. */
export function capacityOverflow(
  teamCap: number | null | undefined,
  rows: PersonCapacity[],
) {
  const used = rows.reduce((sum, row) => sum + Math.max(0, row.points), 0);

  if (teamCap == null) return null;
  if (used <= teamCap) return null;

  return { used, teamCap };
}

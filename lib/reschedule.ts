/**
 * Moving a project on the roadmap. Shifting keeps the project's length: both dates move by the
 * same number of days, and a missing date stays missing. All in UTC, so a daylight-saving change
 * never shifts a date by a day.
 */

const DAY_MS = 86_400_000;

export const MAX_SHIFT_DAYS = 3660;

export function shiftDate(date: Date | null, days: number): Date | null {
  if (!date) return null;

  return new Date(date.getTime() + days * DAY_MS);
}

export function shiftRange(
  range: { start: Date | null; target: Date | null },
  days: number,
): { start: Date | null; target: Date | null } {
  if (!Number.isInteger(days) || Math.abs(days) > MAX_SHIFT_DAYS) {
    throw new RangeError(
      "Shift must be a whole number of days within ten years",
    );
  }

  return {
    start: shiftDate(range.start, days),
    target: shiftDate(range.target, days),
  };
}

/** Whole days between two dates (later minus earlier), ignoring the time of day. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());

  return Math.round((b - a) / DAY_MS);
}

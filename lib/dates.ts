import { AuthError } from "@/lib/errors";

/** A planned start may not fall after the due date. Actual `startedAt` is separate. */
export function assertStartNotAfterDue(
  start?: Date | null,
  due?: Date | null,
) {
  if (start && due && start.getTime() > due.getTime()) {
    throw new AuthError(
      "Start date must be on or before the due date",
      "BAD_REQUEST",
      400,
    );
  }
}

export function monthRange(from: Date) {
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));

  return { start, end };
}

export function shiftMonth(from: Date, delta: number) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + delta, 1));
}

/** Issues that touch a calendar day via planned start or due date. */
export function issuesOnDay<T extends { startDate: Date | null; dueDate: Date | null }>(
  issues: T[],
  day: Date,
) {
  const start = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const end = start + 86_400_000;

  return issues.filter((issue) => {
    const marks = [issue.startDate, issue.dueDate].filter(
      (value): value is Date => value instanceof Date,
    );

    return marks.some((mark) => {
      const time = mark.getTime();

      return time >= start && time < end;
    });
  });
}

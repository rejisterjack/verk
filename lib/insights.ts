/**
 * An insights query is "measure by dimension, over issues that match a filter". This file is the
 * pure part: the allowed choices, the numbers behind each estimate, and the aggregation over rows
 * already fetched. `lib/services/insights.ts` fetches the rows (guest-scoped, capped).
 */

export const MEASURES = [
  { id: "count", label: "Issues", unit: "issues" },
  { id: "points", label: "Estimate points", unit: "points" },
  { id: "avg_age_days", label: "Average age", unit: "days" },
  { id: "avg_cycle_days", label: "Average time to finish", unit: "days" },
  {
    id: "avg_lead_days",
    label: "Average time from start to finish",
    unit: "days",
  },
  { id: "cfd", label: "Cumulative flow", unit: "issues" },
  { id: "cycle_time", label: "Cycle time distribution", unit: "days" },
] as const;

export const DIMENSIONS = [
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "assignee", label: "Assignee" },
  { id: "project", label: "Project" },
  { id: "cycle", label: "Cycle" },
  { id: "label", label: "Label" },
  { id: "created_week", label: "Week created" },
  { id: "completed_week", label: "Week completed" },
] as const;

export type MeasureId = (typeof MEASURES)[number]["id"];
export type DimensionId = (typeof DIMENSIONS)[number]["id"];

export function isMeasure(value: unknown): value is MeasureId {
  return MEASURES.some((m) => m.id === value);
}
export function isDimension(value: unknown): value is DimensionId {
  return DIMENSIONS.some((d) => d.id === value);
}

/** Story points per estimate value. T-shirt sizes use a Fibonacci-like mapping. */
const POINTS: Record<string, number> = {
  NONE: 0,
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  EIGHT: 8,
  THIRTEEN: 13,
  SIXTEEN: 16,
  XS: 1,
  S: 2,
  M: 3,
  L: 5,
  XL: 8,
  XXL: 13,
};

export function pointsFor(estimate: string): number {
  return POINTS[estimate] ?? 0;
}

export type InsightRow = {
  status: string;
  priority: string;
  estimate: string;
  assignee: string | null;
  project: string | null;
  cycle: string | null;
  labels: string[];
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type Bucket = {
  key: string;
  label: string;
  value: number;
  count: number;
};

const DAY = 86_400_000;

/** ISO date of the Monday starting the week that contains `date` (UTC). */
export function weekStart(date: Date): string {
  const copy = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const shift = (copy.getUTCDay() + 6) % 7;

  copy.setUTCDate(copy.getUTCDate() - shift);

  return copy.toISOString().slice(0, 10);
}

function keysFor(row: InsightRow, dimension: DimensionId): string[] {
  switch (dimension) {
    case "status":
      return [row.status];
    case "priority":
      return [row.priority];
    case "assignee":
      return [row.assignee ?? "Unassigned"];
    case "project":
      return [row.project ?? "No project"];
    case "cycle":
      return [row.cycle ?? "No cycle"];
    case "label":
      // An issue with two labels counts once under each; with none, under "No label".
      return row.labels.length ? row.labels : ["No label"];
    case "created_week":
      return [weekStart(row.createdAt)];
    case "completed_week":
      return row.completedAt ? [weekStart(row.completedAt)] : [];
  }
}

/** The number a row contributes to a measure, or null when it has no value for it. */
function contribution(
  row: InsightRow,
  measure: MeasureId,
  now: Date,
): number | null {
  switch (measure) {
    case "count":
      return 1;
    case "points":
      return pointsFor(row.estimate);
    case "avg_age_days":
      return Math.max(0, (now.getTime() - row.createdAt.getTime()) / DAY);
    case "avg_cycle_days":
      return row.completedAt
        ? Math.max(
            0,
            (row.completedAt.getTime() - row.createdAt.getTime()) / DAY,
          )
        : null;
    case "avg_lead_days":
      return row.completedAt && row.startedAt
        ? Math.max(
            0,
            (row.completedAt.getTime() - row.startedAt.getTime()) / DAY,
          )
        : null;
    case "cfd":
    case "cycle_time":
      return null;
  }
}

const isAverage = (measure: MeasureId) => measure.startsWith("avg_");

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Group `rows` by `dimension` and compute `measure` for each group. Sums for count and points,
 * means for the `avg_*` measures (rows without a value are skipped, not counted as zero).
 * Time dimensions are returned oldest first; the rest largest first.
 */
export function aggregate(
  rows: InsightRow[],
  measure: MeasureId,
  dimension: DimensionId,
  now: Date = new Date(),
): Bucket[] {
  const groups = new Map<string, { sum: number; n: number; rows: number }>();

  for (const row of rows) {
    const value = contribution(row, measure, now);

    for (const key of keysFor(row, dimension)) {
      const group = groups.get(key) ?? { sum: 0, n: 0, rows: 0 };

      group.rows += 1;
      if (value !== null) {
        group.sum += value;
        group.n += 1;
      }
      groups.set(key, group);
    }
  }
  const buckets: Bucket[] = [...groups].map(([key, group]) => ({
    key,
    label: key,
    count: group.rows,
    value: isAverage(measure)
      ? group.n
        ? round(group.sum / group.n)
        : 0
      : round(group.sum),
  }));

  return dimension.endsWith("_week")
    ? buckets.sort((a, b) => a.key.localeCompare(b.key))
    : buckets.sort(
        (a, b) => b.value - a.value || a.label.localeCompare(b.label),
      );
}

/** Overall figure for the same measure across every row. */
export function total(
  rows: InsightRow[],
  measure: MeasureId,
  now: Date = new Date(),
): number {
  const values = rows
    .map((row) => contribution(row, measure, now))
    .filter((value): value is number => value !== null);

  if (!values.length) return 0;
  const sum = values.reduce((a, b) => a + b, 0);

  return round(isAverage(measure) ? sum / values.length : sum);
}

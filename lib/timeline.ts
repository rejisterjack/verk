/**
 * Layout maths for the timeline view. Pure: dates in, percentages out, so the page only has to
 * position boxes. Everything is computed in UTC days to avoid daylight-saving drift.
 */

const DAY = 86_400_000;

export type TimelineZoom = "month" | "quarter" | "year";

export const ZOOMS: { id: TimelineZoom; label: string; days: number }[] = [
  { id: "month", label: "Month", days: 45 },
  { id: "quarter", label: "Quarter", days: 120 },
  { id: "year", label: "Year", days: 400 },
];

export type TimelineItem = {
  id: string;
  label: string;
  /** Null start with a set end draws a short bar ending at `end`. */
  start: Date | null;
  end: Date | null;
};

export type PlacedBar = {
  id: string;
  /** Left edge and width as percentages of the visible range, clipped to 0..100. */
  left: number;
  width: number;
  /** Starts before / ends after the visible window. */
  clippedStart: boolean;
  clippedEnd: boolean;
  /** Only an end date (or only a start) is known. */
  approximate: boolean;
};

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}

export function diffDays(a: Date, b: Date): number {
  return Math.round(
    (startOfUtcDay(b).getTime() - startOfUtcDay(a).getTime()) / DAY,
  );
}

export type Range = { from: Date; to: Date };

/** The visible window: `zoom.days` long, starting a little before `anchor` (default today). */
export function visibleRange(
  zoom: TimelineZoom,
  anchor: Date = new Date(),
): Range {
  const days = ZOOMS.find((z) => z.id === zoom)?.days ?? 120;
  const from = addDays(startOfUtcDay(anchor), -Math.round(days / 6));

  return { from, to: addDays(from, days) };
}

/** Move the window by half its length, forward or back. */
export function shiftRange(range: Range, direction: 1 | -1): Range {
  const half = Math.round(diffDays(range.from, range.to) / 2);

  return {
    from: addDays(range.from, direction * half),
    to: addDays(range.to, direction * half),
  };
}

/** Parse `?from=YYYY-MM-DD`, returning null for anything else. */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Position one bar. Returns null when it lies wholly outside the window or has no dates. */
export function placeBar(item: TimelineItem, range: Range): PlacedBar | null {
  const total = Math.max(1, diffDays(range.from, range.to));
  let start = item.start ? startOfUtcDay(item.start) : null;
  let end = item.end ? startOfUtcDay(item.end) : null;

  if (!start && !end) return null;
  const approximate = !start || !end;

  // One known date: draw a two-week stub ending (or starting) there.
  if (!start && end) start = addDays(end, -14);
  if (!end && start) end = addDays(start, 14);
  if (!start || !end) return null;
  if (end.getTime() < start.getTime()) [start, end] = [end, start];

  const startOffset = diffDays(range.from, start);
  const endOffset = diffDays(range.from, end) + 1; // the end day is inclusive

  if (endOffset <= 0 || startOffset >= total) return null;
  const left = Math.max(0, startOffset);
  const right = Math.min(total, endOffset);

  return {
    id: item.id,
    left: (left / total) * 100,
    width: Math.max(0.8, ((right - left) / total) * 100),
    clippedStart: startOffset < 0,
    clippedEnd: endOffset > total,
    approximate,
  };
}

/** Where "today" falls in the window, as a percentage, or null when it is outside. */
export function todayPosition(
  range: Range,
  now: Date = new Date(),
): number | null {
  const total = Math.max(1, diffDays(range.from, range.to));
  const offset = diffDays(range.from, now);

  if (offset < 0 || offset > total) return null;

  return (offset / total) * 100;
}

export type Tick = { left: number; label: string; major: boolean };

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Month gridlines (and week gridlines when zoomed in) across the window. */
export function ticks(range: Range, zoom: TimelineZoom): Tick[] {
  const total = Math.max(1, diffDays(range.from, range.to));
  const out: Tick[] = [];
  let cursor = new Date(
    Date.UTC(range.from.getUTCFullYear(), range.from.getUTCMonth(), 1),
  );

  while (cursor.getTime() <= range.to.getTime()) {
    const offset = diffDays(range.from, cursor);

    if (offset >= 0 && offset <= total) {
      out.push({
        left: (offset / total) * 100,
        label:
          cursor.getUTCMonth() === 0 || out.length === 0
            ? `${MONTHS[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`
            : MONTHS[cursor.getUTCMonth()]!,
        major: cursor.getUTCMonth() === 0,
      });
    }
    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    );
  }
  if (zoom === "month") {
    // Weekly marks on Mondays, unlabelled, so a 6-week window still has a scale.
    let day = new Date(range.from);

    while (day.getUTCDay() !== 1) day = addDays(day, 1);
    for (; day.getTime() <= range.to.getTime(); day = addDays(day, 7)) {
      out.push({
        left: (diffDays(range.from, day) / total) * 100,
        label: "",
        major: false,
      });
    }
  }

  return out;
}

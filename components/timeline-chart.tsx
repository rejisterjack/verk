import type { TimelineSection } from "@/lib/services/timeline";

import NextLink from "next/link";

import {
  isoDay,
  placeBar,
  type Range,
  ticks,
  type TimelineZoom,
  todayPosition,
} from "@/lib/timeline";

const TONE_CLASS = {
  done: "bg-success/70",
  active: "bg-accent",
  planned: "bg-foreground/30",
  off: "bg-danger/70",
} as const;

/**
 * A read-only Gantt-style chart. Pure server rendering: every bar is an absolutely positioned
 * box whose left/width come from `placeBar`, so there is no client JavaScript.
 */
export function TimelineChart({
  sections,
  range,
  zoom,
}: {
  sections: TimelineSection[];
  range: Range;
  zoom: TimelineZoom;
}) {
  const gridlines = ticks(range, zoom);
  const today = todayPosition(range);
  const shown = sections.filter((section) => section.rows.length > 0);

  if (!shown.length) {
    return (
      <p className="px-4 py-8 text-[13px] text-muted">
        Nothing is scheduled in this window. Give a project a start and target
        date, or move the window.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="sticky top-0 z-10 flex border-b border-separator bg-surface text-[11px] text-muted">
          <div className="w-56 shrink-0 px-4 py-1.5" />
          <div className="relative h-7 flex-1">
            {gridlines
              .filter((tick) => tick.label)
              .map((tick) => (
                <span
                  key={`${tick.left}-${tick.label}`}
                  className="absolute top-1.5 whitespace-nowrap pl-1"
                  style={{ left: `${tick.left}%` }}
                >
                  {tick.label}
                </span>
              ))}
          </div>
        </div>

        {shown.map((section) => (
          <section key={section.key}>
            <h2 className="border-b border-separator bg-surface/60 px-4 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">
              {section.title}
            </h2>
            {section.rows.map((row) => {
              const bar = placeBar(row, range);

              return (
                <div
                  key={row.id}
                  className="flex h-[var(--row-h)] items-center border-b border-separator/60 text-[13px] hover:bg-default/40"
                >
                  <NextLink
                    className="w-56 shrink-0 truncate px-4 hover:underline"
                    href={row.href}
                    title={
                      row.sublabel
                        ? `${row.label} · ${row.sublabel}`
                        : row.label
                    }
                  >
                    {row.label}
                  </NextLink>
                  <div className="relative h-full flex-1">
                    {gridlines.map((tick) => (
                      <span
                        key={`${row.id}-${tick.left}-${tick.label}`}
                        aria-hidden
                        className={
                          tick.label
                            ? "absolute inset-y-0 w-px bg-separator/70"
                            : "absolute inset-y-0 w-px bg-separator/30"
                        }
                        style={{ left: `${tick.left}%` }}
                      />
                    ))}
                    {today !== null ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 w-px bg-accent/70"
                        style={{ left: `${today}%` }}
                      />
                    ) : null}
                    {bar ? (
                      <NextLink
                        className={`absolute top-1/2 h-4 -translate-y-1/2 ${TONE_CLASS[row.tone]} ${
                          bar.clippedStart ? "rounded-l-none" : "rounded-l"
                        } ${bar.clippedEnd ? "rounded-r-none" : "rounded-r"} ${
                          bar.approximate ? "opacity-60" : ""
                        }`}
                        href={row.href}
                        style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                        title={`${row.label}: ${
                          row.start ? isoDay(row.start) : "?"
                        } → ${row.end ? isoDay(row.end) : "?"}`}
                      >
                        <span className="sr-only">{row.label}</span>
                      </NextLink>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}

import NextLink from "next/link";
import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { TimelineChart } from "@/components/timeline-chart";
import { requireTeamBySlug } from "@/lib/rbac";
import { getTimeline } from "@/lib/services/timeline";
import {
  addDays,
  diffDays,
  isoDay,
  parseDay,
  shiftRange,
  visibleRange,
  ZOOMS,
  type TimelineZoom,
} from "@/lib/timeline";

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ zoom?: string; from?: string }>;
}) {
  const { teamSlug } = await params;
  const query = await searchParams;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "GUEST");
  } catch {
    notFound();
  }

  const zoom: TimelineZoom =
    ZOOMS.find((z) => z.id === query.zoom)?.id ?? "quarter";
  const fresh = visibleRange(zoom);
  const fromParam = parseDay(query.from);
  const range = fromParam
    ? {
        from: fromParam,
        to: addDays(fromParam, diffDays(fresh.from, fresh.to)),
      }
    : fresh;
  const { sections, undated } = await getTimeline(
    teamCtx.team.id,
    teamSlug,
    range,
  );

  const base = `/t/${teamSlug}/timeline`;
  const href = (next: { zoom?: TimelineZoom; from?: Date | null }) => {
    const search = new URLSearchParams();

    search.set("zoom", next.zoom ?? zoom);
    if (next.from) search.set("from", isoDay(next.from));

    return `${base}?${search.toString()}`;
  };
  const linkClass =
    "rounded px-2 py-1 text-[12px] text-muted hover:bg-default hover:text-foreground";

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          <>
            <NextLink
              className={linkClass}
              href={href({ from: shiftRange(range, -1).from })}
            >
              ← Earlier
            </NextLink>
            <NextLink className={linkClass} href={href({})}>
              Today
            </NextLink>
            <NextLink
              className={linkClass}
              href={href({ from: shiftRange(range, 1).from })}
            >
              Later →
            </NextLink>
            <span className="mx-1 h-4 w-px bg-separator" />
            {ZOOMS.map((option) => (
              <NextLink
                key={option.id}
                className={`${linkClass} ${
                  option.id === zoom
                    ? "bg-accent/15 font-medium !text-accent"
                    : ""
                }`}
                href={href({ zoom: option.id, from: fromParam })}
              >
                {option.label}
              </NextLink>
            ))}
          </>
        }
        description={`${isoDay(range.from)} → ${isoDay(range.to)}${
          undated
            ? ` · ${undated} project${undated === 1 ? "" : "s"} without dates`
            : ""
        }`}
        title="Timeline"
      />
      <TimelineChart range={range} sections={sections} zoom={zoom} />
    </div>
  );
}

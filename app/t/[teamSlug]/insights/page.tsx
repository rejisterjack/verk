import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import { insightCounts } from "@/lib/services/surface";

function WeeklyBars({
  weekly,
}: {
  weekly: { label: string; created: number; done: number }[];
}) {
  const max = Math.max(
    1,
    ...weekly.flatMap((week) => [week.created, week.done]),
  );
  const height = 120;
  const barWidth = 18;
  const gap = 10;
  const groupWidth = barWidth * 2 + 6;
  const width = weekly.length * (groupWidth + gap);

  return (
    <div className="overflow-x-auto rounded-xl border border-separator p-4">
      <div className="mb-3 flex items-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />{" "}
          Created
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent/40" />{" "}
          Completed
        </span>
      </div>
      <svg
        aria-label="Weekly created and completed issue counts"
        className="max-w-full text-foreground"
        height={height + 28}
        role="img"
        viewBox={`0 0 ${width} ${height + 28}`}
        width={width}
      >
        {weekly.map((week, index) => {
          const x = index * (groupWidth + gap);
          const createdH = (week.created / max) * height;
          const doneH = (week.done / max) * height;

          return (
            <g key={week.label}>
              <rect
                className="fill-accent"
                height={createdH}
                rx={2}
                width={barWidth}
                x={x}
                y={height - createdH}
              />
              <rect
                className="fill-accent/40"
                height={doneH}
                rx={2}
                width={barWidth}
                x={x + barWidth + 6}
                y={height - doneH}
              />
              <text
                className="fill-muted text-[10px]"
                textAnchor="middle"
                x={x + groupWidth / 2}
                y={height + 16}
              >
                {week.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "GUEST");
  } catch {
    notFound();
  }
  const stats = await insightCounts(teamCtx.team.id);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader description="Last 8 weeks" title="Insights" />
      <p className="text-sm">
        Created {stats.created} · Completed {stats.done}
      </p>
      <WeeklyBars weekly={stats.weekly} />
      <ul className="space-y-1 text-sm">
        {Object.entries(stats.byStatus).map(([status, count]) => (
          <li key={status} className="flex justify-between">
            <span>{status}</span>
            <span>{count}</span>
          </li>
        ))}
      </ul>
      <ul className="space-y-2 text-sm">
        {stats.cycles.map((cycle) => (
          <li key={cycle.id} className="flex justify-between">
            <span>{cycle.name}</span>
            <span>{cycle.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

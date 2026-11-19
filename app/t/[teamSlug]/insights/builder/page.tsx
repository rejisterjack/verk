import NextLink from "next/link";
import { notFound } from "next/navigation";

import { InsightReports } from "@/components/insight-reports";
import { ViewToolbar } from "@/components/page-header";
import { DIMENSIONS, isDimension, isMeasure, MEASURES } from "@/lib/insights";
import { requireTeamBySlug } from "@/lib/rbac";
import { roleAtLeast } from "@/lib/roles";
import { listReports } from "@/lib/services/insight-reports";
import { runInsight } from "@/lib/services/insights";

const selectClass =
  "h-8 rounded-md border border-separator bg-transparent px-2 text-[13px]";

/**
 * A small chart builder: choose what to measure and how to group it, and optionally narrow the
 * issues with the same filter JSON the issues page uses (Issues → Filters shows it in the URL).
 */
export default async function InsightsBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{
    measure?: string;
    dimension?: string;
    filter?: string;
  }>;
}) {
  const { teamSlug } = await params;
  const query = await searchParams;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "GUEST");
  } catch {
    notFound();
  }
  const measure = isMeasure(query.measure) ? query.measure : "count";
  const dimension = isDimension(query.dimension) ? query.dimension : "status";
  const unit = MEASURES.find((m) => m.id === measure)!.unit;
  let result: Awaited<ReturnType<typeof runInsight>> | null = null;
  let error: string | null = null;

  try {
    result = await runInsight(teamCtx.team.id, teamCtx.user.id, {
      measure,
      dimension,
      filter: query.filter || undefined,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not run that query";
  }
  const max = Math.max(1, ...(result?.buckets.map((b) => b.value) ?? [1]));
  const reports = await listReports(teamCtx.team.id, teamCtx.user.id);

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        description="Measure issues by status, person, project, label or week."
        title="Insights builder"
      />
      <form
        action={`/t/${teamSlug}/insights/builder`}
        className="flex flex-wrap items-end gap-3 border-b border-separator px-4 py-3 text-[12px]"
        method="get"
      >
        <label className="flex flex-col gap-1 text-muted">
          Measure
          <select className={selectClass} defaultValue={measure} name="measure">
            {MEASURES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Group by
          <select
            className={selectClass}
            defaultValue={dimension}
            name="dimension"
          >
            {DIMENSIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-muted">
          Filter (optional JSON)
          <input
            className={`${selectClass} font-mono`}
            defaultValue={query.filter ?? ""}
            name="filter"
            placeholder='{"field":"status","op":"is","value":"TODO"}'
          />
        </label>
        <button
          className="h-8 rounded-md border border-separator px-3 text-[13px] hover:bg-default"
          type="submit"
        >
          Run
        </button>
      </form>

      <InsightReports
        canSave={teamCtx.membership.role !== "GUEST"}
        current={{ measure, dimension, filter: query.filter ?? "" }}
        isAdmin={roleAtLeast(teamCtx.membership.role, "ADMIN")}
        reports={reports.map((report) => ({
          id: report.id,
          name: report.name,
          measure: report.measure,
          dimension: report.dimension,
          filter: report.filter,
          shared: report.shared,
          mine: report.ownerId === teamCtx.user.id,
        }))}
        teamSlug={teamSlug}
      />

      {error ? <p className="px-4 py-4 text-sm text-danger">{error}</p> : null}
      {result ? (
        <div className="px-4 py-4 text-sm">
          <p className="text-muted">
            {result.rows} issue{result.rows === 1 ? "" : "s"}
            {result.truncated ? " (the newest 20,000)" : ""} · overall{" "}
            {result.total} {unit}
          </p>
          {result.buckets.length === 0 ? (
            <p className="mt-3 text-muted">No data for that selection.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {result.buckets.slice(0, 40).map((bucket) => (
                <li key={bucket.key} className="flex items-center gap-3">
                  <span
                    className="w-40 shrink-0 truncate text-[13px]"
                    title={bucket.label}
                  >
                    {bucket.label}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-default">
                    <div
                      className="h-full bg-accent"
                      style={{
                        width: `${Math.max(1, (bucket.value / max) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-[12px] text-muted">
                    {bucket.value} {unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      <p className="px-4 pb-6 text-[12px] text-muted">
        <NextLink
          className="text-accent hover:underline"
          href={`/t/${teamSlug}/insights`}
        >
          ← Back to insights
        </NextLink>
      </p>
    </div>
  );
}

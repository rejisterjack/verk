"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteInsightReportAction,
  saveInsightReportAction,
} from "@/lib/actions/insight-reports";

const inputClass =
  "h-7 rounded-md border border-separator bg-transparent px-2 text-[12px]";

type Report = {
  id: string;
  name: string;
  measure: string;
  dimension: string;
  filter: string;
  shared: boolean;
  mine: boolean;
};

/** Saved reports for the insights builder: click one to run it, save the current query as a new one. */
export function InsightReports({
  teamSlug,
  reports,
  current,
  canSave,
  isAdmin,
}: {
  teamSlug: string;
  reports: Report[];
  current: { measure: string; dimension: string; filter: string };
  canSave: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function hrefFor(report: Pick<Report, "measure" | "dimension" | "filter">) {
    const params = new URLSearchParams({
      measure: report.measure,
      dimension: report.dimension,
    });

    if (report.filter) params.set("filter", report.filter);

    return `/t/${teamSlug}/insights/builder?${params}`;
  }

  return (
    <section className="space-y-2 border-b border-separator px-4 py-3 text-[12px]">
      <p className="font-medium text-muted">Saved reports</p>
      {reports.length === 0 ? (
        <p className="text-muted">None yet. Run a query, then save it below.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {reports.map((report) => (
            <li
              key={report.id}
              className="inline-flex items-center gap-1 rounded-md border border-separator px-2 py-1"
            >
              <NextLink className="hover:text-accent" href={hrefFor(report)}>
                {report.name}
              </NextLink>
              {!report.shared ? (
                <span className="text-[11px] text-muted">private</span>
              ) : null}
              {report.mine || isAdmin ? (
                <button
                  aria-label={`Delete ${report.name}`}
                  className="text-muted hover:text-danger"
                  disabled={pending}
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteInsightReportAction(
                        teamSlug,
                        report.id,
                      );

                      if ("error" in result) setError(result.error ?? null);
                      else router.refresh();
                    })
                  }
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canSave ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);

            data.set("measure", current.measure);
            data.set("dimension", current.dimension);
            data.set("filter", current.filter);
            setError(null);
            startTransition(async () => {
              const result = await saveInsightReportAction(teamSlug, data);

              if ("error" in result) setError(result.error ?? null);
              else {
                form.reset();
                router.refresh();
              }
            });
          }}
        >
          <input
            required
            className={inputClass}
            maxLength={80}
            name="name"
            placeholder="Name this report"
          />
          <label className="inline-flex items-center gap-1 text-muted">
            <input defaultChecked name="shared" type="checkbox" />
            Share with the team
          </label>
          <button
            className="h-7 rounded-md border border-separator px-2 hover:bg-default disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            Save this query
          </button>
        </form>
      ) : null}
      {error ? (
        <p className="text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

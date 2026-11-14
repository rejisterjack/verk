import NextLink from "next/link";
import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { AUDIT_ACTIONS } from "@/lib/audit";
import { setAuditRetentionAction } from "@/lib/actions/retention";
import { RETENTION_CHOICES } from "@/lib/privacy";
import { requireTeamBySlug } from "@/lib/rbac";
import { listAuditLog } from "@/lib/services/audit";

type Search = { action?: string; from?: string; to?: string; cursor?: string };

const inputClass =
  "h-8 rounded-md border border-separator bg-transparent px-2 text-[13px]";

export default async function AuditSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<Search>;
}) {
  const { teamSlug } = await params;
  const query = await searchParams;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "ADMIN");
  } catch {
    notFound();
  }
  const { entries, nextCursor } = await listAuditLog(teamCtx.team.id, query);
  const base = `/t/${teamSlug}/settings/audit`;
  const keep = new URLSearchParams();

  for (const key of ["action", "from", "to"] as const) {
    if (query[key]) keep.set(key, query[key]!);
  }
  const older = new URLSearchParams(keep);

  if (nextCursor) older.set("cursor", nextCursor);

  return (
    <div className="max-w-4xl px-4 py-3">
      <ViewToolbar
        description="Who changed members, API keys, webhooks, settings and exports. Admins only."
        title="Audit log"
      />
      <div className="mb-3 flex flex-wrap items-end gap-3 text-[12px]">
        <form
          action={setAuditRetentionAction.bind(null, teamSlug)}
          className="flex items-end gap-2"
        >
          <label className="flex flex-col gap-1 text-muted">
            Keep entries for
            <select
              className={inputClass}
              defaultValue={String(teamCtx.team.auditRetentionDays)}
              name="days"
            >
              {RETENTION_CHOICES.map((choice) => (
                <option key={choice.days} value={choice.days}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" type="submit" variant="secondary">
            Save
          </Button>
        </form>
        <a
          className="h-8 rounded-md border border-separator px-3 text-[13px] leading-8 hover:bg-default"
          href={`/api/teams/${teamCtx.team.id}/audit/export`}
        >
          Download CSV
        </a>
      </div>
      <form
        action={base}
        className="mb-3 flex flex-wrap items-end gap-2 text-[12px]"
        method="get"
      >
        <label className="flex flex-col gap-1 text-muted">
          Action
          <select
            className={inputClass}
            defaultValue={query.action ?? ""}
            name="action"
          >
            <option value="">All actions</option>
            {Object.entries(AUDIT_ACTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-muted">
          From
          <input
            className={inputClass}
            defaultValue={query.from ?? ""}
            name="from"
            type="date"
          />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          To
          <input
            className={inputClass}
            defaultValue={query.to ?? ""}
            name="to"
            type="date"
          />
        </label>
        <button
          className="h-8 rounded-md border border-separator px-3 text-[13px] hover:bg-default"
          type="submit"
        >
          Filter
        </button>
      </form>

      {entries.length === 0 ? (
        <p className="py-6 text-[13px] text-muted">Nothing logged yet.</p>
      ) : (
        <ul className="divide-y divide-separator rounded-lg border border-separator text-[13px]">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-3 py-2">
              <time
                className="w-36 shrink-0 text-[12px] text-muted"
                dateTime={entry.createdAt.toISOString()}
                title={entry.createdAt.toISOString()}
              >
                {entry.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              </time>
              <div className="min-w-0 flex-1">
                <p>{entry.summary}</p>
                <p className="text-[12px] text-muted">
                  {entry.actorLabel || "System"} ·{" "}
                  {AUDIT_ACTIONS[entry.action as keyof typeof AUDIT_ACTIONS] ??
                    entry.action}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {nextCursor ? (
        <NextLink
          className="mt-3 inline-block text-[13px] text-accent hover:underline"
          href={`${base}?${older.toString()}`}
        >
          Older entries →
        </NextLink>
      ) : null}
    </div>
  );
}

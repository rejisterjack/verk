import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";

const linkClass =
  "inline-flex h-8 items-center rounded-md border border-separator px-3 text-[13px] hover:bg-default";

export default async function ExportSettingsPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "MEMBER");
  } catch {
    notFound();
  }
  const api = `/api/teams/${teamCtx.team.id}/export`;

  return (
    <div className="max-w-2xl px-4 py-3">
      <ViewToolbar
        description="Download every issue in this team. CSV opens in Excel or Sheets; JSON keeps the same fields for scripts."
        title="Export"
      />
      <div className="space-y-4 text-sm">
        <section className="space-y-2">
          <h2 className="font-medium">Issues</h2>
          <div className="flex flex-wrap gap-2">
            <a className={linkClass} href={`${api}?format=csv`}>
              Download CSV
            </a>
            <a className={linkClass} href={`${api}?format=json`}>
              Download JSON
            </a>
            <a className={linkClass} href={`${api}?format=csv&archived=1`}>
              CSV including archived
            </a>
          </div>
          <p className="text-[12px] text-muted">
            Includes key, title, description, status, priority, estimate, due
            date, assignee, creator, project, cycle, labels, parent and
            timestamps. Capped at 20,000 issues; the file name says when it was
            cut. Spreadsheet formulas in titles are neutralized.
          </p>
        </section>
        <section>
          <h2 className="font-medium">API</h2>
          <p className="mt-1 text-[12px] text-muted">
            <code>GET {api}?format=csv|json&amp;archived=1</code> with a session
            or an API key (member role or above).
          </p>
        </section>
      </div>
    </div>
  );
}

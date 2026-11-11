import NextLink from "next/link";
import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import * as projects from "@/lib/services/projects";

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleString("en", { month: "short", year: "2-digit" });
}

export default async function RoadmapPage({
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
  const list = await projects.listProjects(teamCtx.team.id);
  const dated = list.filter((project) => project.targetDate);

  const months = [
    ...new Set(dated.map((project) => monthKey(project.targetDate!))),
  ].sort();
  const groups = new Map<string, { name: string; projects: typeof dated }>();

  for (const project of dated) {
    const key = project.initiativeId ?? "none";
    const name = project.initiative?.name ?? "No initiative";
    const group = groups.get(key) ?? { name, projects: [] };

    group.projects.push(project);
    groups.set(key, group);
  }

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        description="Projects by initiative and month"
        title="Roadmap"
      />
      {dated.length === 0 ? (
        <p className="px-4 py-8 text-[13px] text-muted">
          No projects with a target date.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="min-w-[640px] grid gap-px border-b border-separator bg-separator"
            style={{
              gridTemplateColumns: `10rem repeat(${months.length}, minmax(7rem, 1fr))`,
            }}
          >
            <div className="bg-surface px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
              Initiative
            </div>
            {months.map((month) => (
              <div
                key={month}
                className="bg-surface px-3 py-2 text-center text-xs font-medium text-muted"
              >
                {monthLabel(month)}
              </div>
            ))}
            {[...groups.entries()].map(([groupKey, group]) => (
              <div key={groupKey} className="contents">
                <div className="bg-background px-3 py-3 text-sm font-medium">
                  {group.name}
                </div>
                {months.map((month) => {
                  const cell = group.projects.filter(
                    (project) => monthKey(project.targetDate!) === month,
                  );

                  return (
                    <div
                      key={`${groupKey}-${month}`}
                      className="relative min-h-16 bg-background px-2 py-2"
                    >
                      <div className="pointer-events-none absolute inset-y-3 left-1/2 w-px bg-separator/70" />
                      <ul className="relative space-y-1">
                        {cell.map((project) => (
                          <li key={project.id}>
                            <NextLink
                              className="block rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-xs font-medium text-foreground hover:bg-accent/20"
                              href={`/t/${teamSlug}/projects/${project.id}`}
                            >
                              {project.name}
                            </NextLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

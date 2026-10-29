import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import * as projects from "@/lib/services/projects";

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
  const groups = new Map<string, { name: string; projects: typeof dated }>();

  for (const project of dated) {
    const key = project.initiativeId ?? "none";
    const name = project.initiative?.name ?? "No initiative";
    const group = groups.get(key) ?? { name, projects: [] };

    group.projects.push(project);
    groups.set(key, group);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        description="Projects by initiative, then target month."
        title="Roadmap"
      />
      {[...groups.values()].map((group) => (
        <section key={group.name} className="mb-6">
          <h2 className="text-sm font-semibold">{group.name}</h2>
          <ul className="mt-2 space-y-2">
            {group.projects.map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between rounded-lg border border-separator px-3 py-2 text-sm"
              >
                <span>{project.name}</span>
                <span className="text-muted">
                  {project.targetDate!.toISOString().slice(0, 7)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {dated.length === 0 ? (
        <p className="text-sm text-muted">No projects with a target date.</p>
      ) : null}
    </div>
  );
}

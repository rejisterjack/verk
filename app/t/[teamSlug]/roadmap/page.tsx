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

  return (
    <div className="max-w-3xl">
      <PageHeader
        description="Projects by target month. Change a date on the project page."
        title="Roadmap"
      />
      <ul className="space-y-2">
        {dated.map((project) => (
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
        {dated.length === 0 ? (
          <li className="text-sm text-muted">No projects with a target date.</li>
        ) : null}
      </ul>
    </div>
  );
}

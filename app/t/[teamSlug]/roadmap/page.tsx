import type { Health, RoadmapNode } from "@/lib/roadmap";

import NextLink from "next/link";
import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { RoadmapReschedule } from "@/components/roadmap-reschedule";
import { requireTeamBySlug } from "@/lib/rbac";
import { dependencyReport } from "@/lib/services/project-dependencies";
import { getRoadmap } from "@/lib/services/roadmap";

const HEALTH: Record<Health, { label: string; className: string }> = {
  ON_TRACK: { label: "On track", className: "text-success" },
  AT_RISK: { label: "At risk", className: "text-warning" },
  OFF_TRACK: { label: "Off track", className: "text-danger" },
};

function day(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "no date";
}

function Bar({ percent }: { percent: number }) {
  return (
    <div
      aria-label={`${percent}% done`}
      className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-default"
      role="img"
    >
      <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
    </div>
  );
}

function HealthTag({
  health,
  declared,
}: {
  health: Health;
  declared?: string;
}) {
  const info = HEALTH[health];
  const differs = declared && declared !== health;

  return (
    <span className={`text-[12px] ${info.className}`}>
      {info.label}
      {differs ? (
        <span className="text-muted">
          {" "}
          (set to {HEALTH[declared as Health]?.label.toLowerCase() ?? declared})
        </span>
      ) : null}
    </span>
  );
}

function Node({
  node,
  teamSlug,
  depth,
  canEdit,
}: {
  node: RoadmapNode;
  teamSlug: string;
  depth: number;
  canEdit: boolean;
}) {
  return (
    <li>
      <div
        className="flex flex-wrap items-center gap-3 border-b border-separator px-4 py-2 text-[13px]"
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        <span className="min-w-0 flex-1 truncate font-medium">{node.name}</span>
        <Bar percent={node.rollup.percent} />
        <span className="w-20 text-right text-[12px] text-muted">
          {node.rollup.done}/{node.rollup.total} · {node.rollup.percent}%
        </span>
        <span className="w-24 text-[12px] text-muted">{day(node.target)}</span>
        <HealthTag declared={node.declaredHealth} health={node.health} />
      </div>
      <ul>
        {node.projects.map((project) => (
          <li
            key={project.id}
            className="flex flex-wrap items-center gap-3 border-b border-separator/60 px-4 py-1.5 text-[13px]"
            style={{ paddingLeft: `${36 + depth * 20}px` }}
          >
            <NextLink
              className="min-w-0 flex-1 truncate hover:text-accent"
              href={`/t/${teamSlug}/projects/${project.id}`}
            >
              {project.name}
            </NextLink>
            <Bar percent={project.rollup.percent} />
            <span className="w-20 text-right text-[12px] text-muted">
              {project.rollup.done}/{project.rollup.total} ·{" "}
              {project.rollup.percent}%
            </span>
            <span className="w-24 text-[12px] text-muted">
              {day(project.start)} → {day(project.target)}
            </span>
            <HealthTag health={project.health} />
            {canEdit ? (
              <RoadmapReschedule
                projectId={project.id}
                start={project.start ? day(project.start) : ""}
                target={project.target ? day(project.target) : ""}
                teamSlug={teamSlug}
              />
            ) : null}
          </li>
        ))}
        {node.children.map((child) => (
          <Node
            key={child.id}
            canEdit={canEdit}
            depth={depth + 1}
            node={child}
            teamSlug={teamSlug}
          />
        ))}
      </ul>
    </li>
  );
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
  const [{ roots, loose }, report] = await Promise.all([
    getRoadmap(teamCtx.team.id, teamCtx.user.id),
    dependencyReport(teamCtx.team.id, teamCtx.user.id),
  ]);
  const empty = roots.length === 0 && loose.projects.length === 0;
  const canEdit = teamCtx.membership.role !== "GUEST";

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        description="Initiatives and their projects, with progress rolled up from issues. Health is computed from dates and progress; a manually set health is shown beside it."
        title="Roadmap"
      />
      {report.conflicts.length ? (
        <section
          aria-label="Dependency conflicts"
          className="border-b border-separator bg-warning/10 px-4 py-2 text-[12px]"
        >
          <p className="font-medium text-warning">
            {report.conflicts.length} dependency conflict
            {report.conflicts.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-1 space-y-0.5 text-muted">
            {report.conflicts.map((item) => (
              <li key={item.projectId + item.dependsOnId}>
                <NextLink
                  className="hover:text-accent"
                  href={`/t/${teamSlug}/projects/${item.projectId}`}
                >
                  {item.message}
                </NextLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {empty ? (
        <p className="px-4 py-8 text-[13px] text-muted">
          Nothing planned yet. Create an initiative and give projects a start
          and target date.
        </p>
      ) : (
        <ul className="overflow-x-auto">
          {roots.map((root) => (
            <Node
              key={root.id}
              canEdit={canEdit}
              depth={0}
              node={root}
              teamSlug={teamSlug}
            />
          ))}
          {loose.projects.length ? (
            <Node
              canEdit={canEdit}
              depth={0}
              node={loose}
              teamSlug={teamSlug}
            />
          ) : null}
        </ul>
      )}
    </div>
  );
}

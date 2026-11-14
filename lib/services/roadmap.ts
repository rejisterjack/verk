import { prisma } from "@/lib/db";
import { guestIssueScope } from "@/lib/services/guest-scope";
import {
  buildRoadmap,
  type InitiativeInput,
  type ProjectInput,
} from "@/lib/roadmap";

/**
 * The initiative tree with progress and health, for one team. Counts come from two grouped
 * queries rather than loading every issue. A limited guest only sees the projects they were
 * given, and the counts inside them.
 */
export async function getRoadmap(teamId: string, userId?: string | null) {
  const scope = await guestIssueScope(teamId, userId);
  const allowed = scope ? (scope.projectId as { in: string[] }).in : null;
  const [initiatives, projects, counts] = await Promise.all([
    prisma.initiative.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        parentId: true,
        targetDate: true,
        health: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.project.findMany({
      where: { teamId, ...(allowed ? { id: { in: allowed } } : {}) },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        targetDate: true,
        initiativeId: true,
      },
    }),
    prisma.issue.groupBy({
      by: ["projectId", "status"],
      where: {
        teamId,
        archivedAt: null,
        projectId: { not: null },
        ...(allowed ? { projectId: { in: allowed } } : {}),
      },
      _count: { _all: true },
    }),
  ]);
  const byProject = new Map<
    string,
    { total: number; done: number; started: number }
  >();

  for (const row of counts) {
    if (!row.projectId) continue;
    // Cancelled work is not part of the plan, so it counts neither as done nor as left to do.
    if (row.status === "CANCELLED") continue;
    const entry = byProject.get(row.projectId) ?? {
      total: 0,
      done: 0,
      started: 0,
    };

    entry.total += row._count._all;
    if (row.status === "DONE") entry.done += row._count._all;
    if (row.status === "IN_PROGRESS") entry.started += row._count._all;
    byProject.set(row.projectId, entry);
  }
  const toProject = (project: (typeof projects)[number]): ProjectInput => ({
    id: project.id,
    name: project.name,
    status: project.status,
    startDate: project.startDate,
    targetDate: project.targetDate,
    issues: byProject.get(project.id) ?? { total: 0, done: 0, started: 0 },
  });
  const tree: InitiativeInput[] = initiatives.map((initiative) => ({
    ...initiative,
    projects: projects
      .filter((p) => p.initiativeId === initiative.id)
      .map(toProject),
  }));
  const loose = projects.filter((p) => !p.initiativeId).map(toProject);

  return {
    roots: buildRoadmap(tree),
    loose: buildRoadmap([
      {
        id: "__loose__",
        name: "No initiative",
        parentId: null,
        targetDate: null,
        health: "ON_TRACK",
        projects: loose,
      },
    ])[0]!,
  };
}

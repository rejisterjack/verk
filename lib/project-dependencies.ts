/**
 * Project dependencies: "A depends on B" means B should finish before A starts. Pure rules, so
 * the same checks run in the service, in tests, and anywhere a graph is shown.
 *
 * An edge is `{ projectId, dependsOnId }`. A cycle (A waits on B, B waits on C, C waits on A)
 * could never be scheduled, so it is refused before a row is written.
 */

export type DependencyEdge = { projectId: string; dependsOnId: string };

export const MAX_DEPENDENCIES_PER_PROJECT = 25;

export type DependencyCheck =
  | { ok: true }
  | { ok: false; reason: "self" | "duplicate" | "cycle" | "limit" };

/** Every project reachable by following "depends on" links from `start`, not including it. */
export function reachable(edges: DependencyEdge[], start: string): Set<string> {
  const next = new Map<string, string[]>();

  for (const edge of edges) {
    next.set(edge.projectId, [
      ...(next.get(edge.projectId) ?? []),
      edge.dependsOnId,
    ]);
  }
  const seen = new Set<string>();
  const stack = [...(next.get(start) ?? [])];

  while (stack.length) {
    const id = stack.pop()!;

    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(next.get(id) ?? []));
  }
  seen.delete(start);

  return seen;
}

/** Can `projectId` be made to depend on `dependsOnId`, given the edges that already exist? */
export function checkNewDependency(
  edges: DependencyEdge[],
  projectId: string,
  dependsOnId: string,
): DependencyCheck {
  if (projectId === dependsOnId) return { ok: false, reason: "self" };
  if (
    edges.some(
      (edge) =>
        edge.projectId === projectId && edge.dependsOnId === dependsOnId,
    )
  ) {
    return { ok: false, reason: "duplicate" };
  }
  if (
    edges.filter((edge) => edge.projectId === projectId).length >=
    MAX_DEPENDENCIES_PER_PROJECT
  ) {
    return { ok: false, reason: "limit" };
  }
  // Adding project -> dependsOn closes a loop exactly when dependsOn already reaches project.
  if (reachable(edges, dependsOnId).has(projectId)) {
    return { ok: false, reason: "cycle" };
  }

  return { ok: true };
}

export const DEPENDENCY_MESSAGES: Record<
  Exclude<DependencyCheck, { ok: true }>["reason"],
  string
> = {
  self: "A project cannot depend on itself",
  duplicate: "That dependency already exists",
  cycle:
    "That would create a loop: the other project already depends on this one",
  limit: `A project can depend on at most ${MAX_DEPENDENCIES_PER_PROJECT} others`,
};

export type DatedProject = {
  id: string;
  name: string;
  status: string;
  startDate: Date | null;
  targetDate: Date | null;
};

export type DependencyConflict = {
  projectId: string;
  dependsOnId: string;
  kind:
    "starts_before_finish" | "target_before_finish" | "blocked_by_cancelled";
  message: string;
};

const iso = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Scheduling conflicts worth showing on the roadmap. A finished (COMPLETED) dependency never
 * conflicts. A cancelled one blocks forever, so it is always reported. Otherwise a project
 * conflicts when it starts, or is due, before the project it waits on is due.
 */
export function dependencyConflicts(
  projects: DatedProject[],
  edges: DependencyEdge[],
): DependencyConflict[] {
  const byId = new Map(projects.map((project) => [project.id, project]));
  const out: DependencyConflict[] = [];

  for (const edge of edges) {
    const project = byId.get(edge.projectId);
    const blocker = byId.get(edge.dependsOnId);

    if (!project || !blocker) continue;
    if (blocker.status === "COMPLETED") continue;
    if (project.status === "COMPLETED" || project.status === "CANCELLED")
      continue;
    const base = { projectId: project.id, dependsOnId: blocker.id };

    if (blocker.status === "CANCELLED") {
      out.push({
        ...base,
        kind: "blocked_by_cancelled",
        message: `${project.name} depends on ${blocker.name}, which was cancelled`,
      });
      continue;
    }
    if (!blocker.targetDate) continue;
    if (project.startDate && project.startDate < blocker.targetDate) {
      out.push({
        ...base,
        kind: "starts_before_finish",
        message: `${project.name} starts ${iso(project.startDate)}, before ${blocker.name} is due ${iso(blocker.targetDate)}`,
      });
    } else if (project.targetDate && project.targetDate < blocker.targetDate) {
      out.push({
        ...base,
        kind: "target_before_finish",
        message: `${project.name} is due ${iso(project.targetDate)}, before ${blocker.name} is due ${iso(blocker.targetDate)}`,
      });
    }
  }

  return out;
}

/**
 * The projects that are ready to start: every dependency is completed (or there are none), and
 * the project itself has not started or finished. Useful for planning "what can we begin now".
 */
export function readyProjects(
  projects: DatedProject[],
  edges: DependencyEdge[],
): string[] {
  const status = new Map(
    projects.map((project) => [project.id, project.status]),
  );

  return projects
    .filter((project) => ["BACKLOG", "PLANNED"].includes(project.status))
    .filter((project) =>
      edges
        .filter((edge) => edge.projectId === project.id)
        .every((edge) => status.get(edge.dependsOnId) === "COMPLETED"),
    )
    .map((project) => project.id);
}

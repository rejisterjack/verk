/**
 * Roadmap maths: progress rolls up from issues to projects to initiatives, and a suggested health
 * says whether the plan is slipping. Pure, so the same numbers show on the roadmap, the
 * initiatives page and in tests.
 */

export type ProjectInput = {
  id: string;
  name: string;
  status: string;
  startDate: Date | null;
  targetDate: Date | null;
  /** Issue counts by coarse status. */
  issues: { total: number; done: number; started: number };
};

export type InitiativeInput = {
  id: string;
  name: string;
  parentId: string | null;
  targetDate: Date | null;
  health: string;
  projects: ProjectInput[];
};

export type Health = "ON_TRACK" | "AT_RISK" | "OFF_TRACK";

export type Rollup = {
  /** 0..100, counting finished work out of all work. */
  percent: number;
  total: number;
  done: number;
};

const DAY = 86_400_000;

/** Done out of total, ignoring cancelled projects. A project with no issues counts as 0 of 0. */
export function projectRollup(project: ProjectInput): Rollup {
  const { total, done } = project.issues;

  return {
    total,
    done,
    percent: total
      ? Math.round((done / total) * 100)
      : project.status === "COMPLETED"
        ? 100
        : 0,
  };
}

export function combine(parts: Rollup[]): Rollup {
  const total = parts.reduce((sum, part) => sum + part.total, 0);
  const done = parts.reduce((sum, part) => sum + part.done, 0);

  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

/**
 * How far through its time window a project should be by `now`, 0..1, or null without both dates.
 */
export function expectedProgress(
  start: Date | null,
  target: Date | null,
  now: Date,
): number | null {
  if (!start || !target || target.getTime() <= start.getTime()) return null;
  const elapsed =
    (now.getTime() - start.getTime()) / (target.getTime() - start.getTime());

  return Math.min(1, Math.max(0, elapsed));
}

/**
 * A suggested health, never stored: OFF_TRACK when the target has passed with work left, or the
 * project is far behind the clock; AT_RISK when it is moderately behind or the target is within
 * two weeks with under half done; otherwise ON_TRACK.
 */
export function suggestHealth(
  project: Pick<ProjectInput, "status" | "startDate" | "targetDate"> & {
    rollup: Rollup;
  },
  now: Date = new Date(),
): Health {
  if (project.status === "COMPLETED" || project.status === "CANCELLED")
    return "ON_TRACK";
  const { target } = { target: project.targetDate };

  if (!target) return "ON_TRACK";
  const left = project.rollup.total - project.rollup.done;

  if (target.getTime() < now.getTime() && left > 0) return "OFF_TRACK";
  const expected = expectedProgress(project.startDate, target, now);
  const actual = project.rollup.total
    ? project.rollup.done / project.rollup.total
    : 0;

  if (expected !== null) {
    if (expected - actual > 0.35) return "OFF_TRACK";
    if (expected - actual > 0.15) return "AT_RISK";
  }
  const daysLeft = (target.getTime() - now.getTime()) / DAY;

  if (daysLeft <= 14 && project.rollup.total > 0 && actual < 0.5)
    return "AT_RISK";

  return "ON_TRACK";
}

const ORDER: Health[] = ["ON_TRACK", "AT_RISK", "OFF_TRACK"];

/** The worst of several healths. */
export function worstHealth(healths: Health[]): Health {
  return healths.reduce<Health>(
    (worst, health) =>
      ORDER.indexOf(health) > ORDER.indexOf(worst) ? health : worst,
    "ON_TRACK",
  );
}

export type RoadmapNode = {
  id: string;
  name: string;
  /** The initiative's own target, or the latest project target under it. */
  target: Date | null;
  rollup: Rollup;
  health: Health;
  /** What the person set, to show next to the computed one. */
  declaredHealth: string;
  projects: {
    id: string;
    name: string;
    status: string;
    start: Date | null;
    target: Date | null;
    rollup: Rollup;
    health: Health;
  }[];
  children: RoadmapNode[];
};

/** Build the initiative tree with rolled-up progress and computed health at every level. */
export function buildRoadmap(
  initiatives: InitiativeInput[],
  now: Date = new Date(),
): RoadmapNode[] {
  const byParent = new Map<string | null, InitiativeInput[]>();
  const known = new Set(initiatives.map((item) => item.id));

  for (const item of initiatives) {
    // A parent that is not in the list (deleted or hidden) makes this a root.
    const key =
      item.parentId && known.has(item.parentId) ? item.parentId : null;

    byParent.set(key, [...(byParent.get(key) ?? []), item]);
  }
  const seen = new Set<string>();

  function build(item: InitiativeInput): RoadmapNode {
    seen.add(item.id);
    const projects = item.projects.map((project) => {
      const rollup = projectRollup(project);

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        start: project.startDate,
        target: project.targetDate,
        rollup,
        health: suggestHealth({ ...project, rollup }, now),
      };
    });
    // Guard against a cycle in parent links: never descend into a node twice.
    const children = (byParent.get(item.id) ?? [])
      .filter((child) => !seen.has(child.id))
      .map(build);
    const rollup = combine([
      ...projects.map((p) => p.rollup),
      ...children.map((c) => c.rollup),
    ]);
    const targets = [item.targetDate, ...projects.map((p) => p.target)].filter(
      (date): date is Date => date !== null,
    );

    return {
      id: item.id,
      name: item.name,
      target: targets.length
        ? new Date(Math.max(...targets.map((d) => d.getTime())))
        : null,
      rollup,
      health: worstHealth([
        ...projects.map((p) => p.health),
        ...children.map((c) => c.health),
      ]),
      declaredHealth: item.health,
      projects,
      children,
    };
  }

  return (byParent.get(null) ?? [])
    .filter((item) => !seen.has(item.id))
    .map(build);
}

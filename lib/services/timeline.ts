import { prisma } from "@/lib/db";
import { addDays, type Range } from "@/lib/timeline";

export type TimelineRow = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  start: Date | null;
  end: Date | null;
  /** Drives the bar color: "done" | "active" | "planned" | "off". */
  tone: "done" | "active" | "planned" | "off";
};

export type TimelineSection = {
  key: "projects" | "cycles" | "releases" | "initiatives";
  title: string;
  rows: TimelineRow[];
};

const PROJECT_TONE = {
  COMPLETED: "done",
  IN_PROGRESS: "active",
  PLANNED: "planned",
  BACKLOG: "planned",
  CANCELLED: "off",
} as const;

/**
 * Everything dated that overlaps `range` (with a little slack so bars that just touch the edge
 * still show), grouped into sections. Undated items are left out; the page says how many.
 */
export async function getTimeline(
  teamId: string,
  teamSlug: string,
  range: Range,
): Promise<{ sections: TimelineSection[]; undated: number }> {
  const base = `/t/${teamSlug}`;
  const from = addDays(range.from, -1);
  const to = addDays(range.to, 1);

  const [projects, cycles, releases, initiatives, undatedProjects] =
    await Promise.all([
      prisma.project.findMany({
        where: {
          AND: [
            {
              OR: [{ teamId }, { contributors: { some: { teamId } } }],
            },
            {
              OR: [
                { startDate: { lte: to }, targetDate: { gte: from } },
                { startDate: null, targetDate: { gte: from, lte: to } },
                { targetDate: null, startDate: { gte: from, lte: to } },
              ],
            },
          ],
        },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          targetDate: true,
          initiative: { select: { name: true } },
        },
        orderBy: [{ startDate: "asc" }, { targetDate: "asc" }],
        take: 200,
      }),
      prisma.cycle.findMany({
        where: { teamId, startDate: { lte: to }, endDate: { gte: from } },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          isActive: true,
        },
        orderBy: { startDate: "asc" },
        take: 100,
      }),
      prisma.release.findMany({
        where: { teamId, targetDate: { gte: from, lte: to } },
        select: {
          id: true,
          name: true,
          targetDate: true,
          stage: { select: { name: true } },
        },
        orderBy: { targetDate: "asc" },
        take: 100,
      }),
      prisma.initiative.findMany({
        where: { teamId, targetDate: { gte: from, lte: to } },
        select: { id: true, name: true, targetDate: true, health: true },
        orderBy: { targetDate: "asc" },
        take: 100,
      }),
      prisma.project.count({
        where: { teamId, startDate: null, targetDate: null },
      }),
    ]);

  const now = new Date();

  return {
    undated: undatedProjects,
    sections: [
      {
        key: "initiatives",
        title: "Initiatives",
        rows: initiatives.map((i) => ({
          id: i.id,
          label: i.name,
          sublabel: i.health.replaceAll("_", " ").toLowerCase(),
          href: `${base}/initiatives`,
          start: null,
          end: i.targetDate,
          tone: i.health === "OFF_TRACK" ? "off" : "planned",
        })),
      },
      {
        key: "projects",
        title: "Projects",
        rows: projects.map((p) => ({
          id: p.id,
          label: p.name,
          sublabel: p.initiative?.name,
          href: `${base}/projects/${p.id}`,
          start: p.startDate,
          end: p.targetDate,
          tone: PROJECT_TONE[p.status],
        })),
      },
      {
        key: "cycles",
        title: "Cycles",
        rows: cycles.map((c) => ({
          id: c.id,
          label: c.name,
          href: `${base}/cycles/${c.id}`,
          start: c.startDate,
          end: c.endDate,
          tone: c.isActive
            ? "active"
            : c.endDate.getTime() < now.getTime()
              ? "done"
              : "planned",
        })),
      },
      {
        key: "releases",
        title: "Releases",
        rows: releases.map((r) => ({
          id: r.id,
          label: r.name,
          sublabel: r.stage?.name,
          href: `${base}/releases`,
          start: null,
          end: r.targetDate,
          tone: "planned",
        })),
      },
    ],
  };
}

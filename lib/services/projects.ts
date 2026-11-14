import { z } from "zod";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { guestIssueScope } from "@/lib/services/guest-scope";

const projectStatusSchema = z.enum([
  "BACKLOG",
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  summary: z.string().max(10000).optional().default(""),
  status: projectStatusSchema.optional(),
  leadId: z.string().cuid().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  targetDate: z.coerce.date().nullable().optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  initiativeId: z.string().cuid().nullable().optional(),
});

function assertDateOrder(start?: Date | null, target?: Date | null) {
  if (start && target && start.getTime() > target.getTime()) {
    throw new AuthError(
      "Start date must be on or before the target date",
      "BAD_REQUEST",
      400,
    );
  }
}

export async function listProjects(teamId: string, userId?: string | null) {
  const guestScope = await guestIssueScope(teamId, userId);
  const allowed = guestScope
    ? (guestScope.projectId as { in: string[] }).in
    : null;
  const projects = await prisma.project.findMany({
    where: { teamId, ...(allowed ? { id: { in: allowed } } : {}) },
    include: {
      lead: { select: { id: true, name: true, email: true } },
      initiative: { select: { id: true, name: true } },
      milestones: { orderBy: { sortOrder: "asc" } },
      _count: { select: { issues: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return projects;
}

export async function getProject(teamId: string, projectId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, teamId },
    include: {
      lead: { select: { id: true, name: true, email: true } },
      initiative: { select: { id: true, name: true } },
      milestones: { orderBy: { sortOrder: "asc" } },
      issues: {
        where: { archivedAt: null },
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          priority: true,
          milestoneId: true,
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { number: "desc" },
      },
    },
  });
}

export async function createProject(teamId: string, input: unknown) {
  const data = createProjectSchema.parse(input);

  assertDateOrder(data.startDate, data.targetDate);

  return prisma.project.create({
    data: {
      teamId,
      name: data.name,
      summary: data.summary ?? "",
      status: data.status ?? "BACKLOG",
      leadId: data.leadId ?? null,
      startDate: data.startDate ?? null,
      targetDate: data.targetDate ?? null,
    },
  });
}

export async function updateProject(
  teamId: string,
  projectId: string,
  input: unknown,
) {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, teamId },
  });

  if (!existing) throw new AuthError("Project not found", "NOT_FOUND", 404);
  const data = updateProjectSchema.parse(input);

  // Compare against whichever side this update doesn't touch.
  assertDateOrder(
    data.startDate !== undefined ? data.startDate : existing.startDate,
    data.targetDate !== undefined ? data.targetDate : existing.targetDate,
  );

  return prisma.project.update({
    where: { id: projectId },
    data: {
      ...data,
      revision: { increment: 1 },
    } as Prisma.ProjectUpdateInput,
  });
}

export async function deleteProject(teamId: string, projectId: string) {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, teamId },
  });

  if (!existing) throw new AuthError("Project not found", "NOT_FOUND", 404);

  await prisma.$transaction([
    prisma.issue.updateMany({
      where: { projectId },
      data: { projectId: null, milestoneId: null },
    }),
    prisma.project.delete({ where: { id: projectId } }),
  ]);
}

export async function listInitiatives(teamId: string) {
  return prisma.initiative.findMany({
    where: { teamId },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { projects: true, children: true } },
      projects: {
        select: { id: true, name: true, targetDate: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createInitiative(teamId: string, input: unknown) {
  const data = z
    .object({
      name: z.string().min(1).max(120),
      targetDate: z.coerce.date().nullable().optional(),
      parentId: z.string().cuid().nullable().optional(),
    })
    .parse(input);

  return prisma.initiative.create({
    data: {
      teamId,
      name: data.name,
      targetDate: data.targetDate ?? null,
      parentId: data.parentId ?? null,
    },
  });
}

export async function updateInitiative(
  teamId: string,
  initiativeId: string,
  input: unknown,
) {
  const existing = await prisma.initiative.findFirst({
    where: { id: initiativeId, teamId },
  });

  if (!existing) throw new AuthError("Initiative not found", "NOT_FOUND", 404);
  const data = z
    .object({
      name: z.string().min(1).max(120).optional(),
      targetDate: z.coerce.date().nullable().optional(),
      health: z.enum(["ON_TRACK", "AT_RISK", "OFF_TRACK"]).optional(),
    })
    .parse(input);

  return prisma.initiative.update({
    where: { id: initiativeId },
    data,
  });
}

export async function deleteInitiative(teamId: string, initiativeId: string) {
  const existing = await prisma.initiative.findFirst({
    where: { id: initiativeId, teamId },
  });

  if (!existing) throw new AuthError("Initiative not found", "NOT_FOUND", 404);
  await prisma.initiative.delete({ where: { id: initiativeId } });
}

export async function setInitiativeHealth(
  teamId: string,
  initiativeId: string,
  health: "ON_TRACK" | "AT_RISK" | "OFF_TRACK",
) {
  return prisma.initiative.updateMany({
    where: { id: initiativeId, teamId },
    data: { health },
  });
}

export async function createMilestone(
  teamId: string,
  projectId: string,
  input: unknown,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, teamId },
  });

  if (!project) throw new AuthError("Project not found", "NOT_FOUND", 404);
  const data = z
    .object({
      name: z.string().min(1).max(120),
      targetDate: z.coerce.date().nullable().optional(),
    })
    .parse(input);

  const max = await prisma.milestone.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });

  return prisma.milestone.create({
    data: {
      projectId,
      name: data.name,
      targetDate: data.targetDate ?? null,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
}

export async function deleteMilestone(
  teamId: string,
  projectId: string,
  milestoneId: string,
) {
  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, projectId, project: { teamId } },
  });

  if (!milestone) throw new AuthError("Milestone not found", "NOT_FOUND", 404);
  await prisma.milestone.delete({ where: { id: milestoneId } });
}

export function projectProgress(issues: { status: string }[]) {
  if (!issues.length) return 0;
  const done = issues.filter(
    (i) => i.status === "DONE" || i.status === "CANCELLED",
  ).length;

  return Math.round((done / issues.length) * 100);
}

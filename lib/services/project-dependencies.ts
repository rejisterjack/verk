import type { Role } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import {
  DEPENDENCY_MESSAGES,
  checkNewDependency,
  dependencyConflicts,
  readyProjects,
} from "@/lib/project-dependencies";
import { assertRole } from "@/lib/roles";
import { guestIssueScope } from "@/lib/services/guest-scope";

/**
 * Dependencies between projects ("A depends on B"). Writes require MEMBER or above; any non-guest
 * can read. A guest scoped to some projects only ever sees edges whose
 * both ends they can see, so a dependency never leaks the name of a project they cannot open.
 */
async function visibleProjectIds(teamId: string, userId?: string | null) {
  const scope = await guestIssueScope(teamId, userId);

  return scope ? (scope.projectId as { in: string[] }).in : null;
}

export async function listDependencies(teamId: string, userId?: string | null) {
  const allowed = await visibleProjectIds(teamId, userId);
  const rows = await prisma.projectDependency.findMany({
    where: {
      teamId,
      ...(allowed
        ? { projectId: { in: allowed }, dependsOnId: { in: allowed } }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      projectId: true,
      dependsOnId: true,
      project: { select: { name: true } },
      dependsOn: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    projectName: row.project.name,
    dependsOnId: row.dependsOnId,
    dependsOnName: row.dependsOn.name,
  }));
}

export async function addDependency(
  teamId: string,
  projectId: string,
  dependsOnId: string,
  role: Role,
) {
  assertRole(role, "MEMBER");
  const projects = await prisma.project.findMany({
    where: { teamId, id: { in: [projectId, dependsOnId] } },
    select: { id: true },
  });

  // Both ends must be in this team, so an id from another team can never be linked.
  if (projects.length !== new Set([projectId, dependsOnId]).size) {
    throw new AuthError("Project not found", "NOT_FOUND", 404);
  }
  const edges = await prisma.projectDependency.findMany({
    where: { teamId },
    select: { projectId: true, dependsOnId: true },
  });
  const check = checkNewDependency(edges, projectId, dependsOnId);

  if (!check.ok) {
    throw new AuthError(DEPENDENCY_MESSAGES[check.reason], "BAD_REQUEST", 400);
  }

  return prisma.projectDependency.create({
    data: { teamId, projectId, dependsOnId },
    select: { id: true, projectId: true, dependsOnId: true },
  });
}

export async function removeDependency(
  teamId: string,
  projectId: string,
  dependsOnId: string,
  role: Role,
) {
  assertRole(role, "MEMBER");
  const result = await prisma.projectDependency.deleteMany({
    where: { teamId, projectId, dependsOnId },
  });

  if (result.count === 0) {
    throw new AuthError("Dependency not found", "NOT_FOUND", 404);
  }
}

/** Scheduling conflicts and the projects that can start now, for the roadmap and for agents. */
export async function dependencyReport(teamId: string, userId?: string | null) {
  const allowed = await visibleProjectIds(teamId, userId);
  const [projects, edges] = await Promise.all([
    prisma.project.findMany({
      where: { teamId, ...(allowed ? { id: { in: allowed } } : {}) },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        targetDate: true,
      },
    }),
    listDependencies(teamId, userId),
  ]);

  return {
    conflicts: dependencyConflicts(projects, edges),
    ready: readyProjects(projects, edges),
  };
}

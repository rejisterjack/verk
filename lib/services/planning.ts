import { prisma } from "@/lib/db";
import { capacityOverflow } from "@/lib/capacity";
import { monthRange } from "@/lib/dates";
import { AuthError } from "@/lib/errors";
import { assertRole } from "@/lib/rbac";
import { readableIssueScope } from "@/lib/services/guest-scope";
import type { Role } from "@/lib/generated/prisma/client";

export async function listCycleCapacity(teamId: string, cycleId: string) {
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, teamId },
    select: { id: true, capacityPoints: true },
  });

  if (!cycle) throw new AuthError("Cycle not found", "NOT_FOUND", 404);
  const [members, rows] = await Promise.all([
    prisma.membership.findMany({
      where: { teamId, role: { not: "GUEST" } },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.cycleCapacity.findMany({ where: { cycleId } }),
  ]);

  return {
    teamCap: cycle.capacityPoints,
    overflow: capacityOverflow(cycle.capacityPoints, rows),
    rows: members.map((member) => {
      const saved = rows.find((row) => row.userId === member.user.id);

      return {
        userId: member.user.id,
        name: member.user.name || member.user.email,
        points: saved?.points ?? 0,
        daysOff: saved?.daysOff ?? 0,
      };
    }),
  };
}

export async function saveCycleCapacity(
  teamId: string,
  cycleId: string,
  userId: string,
  points: number,
  daysOff: number,
  role: Role,
) {
  assertRole(role, "MEMBER");
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, teamId },
    select: { id: true },
  });

  if (!cycle) throw new AuthError("Cycle not found", "NOT_FOUND", 404);
  const member = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });

  if (!member || member.role === "GUEST") {
    throw new AuthError("That person is not on this team", "BAD_REQUEST", 400);
  }
  const existing = await prisma.cycleCapacity.findMany({ where: { cycleId } });
  const next = [
    ...existing.filter((row) => row.userId !== userId),
    { userId, points, daysOff },
  ];
  const full = await prisma.cycle.findFirst({
    where: { id: cycleId },
    select: { capacityPoints: true },
  });
  const overflow = capacityOverflow(full?.capacityPoints, next);

  if (overflow) {
    throw new AuthError(
      `Person capacity ${overflow.used} is over the cycle cap ${overflow.teamCap}`,
      "BAD_REQUEST",
      400,
    );
  }

  return prisma.cycleCapacity.upsert({
    where: { cycleId_userId: { cycleId, userId } },
    create: { cycleId, userId, points, daysOff },
    update: { points, daysOff },
  });
}

export async function siblingTeams(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { workspaceId: true },
  });

  if (!team) return [];

  return prisma.team.findMany({
    where: { workspaceId: team.workspaceId, id: { not: teamId } },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

export async function linkProjectTeam(
  ownerTeamId: string,
  projectId: string,
  otherTeamId: string,
  role: Role,
) {
  assertRole(role, "ADMIN");
  const project = await prisma.project.findFirst({
    where: { id: projectId, teamId: ownerTeamId },
    include: { team: { select: { workspaceId: true } } },
  });

  if (!project) throw new AuthError("Project not found", "NOT_FOUND", 404);
  if (otherTeamId === ownerTeamId) {
    throw new AuthError("The owning team is already on this project", "BAD_REQUEST", 400);
  }
  const other = await prisma.team.findFirst({
    where: { id: otherTeamId, workspaceId: project.team.workspaceId },
    select: { id: true },
  });

  if (!other) {
    throw new AuthError(
      "A project can only link a team in the same workspace",
      "BAD_REQUEST",
      400,
    );
  }

  return prisma.projectTeam.upsert({
    where: { projectId_teamId: { projectId, teamId: otherTeamId } },
    create: { projectId, teamId: otherTeamId },
    update: {},
  });
}

export async function createKeyResult(
  teamId: string,
  initiativeId: string,
  input: { name: string; target: number; current: number; unit: string },
  role: Role,
) {
  assertRole(role, "MEMBER");
  const initiative = await prisma.initiative.findFirst({
    where: { id: initiativeId, teamId },
    select: { id: true },
  });

  if (!initiative) throw new AuthError("Initiative not found", "NOT_FOUND", 404);

  return prisma.keyResult.create({
    data: {
      initiativeId,
      name: input.name,
      target: input.target,
      current: input.current,
      unit: input.unit,
    },
  });
}

export async function listKeyResults(teamId: string, initiativeId: string) {
  return prisma.keyResult.findMany({
    where: { initiativeId, initiative: { teamId } },
    orderBy: { name: "asc" },
  });
}

/** Issues whose planned start or due date falls in the month that contains `from`. */
export async function calendarIssues(
  teamId: string,
  userId: string | null | undefined,
  from: Date,
) {
  const { start, end } = monthRange(from);
  const scope = await readableIssueScope(teamId, userId);
  const issues = await prisma.issue.findMany({
    where: {
      archivedAt: null,
      AND: [
        {
          OR: [
            { teamId },
            { project: { teamId } },
            { project: { contributors: { some: { teamId } } } },
          ],
        },
        {
          OR: [
            { startDate: { gte: start, lt: end } },
            { dueDate: { gte: start, lt: end } },
          ],
        },
        ...(scope ? [scope] : []),
      ],
    },
    select: {
      id: true,
      number: true,
      title: true,
      startDate: true,
      dueDate: true,
      status: true,
      team: { select: { slug: true } },
    },
    orderBy: { number: "asc" },
    take: 500,
  });

  return { start, end, issues };
}

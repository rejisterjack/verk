import { Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AuthError, assertRole } from "@/lib/rbac";
import { createCycleSchema, updateCycleSchema } from "@/lib/validators";

export async function listCycles(teamId: string) {
  const cycles = await prisma.cycle.findMany({
    where: { teamId },
    include: {
      _count: { select: { issues: true } },
      issues: { select: { status: true } },
    },
    orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
  });

  return cycles.map((cycle) => {
    const byStatus = cycle.issues.reduce(
      (acc, issue) => {
        acc[issue.status] = (acc[issue.status] ?? 0) + 1;

        return acc;
      },
      {} as Record<string, number>,
    );
    const { issues, ...rest } = cycle;

    void issues;

    return { ...rest, byStatus };
  });
}

export async function getCycle(teamId: string, cycleId: string) {
  return prisma.cycle.findFirst({
    where: { id: cycleId, teamId },
    include: {
      issues: {
        include: {
          assignee: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: [{ status: "asc" }, { order: "asc" }],
      },
      _count: { select: { issues: true } },
    },
  });
}

export async function createCycle(teamId: string, input: unknown, role: Role) {
  assertRole(role, "MEMBER");
  const data = createCycleSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    if (data.isActive) {
      await tx.cycle.updateMany({
        where: { teamId, isActive: true },
        data: { isActive: false },
      });
    }

    return tx.cycle.create({
      data: {
        teamId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive ?? false,
      },
    });
  });
}

export async function updateCycle(
  teamId: string,
  cycleId: string,
  input: unknown,
  role: Role,
) {
  assertRole(role, "MEMBER");
  const existing = await prisma.cycle.findFirst({
    where: { id: cycleId, teamId },
  });

  if (!existing) {
    throw new AuthError("Cycle not found", "NOT_FOUND", 404);
  }
  const data = updateCycleSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    if (data.isActive === true) {
      await tx.cycle.updateMany({
        where: { teamId, isActive: true, NOT: { id: cycleId } },
        data: { isActive: false },
      });
    }

    return tx.cycle.update({
      where: { id: cycleId },
      data,
    });
  });
}

export async function deleteCycle(teamId: string, cycleId: string, role: Role) {
  assertRole(role, "ADMIN");
  const existing = await prisma.cycle.findFirst({
    where: { id: cycleId, teamId },
  });

  if (!existing) {
    throw new AuthError("Cycle not found", "NOT_FOUND", 404);
  }
  await prisma.issue.updateMany({
    where: { cycleId },
    data: { cycleId: null },
  });
  await prisma.cycle.delete({ where: { id: cycleId } });
}

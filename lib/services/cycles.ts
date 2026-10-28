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

/** Create next recurring cycle from team settings; optionally carry over unfinished issues. */
export async function advanceDueCycles() {
  const due = await prisma.cycle.findMany({
    where: { isActive: true, endDate: { lt: new Date() } },
    include: { team: { select: { cycleCooldownDays: true } } },
  });
  const advanced: string[] = [];

  for (const cycle of due) {
    const ready = new Date(cycle.endDate);

    ready.setDate(ready.getDate() + (cycle.team.cycleCooldownDays || 0));
    if (ready > new Date()) continue;
    await advanceCycle(cycle.teamId, "OWNER");
    const { dispatchWebhooks } = await import("@/lib/services/webhooks");

    await dispatchWebhooks(cycle.teamId, "cycle.advanced", { cycleId: cycle.id });
    advanced.push(cycle.teamId);
  }

  return advanced;
}

export async function advanceCycle(
  teamId: string,
  role: Role,
  opts?: { carryOver?: boolean },
) {
  assertRole(role, "MEMBER");
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
  const weeks = team.cycleDurationWeeks || 2;
  const active = await prisma.cycle.findFirst({
    where: { teamId, isActive: true },
  });

  const start = active?.endDate ? new Date(active.endDate) : new Date();
  const end = new Date(start);

  end.setDate(end.getDate() + weeks * 7);

  const count = await prisma.cycle.count({ where: { teamId } });
  const name = `Cycle ${count + 1}`;

  return prisma.$transaction(async (tx) => {
    if (active) {
      await tx.cycle.update({
        where: { id: active.id },
        data: { isActive: false },
      });
    }

    const next = await tx.cycle.create({
      data: {
        teamId,
        name,
        startDate: start,
        endDate: end,
        isActive: true,
      },
    });

    if (opts?.carryOver !== false && active) {
      await tx.issue.updateMany({
        where: {
          teamId,
          cycleId: active.id,
          status: { notIn: ["DONE", "CANCELLED"] },
        },
        data: { cycleId: next.id },
      });
    }

    await tx.team.update({
      where: { id: teamId },
      data: { cyclesEnabled: true },
    });

    return next;
  });
}

export function cycleCompletion(issues: { status: string }[]) {
  if (!issues.length) return { total: 0, done: 0, percent: 0 };
  const done = issues.filter(
    (i) => i.status === "DONE" || i.status === "CANCELLED",
  ).length;

  return {
    total: issues.length,
    done,
    percent: Math.round((done / issues.length) * 100),
  };
}

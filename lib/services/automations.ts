import { Prisma, type Role } from "@/lib/generated/prisma/client";
import {
  type AutomationAction,
  automationInputSchema,
  fieldPatch,
  type IssueChange,
  MAX_AUTOMATIONS_PER_TEAM,
  parseActions,
  parseConditions,
  triggersFor,
} from "@/lib/automations";
import { type AuditEvent, recordAudit } from "@/lib/audit";
import { lifecycleStamps } from "@/lib/cycle-stats";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { compileFilter } from "@/lib/issue-filter";
import { assertRole } from "@/lib/roles";
import { resolveStatus } from "@/lib/services/workflow";

export async function listAutomations(teamId: string) {
  return prisma.automation.findMany({
    where: { teamId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}

/** Check every id an action mentions belongs to this team, so a rule can't reach across teams. */
async function assertActionTargets(
  teamId: string,
  actions: AutomationAction[],
) {
  const labels = new Set<string>();
  const users = new Set<string>();
  const cycles = new Set<string>();
  const projects = new Set<string>();

  for (const action of actions) {
    if (action.type === "add_label" || action.type === "remove_label") {
      labels.add(action.labelId);
    }
    if (action.type === "set_assignee" && action.assigneeId) {
      users.add(action.assigneeId);
    }
    if (action.type === "notify") users.add(action.userId);
    if (action.type === "set_cycle" && action.cycleId)
      cycles.add(action.cycleId);
    if (action.type === "set_project" && action.projectId) {
      projects.add(action.projectId);
    }
  }
  const [l, u, c, p] = await Promise.all([
    labels.size
      ? prisma.label.count({ where: { teamId, id: { in: [...labels] } } })
      : 0,
    users.size
      ? prisma.membership.count({
          where: { teamId, userId: { in: [...users] } },
        })
      : 0,
    cycles.size
      ? prisma.cycle.count({ where: { teamId, id: { in: [...cycles] } } })
      : 0,
    projects.size
      ? prisma.project.count({ where: { teamId, id: { in: [...projects] } } })
      : 0,
  ]);

  if (
    l !== labels.size ||
    u !== users.size ||
    c !== cycles.size ||
    p !== projects.size
  ) {
    throw new AuthError(
      "An action refers to something that is not in this team",
      "BAD_REQUEST",
      400,
    );
  }
}

export async function createAutomation(
  teamId: string,
  userId: string,
  input: unknown,
  role: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(role, "ADMIN");
  const data = automationInputSchema.parse(input);
  const conditions = parseConditions(data.conditions);

  await assertActionTargets(teamId, data.actions);
  const count = await prisma.automation.count({ where: { teamId } });

  if (count >= MAX_AUTOMATIONS_PER_TEAM) {
    throw new AuthError(
      `A team can have up to ${MAX_AUTOMATIONS_PER_TEAM} automations`,
      "LIMIT",
      409,
    );
  }
  const created = await prisma.automation.create({
    data: {
      teamId,
      name: data.name,
      enabled: data.enabled ?? true,
      trigger: data.trigger,
      conditions: conditions
        ? (conditions as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      actions: data.actions as unknown as Prisma.InputJsonValue,
      position: count,
      createdById: userId,
    },
  });

  await recordAudit({
    teamId,
    actor: actor ?? { id: userId },
    action: "automation.created",
    targetType: "automation",
    targetId: created.id,
    summary: `Created automation "${data.name}"`,
    metadata: { trigger: data.trigger },
  });

  return created;
}

export async function setAutomationEnabled(
  teamId: string,
  automationId: string,
  enabled: boolean,
  role: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(role, "ADMIN");
  const existing = await prisma.automation.findFirst({
    where: { id: automationId, teamId },
  });

  if (!existing) throw new AuthError("Automation not found", "NOT_FOUND", 404);
  const updated = await prisma.automation.update({
    where: { id: automationId },
    data: { enabled },
  });

  await recordAudit({
    teamId,
    actor,
    action: "automation.toggled",
    targetType: "automation",
    targetId: automationId,
    summary: `${enabled ? "Enabled" : "Disabled"} automation "${existing.name}"`,
  });

  return updated;
}

export async function deleteAutomation(
  teamId: string,
  automationId: string,
  role: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(role, "ADMIN");
  const existing = await prisma.automation.findFirst({
    where: { id: automationId, teamId },
  });

  if (!existing) throw new AuthError("Automation not found", "NOT_FOUND", 404);
  await prisma.automation.delete({ where: { id: automationId } });
  await recordAudit({
    teamId,
    actor,
    action: "automation.deleted",
    targetType: "automation",
    targetId: automationId,
    summary: `Deleted automation "${existing.name}"`,
  });
}

/** Apply one rule's actions to one issue, writing straight to the database (no re-triggering). */
async function applyActions(
  teamId: string,
  issueId: string,
  actions: AutomationAction[],
  actorId: string,
) {
  const patch = fieldPatch(actions);
  const current = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
    select: {
      status: true,
      startedAt: true,
      completedAt: true,
      canceledAt: true,
    },
  });

  if (!current) return;
  const data: Prisma.IssueUncheckedUpdateInput = {};

  if (patch.status && patch.status !== current.status) {
    const resolved = await resolveStatus(teamId, { status: patch.status });

    if (resolved) {
      data.status = resolved.status;
      data.workflowStatusId = resolved.workflowStatusId;
      Object.assign(
        data,
        lifecycleStamps(current.status, resolved.status, current, new Date()),
      );
    }
  }
  if (patch.priority) data.priority = patch.priority;
  if (patch.assigneeId !== undefined) data.assigneeId = patch.assigneeId;
  if (patch.cycleId !== undefined) data.cycleId = patch.cycleId;
  if (patch.projectId !== undefined) {
    data.projectId = patch.projectId;
    data.milestoneId = null; // a milestone belongs to its project
  }
  if (Object.keys(data).length) {
    await prisma.issue.update({
      where: { id: issueId },
      data: { ...data, revision: { increment: 1 } },
    });
  }

  for (const action of actions) {
    if (action.type === "add_label") {
      await prisma.issueLabel.createMany({
        data: [{ issueId, labelId: action.labelId }],
        skipDuplicates: true,
      });
    } else if (action.type === "remove_label") {
      await prisma.issueLabel.deleteMany({
        where: { issueId, labelId: action.labelId },
      });
    } else if (action.type === "add_comment") {
      await prisma.comment.create({
        data: { issueId, authorId: actorId, body: action.body },
      });
    } else if (action.type === "notify") {
      const { filterUnmuted } = await import("@/lib/services/notifications");
      const [recipient] = await filterUnmuted([action.userId], "SUBSCRIBED");

      if (recipient) {
        const issue = await prisma.issue.findUnique({
          where: { id: issueId },
          select: { title: true },
        });

        await prisma.notification.create({
          data: {
            userId: recipient,
            teamId,
            issueId,
            type: "SUBSCRIBED",
            title: `Automation: ${issue?.title ?? "issue"}`,
          },
        });
      }
    }
  }
}

/**
 * Run every enabled rule for the triggers this change fired. Never throws: a broken rule is
 * skipped and must not fail the issue edit that caused it. Returns how many rules ran.
 */
export async function runAutomations(
  teamId: string,
  issueId: string,
  change: IssueChange | "created",
  actorId: string,
): Promise<number> {
  let ran = 0;

  try {
    const triggers = triggersFor(change);

    if (!triggers.length) return 0;
    const rules = await prisma.automation.findMany({
      where: { teamId, enabled: true, trigger: { in: triggers } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      take: MAX_AUTOMATIONS_PER_TEAM,
    });

    for (const rule of rules) {
      try {
        const conditions = parseConditions(rule.conditions);
        const actions = parseActions(rule.actions);

        if (!actions.length) continue;
        if (conditions) {
          const where = compileFilter(conditions, { userId: actorId });
          const hit = await prisma.issue.count({
            where: { AND: [{ id: issueId, teamId }, where] },
          });

          if (!hit) continue;
        }
        await applyActions(teamId, issueId, actions, actorId);
        await prisma.automation.update({
          where: { id: rule.id },
          data: { runCount: { increment: 1 }, lastRunAt: new Date() },
        });
        ran += 1;
      } catch (error) {
        // eslint-disable-next-line no-console -- one bad rule must not break the others
        console.error("automation failed", rule.id, error);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("automations failed", error);
  }

  return ran;
}

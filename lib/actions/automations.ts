"use server";

import { revalidatePath } from "next/cache";

import { requireTeamBySlug } from "@/lib/rbac";
import * as automations from "@/lib/services/automations";

type Condition = { field: string; op: string; value?: string };

/** Build an AND-group of simple conditions from the form's rows. */
function conditionTree(conditions: Condition[]) {
  const rules = conditions
    .filter((c) => c.field && c.op)
    .map((c) => ({
      field: c.field,
      op: c.op,
      ...(c.value ? { value: c.value } : {}),
    }));

  return rules.length ? { op: "and", rules } : null;
}

export async function createAutomationAction(
  teamSlug: string,
  input: {
    name: string;
    trigger: string;
    conditions: Condition[];
    actions: unknown[];
  },
) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    await automations.createAutomation(
      team.id,
      user.id!,
      {
        name: input.name,
        trigger: input.trigger,
        conditions: conditionTree(input.conditions),
        actions: input.actions,
      },
      membership.role,
      { id: user.id!, name: user.name, email: user.email },
    );
    revalidatePath(`/t/${teamSlug}/settings/automations`);

    return { ok: true as const };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not save the automation",
    };
  }
}

export async function toggleAutomationAction(
  teamSlug: string,
  automationId: string,
  enabled: boolean,
) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    await automations.setAutomationEnabled(
      team.id,
      automationId,
      enabled,
      membership.role,
      { id: user.id!, name: user.name, email: user.email },
    );
    revalidatePath(`/t/${teamSlug}/settings/automations`);

    return { ok: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update",
    };
  }
}

export async function deleteAutomationAction(
  teamSlug: string,
  automationId: string,
) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    await automations.deleteAutomation(team.id, automationId, membership.role, {
      id: user.id!,
      name: user.name,
      email: user.email,
    });
    revalidatePath(`/t/${teamSlug}/settings/automations`);

    return { ok: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not delete",
    };
  }
}

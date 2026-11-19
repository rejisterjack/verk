"use server";

import { revalidatePath } from "next/cache";

import { requireTeamBySlug } from "@/lib/rbac";
import * as workflow from "@/lib/services/workflow";

function refresh(teamSlug: string) {
  revalidatePath(`/t/${teamSlug}`, "layout");
}

type Result = { ok: true } | { error: string };

async function run(
  teamSlug: string,
  work: (ctx: { teamId: string; role: never }) => Promise<unknown>,
): Promise<Result> {
  const { team, membership } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    await work({ teamId: team.id, role: membership.role as never });
    refresh(teamSlug);

    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong",
    };
  }
}

export async function addStatusAction(
  teamSlug: string,
  input: { name: string; type: string; color?: string },
) {
  return run(teamSlug, ({ teamId, role }) =>
    workflow.createWorkflowStatus(teamId, input, role),
  );
}

export async function updateStatusAction(
  teamSlug: string,
  statusId: string,
  input: { name?: string; color?: string; requiredFields?: string[] },
) {
  return run(teamSlug, ({ teamId, role }) =>
    workflow.updateWorkflowStatus(teamId, statusId, input, role),
  );
}

export async function reorderStatusesAction(
  teamSlug: string,
  orderedIds: string[],
) {
  return run(teamSlug, ({ teamId, role }) =>
    workflow.reorderWorkflow(teamId, orderedIds, role),
  );
}

export async function deleteStatusAction(
  teamSlug: string,
  statusId: string,
  moveToId: string | null,
) {
  return run(teamSlug, ({ teamId, role }) =>
    workflow.deleteWorkflowStatus(teamId, statusId, moveToId, role),
  );
}

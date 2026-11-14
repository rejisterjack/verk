"use server";

import { revalidatePath } from "next/cache";

import { requireTeamBySlug } from "@/lib/rbac";
import { shiftRange } from "@/lib/reschedule";
import { prisma } from "@/lib/db";
import * as projectsService from "@/lib/services/projects";

/** Move a project's dates by a whole number of days (negative = earlier). Members and above. */
export async function shiftProjectAction(
  teamSlug: string,
  projectId: string,
  days: number,
) {
  const { team } = await requireTeamBySlug(teamSlug, "MEMBER");

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, teamId: team.id },
      select: { startDate: true, targetDate: true },
    });

    if (!project) return { error: "Project not found" };
    if (!project.startDate && !project.targetDate) {
      return { error: "Give the project a start or target date first" };
    }
    const moved = shiftRange(
      { start: project.startDate, target: project.targetDate },
      days,
    );

    await projectsService.updateProject(team.id, projectId, {
      startDate: moved.start,
      targetDate: moved.target,
    });
    revalidatePath(`/t/${teamSlug}/roadmap`);
    revalidatePath(`/t/${teamSlug}/timeline`);

    return { ok: true as const };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not move the project",
    };
  }
}

/** Set a project's start and target dates directly. Empty string clears a date. */
export async function setProjectDatesAction(
  teamSlug: string,
  projectId: string,
  start: string,
  target: string,
) {
  const { team } = await requireTeamBySlug(teamSlug, "MEMBER");

  try {
    await projectsService.updateProject(team.id, projectId, {
      startDate: start ? new Date(start) : null,
      targetDate: target ? new Date(target) : null,
    });
    revalidatePath(`/t/${teamSlug}/roadmap`);
    revalidatePath(`/t/${teamSlug}/timeline`);

    return { ok: true as const };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not save the dates",
    };
  }
}

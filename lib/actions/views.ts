"use server";

import { revalidatePath } from "next/cache";

import { cleanFilter } from "@/lib/issue-filter-edit";
import { parseFilter } from "@/lib/issue-filter";
import { requireTeamBySlug } from "@/lib/rbac";
import * as viewsService from "@/lib/services/views";

/** Save an advanced filter as a pinned view. Returns the new view id, or an error message. */
export async function saveFilterViewAction(
  teamSlug: string,
  input: {
    name: string;
    filter: unknown;
    layout?: "LIST" | "BOARD";
    shared?: boolean;
  },
) {
  const { team, user } = await requireTeamBySlug(teamSlug, "MEMBER");

  try {
    const name = String(input.name ?? "").trim();

    if (!name) return { error: "Give the view a name" };
    const cleaned = cleanFilter(parseFilter(input.filter));

    if (!cleaned) return { error: "Add at least one filter first" };
    const view = await viewsService.createView(team.id, {
      name,
      filterJson: { version: 2, filter: cleaned },
      layout: input.layout === "BOARD" ? "BOARD" : "LIST",
      pinned: true,
      shared: input.shared !== false,
      ownerId: user.id,
    });

    revalidatePath(`/t/${teamSlug}`, "layout");

    return { id: view.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save the view",
    };
  }
}

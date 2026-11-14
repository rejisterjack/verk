import type { ViewLayout } from "@/lib/generated/prisma/client";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { parseFilter } from "@/lib/issue-filter";

/**
 * A saved view's `filterJson` is either the old flat object (`{ status, priority, ... }`) or
 * `{ version: 2, filter: <filter tree> }`. A v2 filter is validated on the way in, so a view
 * can never hold a filter the engine would refuse.
 */
function checkedFilterJson(value: Record<string, unknown>) {
  if (value.version === 2) {
    return { version: 2, filter: parseFilter(value.filter) };
  }

  return value;
}

const viewSchema = z.object({
  name: z.string().min(1).max(80),
  filterJson: z.record(z.string(), z.any()),
  layout: z.enum(["LIST", "BOARD"]).optional(),
  pinned: z.boolean().optional(),
  shared: z.boolean().optional(),
  ownerId: z.string().cuid().nullable().optional(),
});

export async function listViews(teamId: string) {
  return prisma.savedView.findMany({
    where: { teamId },
    orderBy: [{ pinned: "desc" }, { name: "asc" }],
  });
}

export async function createView(teamId: string, input: unknown) {
  const data = viewSchema.parse(input);

  return prisma.savedView.create({
    data: {
      teamId,
      name: data.name,
      filterJson: checkedFilterJson(data.filterJson) as never,
      layout: (data.layout ?? "LIST") as ViewLayout,
      pinned: data.pinned ?? true,
      shared: data.shared ?? true,
      ownerId: data.ownerId ?? null,
    },
  });
}

export async function updateView(
  teamId: string,
  viewId: string,
  input: unknown,
) {
  const existing = await prisma.savedView.findFirst({
    where: { id: viewId, teamId },
  });

  if (!existing) throw new AuthError("View not found", "NOT_FOUND", 404);
  const data = viewSchema.partial().parse(input);

  return prisma.savedView.update({
    where: { id: viewId },
    data: {
      ...(data.name != null ? { name: data.name } : {}),
      ...(data.filterJson != null
        ? { filterJson: checkedFilterJson(data.filterJson) as never }
        : {}),
      ...(data.layout != null ? { layout: data.layout as ViewLayout } : {}),
      ...(data.pinned != null ? { pinned: data.pinned } : {}),
    },
  });
}

export async function deleteView(teamId: string, viewId: string) {
  const existing = await prisma.savedView.findFirst({
    where: { id: viewId, teamId },
  });

  if (!existing) throw new AuthError("View not found", "NOT_FOUND", 404);
  await prisma.savedView.delete({ where: { id: viewId } });
}

import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";

export const FAVORITE_KINDS = [
  "issue",
  "project",
  "cycle",
  "doc",
  "view",
  "initiative",
] as const;
export type FavoriteKind = (typeof FAVORITE_KINDS)[number];

export const MAX_FAVORITES = 60;

const toggleSchema = z.object({
  kind: z.enum(FAVORITE_KINDS),
  targetId: z.string().min(1).max(40),
  folder: z.string().trim().max(40).nullable().optional(),
});

export type FavoriteItem = {
  id: string;
  kind: FavoriteKind;
  targetId: string;
  folder: string | null;
  position: number;
  label: string;
  href: string;
};

/** Whether `targetId` is a real thing of that kind inside the team. Also gives its label. */
async function resolveTarget(
  teamId: string,
  teamSlug: string,
  kind: FavoriteKind,
  targetId: string,
): Promise<{ label: string; href: string } | null> {
  const base = `/t/${teamSlug}`;

  switch (kind) {
    case "issue": {
      const issue = await prisma.issue.findFirst({
        where: { id: targetId, teamId },
        select: { number: true, title: true },
      });

      return issue
        ? {
            label: `${teamSlug.slice(0, 3).toUpperCase()}-${issue.number} ${issue.title}`,
            href: `${base}/issues/${issue.number}`,
          }
        : null;
    }
    case "project": {
      const row = await prisma.project.findFirst({
        where: { id: targetId, teamId },
        select: { name: true },
      });

      return row
        ? { label: row.name, href: `${base}/projects/${targetId}` }
        : null;
    }
    case "cycle": {
      const row = await prisma.cycle.findFirst({
        where: { id: targetId, teamId },
        select: { name: true },
      });

      return row
        ? { label: row.name, href: `${base}/cycles/${targetId}` }
        : null;
    }
    case "doc": {
      const row = await prisma.document.findFirst({
        where: { id: targetId, teamId },
        select: { title: true },
      });

      return row
        ? { label: row.title, href: `${base}/docs#${targetId}` }
        : null;
    }
    case "view": {
      const row = await prisma.savedView.findFirst({
        where: { id: targetId, teamId },
        select: { name: true },
      });

      return row
        ? { label: row.name, href: `${base}/issues?view=${targetId}` }
        : null;
    }
    case "initiative": {
      const row = await prisma.initiative.findFirst({
        where: { id: targetId, teamId },
        select: { name: true },
      });

      return row ? { label: row.name, href: `${base}/initiatives` } : null;
    }
  }
}

/** A user's favorites with display labels. Items whose target was deleted are dropped. */
export async function listFavorites(
  userId: string,
  teamId: string,
  teamSlug: string,
): Promise<FavoriteItem[]> {
  const rows = await prisma.favorite.findMany({
    where: { userId, teamId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  if (!rows.length) return [];

  const ids = (kind: FavoriteKind) =>
    rows.filter((row) => row.kind === kind).map((row) => row.targetId);
  const [issues, projects, cycles, docs, views, initiatives] =
    await Promise.all([
      prisma.issue.findMany({
        where: { teamId, id: { in: ids("issue") } },
        select: { id: true, number: true, title: true },
      }),
      prisma.project.findMany({
        where: { teamId, id: { in: ids("project") } },
        select: { id: true, name: true },
      }),
      prisma.cycle.findMany({
        where: { teamId, id: { in: ids("cycle") } },
        select: { id: true, name: true },
      }),
      prisma.document.findMany({
        where: { teamId, id: { in: ids("doc") } },
        select: { id: true, title: true },
      }),
      prisma.savedView.findMany({
        where: { teamId, id: { in: ids("view") } },
        select: { id: true, name: true, shared: true, ownerId: true },
      }),
      prisma.initiative.findMany({
        where: { teamId, id: { in: ids("initiative") } },
        select: { id: true, name: true },
      }),
    ]);
  const base = `/t/${teamSlug}`;
  const key = teamSlug.slice(0, 3).toUpperCase();
  const lookup = new Map<string, { label: string; href: string }>();

  for (const i of issues) {
    lookup.set(`issue:${i.id}`, {
      label: `${key}-${i.number} ${i.title}`,
      href: `${base}/issues/${i.number}`,
    });
  }
  for (const p of projects) {
    lookup.set(`project:${p.id}`, {
      label: p.name,
      href: `${base}/projects/${p.id}`,
    });
  }
  for (const c of cycles) {
    lookup.set(`cycle:${c.id}`, {
      label: c.name,
      href: `${base}/cycles/${c.id}`,
    });
  }
  for (const d of docs) {
    lookup.set(`doc:${d.id}`, { label: d.title, href: `${base}/docs#${d.id}` });
  }
  for (const v of views) {
    if (v.shared || v.ownerId === userId) {
      lookup.set(`view:${v.id}`, {
        label: v.name,
        href: `${base}/issues?view=${v.id}`,
      });
    }
  }
  for (const n of initiatives) {
    lookup.set(`initiative:${n.id}`, {
      label: n.name,
      href: `${base}/initiatives`,
    });
  }

  return rows.flatMap((row) => {
    const hit = lookup.get(`${row.kind}:${row.targetId}`);

    return hit
      ? [
          {
            id: row.id,
            kind: row.kind as FavoriteKind,
            targetId: row.targetId,
            folder: row.folder,
            position: row.position,
            ...hit,
          },
        ]
      : [];
  });
}

/** Ids of the user's favorites of one kind, for drawing filled or empty stars. */
export async function favoriteIds(
  userId: string,
  teamId: string,
  kind: FavoriteKind,
): Promise<Set<string>> {
  const rows = await prisma.favorite.findMany({
    where: { userId, teamId, kind },
    select: { targetId: true },
  });

  return new Set(rows.map((row) => row.targetId));
}

/** Add the item if it is not a favorite, remove it if it is. Returns the new state. */
export async function toggleFavorite(
  userId: string,
  teamId: string,
  teamSlug: string,
  input: unknown,
): Promise<{ on: boolean }> {
  const data = toggleSchema.parse(input);
  const existing = await prisma.favorite.findUnique({
    where: {
      userId_teamId_kind_targetId: {
        userId,
        teamId,
        kind: data.kind,
        targetId: data.targetId,
      },
    },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });

    return { on: false };
  }
  if (!(await resolveTarget(teamId, teamSlug, data.kind, data.targetId))) {
    throw new AuthError("Nothing to favorite there", "NOT_FOUND", 404);
  }
  const count = await prisma.favorite.count({ where: { userId, teamId } });

  if (count >= MAX_FAVORITES) {
    throw new AuthError(
      `You can have at most ${MAX_FAVORITES} favorites`,
      "BAD_REQUEST",
      400,
    );
  }
  const last = await prisma.favorite.aggregate({
    where: { userId, teamId },
    _max: { position: true },
  });

  await prisma.favorite.create({
    data: {
      userId,
      teamId,
      kind: data.kind,
      targetId: data.targetId,
      folder: data.folder?.trim() || null,
      position: (last._max.position ?? 0) + 1,
    },
  });

  return { on: true };
}

/** Put a favorite in a folder (null: top level). Only the owner can. */
export async function setFavoriteFolder(
  userId: string,
  favoriteId: string,
  folder: string | null,
) {
  const row = await prisma.favorite.findFirst({
    where: { id: favoriteId, userId },
  });

  if (!row) throw new AuthError("Favorite not found", "NOT_FOUND", 404);
  const clean = folder?.trim().slice(0, 40) || null;

  await prisma.favorite.update({
    where: { id: favoriteId },
    data: { folder: clean },
  });
}

/**
 * Move a favorite to a new place: `orderedIds` is the full list in the order the user wants.
 * Positions are rewritten 1..n, so a reorder is one request and never leaves gaps or ties.
 */
export async function reorderFavorites(
  userId: string,
  teamId: string,
  orderedIds: string[],
) {
  const rows = await prisma.favorite.findMany({
    where: { userId, teamId, id: { in: orderedIds } },
    select: { id: true },
  });
  const owned = new Set(rows.map((row) => row.id));
  const ids = orderedIds.filter((id) => owned.has(id));

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.favorite.update({ where: { id }, data: { position: index + 1 } }),
    ),
  );
}

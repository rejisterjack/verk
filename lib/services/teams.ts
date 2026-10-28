import { Prisma, Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AuthError, assertRole, requireUser } from "@/lib/rbac";
import { isDemoMode, slugify } from "@/lib/utils";
import { createTeamSchema, updateTeamSchema } from "@/lib/validators";

export async function createTeam(input: unknown) {
  const user = await requireUser();
  const data = createTeamSchema.parse(input);
  const base = data.slug ?? slugify(data.name);
  let slug = base || "team";
  let attempt = 0;

  while (await prisma.team.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }

  return prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: { name: data.name, slug },
    });

    await tx.membership.create({
      data: { teamId: team.id, userId: user.id, role: "OWNER" },
    });

    return team;
  });
}

export async function updateTeam(teamId: string, input: unknown, role: Role) {
  assertRole(role, "ADMIN");
  const data = updateTeamSchema.parse(input);

  if (data.slug) {
    const existing = await prisma.team.findFirst({
      where: { slug: data.slug, NOT: { id: teamId } },
    });

    if (existing) {
      throw new AuthError("Slug already taken", "CONFLICT", 409);
    }
  }

  const { slaHours, ...rest } = data;

  return prisma.team.update({
    where: { id: teamId },
    data: {
      ...rest,
      ...(slaHours === null
        ? { slaHours: Prisma.JsonNull }
        : slaHours !== undefined
          ? { slaHours }
          : {}),
    },
  });
}

export async function deleteTeam(teamId: string, role: Role) {
  assertRole(role, "OWNER");
  if (isDemoMode()) {
    throw new AuthError(
      "Team deletion is disabled in demo mode",
      "DEMO_LOCKED",
      403,
    );
  }
  await prisma.team.delete({ where: { id: teamId } });
}

export async function getTeamBySlug(slug: string) {
  return prisma.team.findUnique({ where: { slug } });
}

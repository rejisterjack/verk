import type { Role } from "@/lib/generated/prisma/client";

const ROLE_RANK: Record<Role, number> = {
  GUEST: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function assertRole(role: Role, min: Role): void {
  if (!roleAtLeast(role, min)) {
    const error = new Error("Insufficient permissions") as Error & {
      code: string;
      status: number;
    };

    error.code = "FORBIDDEN";
    error.status = 403;
    throw error;
  }
}

/** The weaker of two roles. */
export function lowerRole(a: Role, b: Role): Role {
  return ROLE_RANK[a] <= ROLE_RANK[b] ? a : b;
}

/** Roles an API key may carry. A key is never OWNER. */
export const API_KEY_ROLES = ["GUEST", "MEMBER", "ADMIN"] as const;

/**
 * What an API key can actually do: its own role, capped by its creator's current
 * team role. A creator who has left the team (`null`) leaves the key with no access.
 */
export function effectiveApiKeyRole(
  keyRole: Role,
  creatorMembershipRole: Role | null | undefined,
): Role | null {
  if (!creatorMembershipRole) return null;

  return lowerRole(keyRole, creatorMembershipRole);
}

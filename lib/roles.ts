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

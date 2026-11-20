import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

/** Neon’s driver speaks HTTP or its own WebSocket proxy, not a local Postgres port. */
export function usesDirectPostgres(connectionString: string) {
  try {
    const host = new URL(connectionString).hostname;

    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

export function createPrismaAdapter(connectionString: string) {
  if (usesDirectPostgres(connectionString)) {
    return new PrismaPg(connectionString);
  }

  return new PrismaNeon({ connectionString });
}

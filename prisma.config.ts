import "dotenv/config";
import { defineConfig } from "prisma/config";

/** Prefer DIRECT_URL for migrations; fall back so `prisma generate` works during install. */
function datasourceUrl() {
  return (
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    "postgresql://user:pass@localhost:5432/verk"
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI / migrations use the direct (non-pooler) Neon URL when available
    url: datasourceUrl(),
  },
});

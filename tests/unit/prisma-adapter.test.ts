import { describe, expect, it } from "vitest";

import { usesDirectPostgres } from "@/lib/prisma-adapter";

describe("usesDirectPostgres", () => {
  it("uses TCP for a local Docker Postgres URL", () => {
    expect(
      usesDirectPostgres("postgresql://verk:verk@localhost:5432/verk"),
    ).toBe(true);
    expect(
      usesDirectPostgres("postgresql://verk:verk@127.0.0.1:5432/verk"),
    ).toBe(true);
  });

  it("keeps the Neon driver for a hosted database", () => {
    expect(
      usesDirectPostgres(
        "postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require",
      ),
    ).toBe(false);
  });

  it("does not treat a broken URL as local", () => {
    expect(usesDirectPostgres("not a url")).toBe(false);
    expect(usesDirectPostgres("")).toBe(false);
  });
});

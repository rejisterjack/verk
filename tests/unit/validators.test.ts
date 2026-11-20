import { describe, expect, it } from "vitest";

import {
  createCycleSchema,
  createIssueSchema,
  inviteSchema,
  listIssuesQuerySchema,
  registerSchema,
} from "@/lib/validators";

describe("validators", () => {
  it("accepts a valid issue", () => {
    const parsed = createIssueSchema.parse({ title: "Ship MCP" });
    expect(parsed.title).toBe("Ship MCP");
    expect(parsed.description).toBe("");
  });

  it("trims a title and rejects one that is only whitespace", () => {
    expect(createIssueSchema.parse({ title: "  Ship  " }).title).toBe("Ship");
    expect(createIssueSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(createIssueSchema.safeParse({ title: "" }).success).toBe(false);
    expect(createIssueSchema.safeParse({ title: "a".repeat(201) }).success).toBe(
      false,
    );
  });

  it("rejects inverted cycle dates", () => {
    const result = createCycleSchema.safeParse({
      name: "Cycle",
      startDate: "2026-02-01",
      endDate: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("trims a registration name and rejects a blank one", () => {
    expect(
      registerSchema.parse({
        name: "  Ada  ",
        email: " Ada@Example.com ",
        password: "password1",
      }),
    ).toMatchObject({ name: "Ada", email: "Ada@Example.com" });
    expect(
      registerSchema.safeParse({
        name: "   ",
        email: "ada@example.com",
        password: "password1",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "Ada",
        email: "not-an-email",
        password: "short",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "Ada",
        email: "ada@example.com",
        password: "a".repeat(129),
      }).success,
    ).toBe(false);
  });

  it("defaults invite role to MEMBER", () => {
    const parsed = inviteSchema.parse({ email: "a@b.com" });
    expect(parsed.role).toBe("MEMBER");
  });

  it("accepts issue number filter on list query", () => {
    const parsed = listIssuesQuerySchema.parse({ number: "12", take: "5" });
    expect(parsed.number).toBe(12);
    expect(parsed.take).toBe(5);
  });
});

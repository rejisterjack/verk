import { describe, expect, it } from "vitest";

import {
  createCycleSchema,
  createIssueSchema,
  inviteSchema,
} from "@/lib/validators";

describe("validators", () => {
  it("accepts a valid issue", () => {
    const parsed = createIssueSchema.parse({ title: "Ship MCP" });
    expect(parsed.title).toBe("Ship MCP");
    expect(parsed.description).toBe("");
  });

  it("rejects inverted cycle dates", () => {
    const result = createCycleSchema.safeParse({
      name: "Cycle",
      startDate: "2026-02-01",
      endDate: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("defaults invite role to MEMBER", () => {
    const parsed = inviteSchema.parse({ email: "a@b.com" });
    expect(parsed.role).toBe("MEMBER");
  });
});

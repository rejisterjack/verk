import { describe, expect, it } from "vitest";

import { roleAtLeast } from "@/lib/roles";
import { issueKey, slugify } from "@/lib/utils";

describe("roleAtLeast", () => {
  it("ranks roles correctly", () => {
    expect(roleAtLeast("OWNER", "ADMIN")).toBe(true);
    expect(roleAtLeast("ADMIN", "MEMBER")).toBe(true);
    expect(roleAtLeast("MEMBER", "ADMIN")).toBe(false);
  });
});

describe("slugify", () => {
  it("creates url-safe slugs", () => {
    expect(slugify("Acme Engineering!")).toBe("acme-engineering");
  });
});

describe("issueKey", () => {
  it("builds a short prefix key", () => {
    expect(issueKey("acme-engineering", 12)).toBe("ACM-12");
  });
});

import { describe, expect, it } from "vitest";

import { isTypingTarget, SHORTCUTS } from "@/lib/shortcuts/registry";

describe("shortcut registry", () => {
  it("includes command palette and create", () => {
    const ids = SHORTCUTS.map((s) => s.id);

    expect(ids).toContain("command");
    expect(ids).toContain("create");
    expect(ids).toContain("go-inbox");
  });

  it("treats null as non-typing", () => {
    expect(isTypingTarget(null)).toBe(false);
  });
});

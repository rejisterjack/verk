import { describe, expect, it } from "vitest";

import { AuthError } from "@/lib/errors";
import { sha256 } from "@/lib/utils";

describe("AuthError", () => {
  it("carries status and code", () => {
    const err = new AuthError("Nope", "FORBIDDEN", 403);
    expect(err.status).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });
});

describe("sha256", () => {
  it("hashes deterministically", async () => {
    const a = await sha256("verk_test");
    const b = await sha256("verk_test");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

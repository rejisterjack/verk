import { describe, expect, it } from "vitest";

import { isStaleSessionError } from "@/lib/auth-errors";

describe("isStaleSessionError", () => {
  it("recognizes a cookie sealed with a different secret", () => {
    expect(
      isStaleSessionError({
        name: "JWTSessionError",
        cause: { message: "no matching decryption secret" },
      }),
    ).toBe(true);
  });

  it("does not hide other auth failures", () => {
    expect(isStaleSessionError(new Error("database down"))).toBe(false);
    expect(isStaleSessionError(null)).toBe(false);
    expect(isStaleSessionError("JWTSessionError")).toBe(false);
  });
});

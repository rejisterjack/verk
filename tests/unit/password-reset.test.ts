import { describe, expect, it } from "vitest";

import {
  emailFromResetIdentifier,
  resetIdentifier,
} from "@/lib/services/password-reset";

describe("password reset identifiers", () => {
  it("round-trips an email and ignores other tokens", () => {
    expect(emailFromResetIdentifier(resetIdentifier("ada@example.com"))).toBe(
      "ada@example.com",
    );
    expect(emailFromResetIdentifier("invite:ada@example.com")).toBeNull();
  });
});

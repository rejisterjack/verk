import { afterEach, describe, expect, it } from "vitest";

import { isGithubIdentityAllowed } from "@/lib/auth-allowlist";

const original = process.env.AUTH_ALLOWED_GITHUB;

afterEach(() => {
  process.env.AUTH_ALLOWED_GITHUB = original;
});

describe("isGithubIdentityAllowed", () => {
  it("allows everyone when the allowlist is empty", () => {
    process.env.AUTH_ALLOWED_GITHUB = "";
    expect(isGithubIdentityAllowed({ login: "anyone" })).toBe(true);
  });

  it("matches login or numeric id and rejects others", () => {
    process.env.AUTH_ALLOWED_GITHUB = "Ada,42";
    expect(isGithubIdentityAllowed({ login: "ada" })).toBe(true);
    expect(isGithubIdentityAllowed({ id: 42 })).toBe(true);
    expect(isGithubIdentityAllowed({ login: "other", id: 7 })).toBe(false);
    expect(isGithubIdentityAllowed(null)).toBe(false);
  });
});

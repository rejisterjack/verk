import { describe, expect, it } from "vitest";

import {
  githubSignature,
  matchIssueNumber,
  pullRequestComment,
  verifyGithubSignature,
} from "@/lib/github";

describe("github webhook helpers", () => {
  it("matches the team prefix and rejects a foreign key", () => {
    expect(matchIssueNumber("Fix ACM-12 login", "acme-engineering")).toBe(12);
    expect(matchIssueNumber("acme-engineering-4", "acme-engineering")).toBe(4);
    expect(matchIssueNumber("OTHER-9", "acme-engineering")).toBeNull();
  });

  it("verifies the HMAC and includes the Verk issue URL", () => {
    const raw = "{\"action\":\"opened\"}";
    const signature = githubSignature("secret", raw);

    expect(verifyGithubSignature("secret", raw, signature)).toBe(true);
    expect(verifyGithubSignature("secret", raw, "sha256=nope")).toBe(false);
    process.env.AUTH_URL = "https://verk.example";
    expect(pullRequestComment("DONE", "acme", 3)).toContain(
      "https://verk.example/t/acme/issues/3",
    );
  });
});

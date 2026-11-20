import { describe, expect, it } from "vitest";

import { buildSecurityHeaders } from "@/lib/security-headers.mjs";

function header(isDev: boolean, key: string) {
  return buildSecurityHeaders(isDev).find((item) => item.key === key);
}

describe("buildSecurityHeaders", () => {
  it("omits HSTS on a development server", () => {
    expect(header(true, "Strict-Transport-Security")).toBeUndefined();
    expect(header(true, "Content-Security-Policy")?.value).toContain(
      "'unsafe-eval'",
    );
  });

  it("sends HSTS and a stricter script policy in production", () => {
    expect(header(false, "Strict-Transport-Security")?.value).toBe(
      "max-age=31536000; includeSubDomains; preload",
    );
    const policy = header(false, "Content-Security-Policy")?.value ?? "";
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("https://www.clarity.ms");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("https://evil.example");
  });

  it("always sends the framing and content-type headers", () => {
    for (const isDev of [true, false]) {
      expect(header(isDev, "X-Frame-Options")?.value).toBe("DENY");
      expect(header(isDev, "X-Content-Type-Options")?.value).toBe("nosniff");
      expect(
        buildSecurityHeaders(isDev).some((item) => item.key === "X-Powered-By"),
      ).toBe(false);
    }
  });
});

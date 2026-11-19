import { describe, expect, it } from "vitest";

import {
  isValidChallenge,
  isValidRedirectUri,
  isValidVerifier,
  parseScope,
  redirectUriAllowed,
  redirectWith,
  roleForScope,
  s256,
  verifyPkce,
} from "@/lib/oauth";

// RFC 7636 appendix B.
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

describe("PKCE", () => {
  it("computes the RFC 7636 S256 challenge", () => {
    expect(s256(VERIFIER)).toBe(CHALLENGE);
  });

  it("accepts the matching verifier", () => {
    expect(verifyPkce(VERIFIER, CHALLENGE)).toBe(true);
  });

  it("rejects a different verifier", () => {
    expect(verifyPkce(`${VERIFIER.slice(0, -1)}A`, CHALLENGE)).toBe(false);
  });

  it("refuses a verifier that is too short, too long or has bad characters", () => {
    expect(isValidVerifier("short")).toBe(false);
    expect(isValidVerifier("a".repeat(129))).toBe(false);
    expect(isValidVerifier(`${"a".repeat(42)}!`)).toBe(false);
    expect(isValidVerifier("a".repeat(43))).toBe(true);
    expect(isValidVerifier("a".repeat(128))).toBe(true);
  });

  it("refuses a `plain` challenge: it is not a 43-character digest", () => {
    expect(isValidChallenge(VERIFIER)).toBe(true); // same shape, so shape alone is not enough
    expect(verifyPkce(VERIFIER, VERIFIER)).toBe(false); // but plain never verifies
    expect(isValidChallenge("plain-text")).toBe(false);
  });

  it("returns false (not a throw) on malformed input", () => {
    expect(verifyPkce("", "")).toBe(false);
    expect(verifyPkce(VERIFIER, "")).toBe(false);
  });
});

describe("redirect URIs", () => {
  it("allows https and loopback http only", () => {
    expect(isValidRedirectUri("https://app.example.com/cb")).toBe(true);
    expect(isValidRedirectUri("http://localhost:3000/cb")).toBe(true);
    expect(isValidRedirectUri("http://127.0.0.1/cb")).toBe(true);
    expect(isValidRedirectUri("http://example.com/cb")).toBe(false);
    expect(isValidRedirectUri("javascript:alert(1)")).toBe(false);
    expect(isValidRedirectUri("not a url")).toBe(false);
  });

  it("refuses fragments", () => {
    expect(isValidRedirectUri("https://app.example.com/cb#frag")).toBe(false);
  });

  it("matches the registered list exactly, never by prefix", () => {
    const registered = ["https://app.example.com/cb"];

    expect(redirectUriAllowed(registered, "https://app.example.com/cb")).toBe(
      true,
    );
    expect(
      redirectUriAllowed(registered, "https://app.example.com/cb/evil"),
    ).toBe(false);
    expect(
      redirectUriAllowed(registered, "https://app.example.com/cb?x=1"),
    ).toBe(false);
    expect(redirectUriAllowed(registered, "https://evil.com/cb")).toBe(false);
  });

  it("adds code and state without disturbing the existing query", () => {
    const url = new URL(
      redirectWith("https://app.example.com/cb?keep=1", {
        code: "abc",
        state: "xyz",
        skipped: undefined,
      }),
    );

    expect(url.searchParams.get("keep")).toBe("1");
    expect(url.searchParams.get("code")).toBe("abc");
    expect(url.searchParams.get("state")).toBe("xyz");
    expect(url.searchParams.has("skipped")).toBe(false);
  });
});

describe("scopes", () => {
  it("defaults to read and rejects anything unknown", () => {
    expect(parseScope(undefined)).toBe("read");
    expect(parseScope("")).toBe("read");
    expect(parseScope("write")).toBe("write");
    expect(parseScope("admin")).toBeNull();
  });

  it("gives read tokens guest power and write tokens member power, never admin", () => {
    expect(roleForScope("read")).toBe("GUEST");
    expect(roleForScope("write")).toBe("MEMBER");
    expect(roleForScope("anything-else")).toBe("GUEST");
  });
});
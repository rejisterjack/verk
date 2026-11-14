import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn() },
  samlSeen: {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null), signIn: vi.fn() }));
// `complete` imports AuthError straight from next-auth, which can't load under vitest.
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitShared: vi.fn(async () => ({ ok: true, remaining: 29 })),
}));

import {
  cacheProviderFrom,
  emailFromProfile,
  isDomainAllowed,
  isSamlEnabled,
  mintSamlTicket,
  nameFromProfile,
  normalizeCert,
  prismaSeenStore,
  safeCallbackPath,
  samlEnv,
  verifySamlTicket,
  type SamlEnv,
  type SamlSeenStore,
} from "@/lib/saml";
import { loginFromSamlProfile, SAML_ERROR_CODE } from "@/lib/services/saml-login";

const SECRET = "test-auth-secret-0123456789";
const NOW = 1_800_000_000_000;

const env: SamlEnv = {
  ssoUrl: "https://accounts.google.com/o/saml2/idp?idpid=C0",
  idpCert: "MIIB",
  spEntityId: "https://verk.example.com/api/auth/saml/metadata",
  acsUrl: "https://verk.example.com/api/auth/saml/acs",
  allowedDomains: [],
};

const profile = (over: Record<string, unknown> = {}) =>
  ({
    issuer: "https://accounts.google.com/o/saml2?idpid=C0",
    nameID: "ada@acme.com",
    nameIDFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    ...over,
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_SECRET", SECRET);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("samlEnv", () => {
  it("is off unless the SSO URL, certificate and AUTH_URL are all set", () => {
    vi.stubEnv("SAML_IDP_SSO_URL", "");
    vi.stubEnv("SAML_IDP_CERT", "");
    vi.stubEnv("AUTH_URL", "https://verk.example.com");

    expect(samlEnv()).toBeNull();
    expect(isSamlEnabled()).toBe(false);

    vi.stubEnv("SAML_IDP_SSO_URL", env.ssoUrl);
    expect(samlEnv()).toBeNull();
  });

  it("derives the entity id and ACS url from AUTH_URL, and parses the domain list", () => {
    vi.stubEnv("SAML_IDP_SSO_URL", env.ssoUrl);
    vi.stubEnv("SAML_IDP_CERT", "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----");
    vi.stubEnv("AUTH_URL", "https://verk.example.com/");
    vi.stubEnv("SAML_ALLOWED_DOMAINS", "Acme.com, @corp.io ,");

    const result = samlEnv();

    expect(isSamlEnabled()).toBe(true);
    expect(result).toMatchObject({
      spEntityId: "https://verk.example.com/api/auth/saml/metadata",
      acsUrl: "https://verk.example.com/api/auth/saml/acs",
      idpCert: "MIIB",
      allowedDomains: ["acme.com", "corp.io"],
    });
  });

  it("an explicit SAML_SP_ENTITY_ID wins", () => {
    vi.stubEnv("SAML_IDP_SSO_URL", env.ssoUrl);
    vi.stubEnv("SAML_IDP_CERT", "MIIB");
    vi.stubEnv("AUTH_URL", "https://verk.example.com");
    vi.stubEnv("SAML_SP_ENTITY_ID", "urn:verk:prod");

    expect(samlEnv()?.spEntityId).toBe("urn:verk:prod");
  });
});

describe("normalizeCert", () => {
  it("strips PEM headers, whitespace and literal \\n sequences", () => {
    expect(
      normalizeCert("-----BEGIN CERTIFICATE-----\\nAAAA\\nBBBB\\n-----END CERTIFICATE-----"),
    ).toBe("AAAABBBB");
    expect(normalizeCert("AA AA\n BB")).toBe("AAAABB");
  });
});

describe("SAML ticket", () => {
  it("round-trips an authentic ticket", () => {
    const ticket = mintSamlTicket({ email: "Ada@Acme.com", name: "Ada" }, NOW);

    expect(verifySamlTicket(ticket, NOW + 1000)).toEqual({
      email: "ada@acme.com",
      name: "Ada",
    });
  });

  it("expires after 60 seconds", () => {
    const ticket = mintSamlTicket({ email: "ada@acme.com" }, NOW);

    expect(verifySamlTicket(ticket, NOW + 59_000)).not.toBeNull();
    expect(verifySamlTicket(ticket, NOW + 61_000)).toBeNull();
  });

  it("rejects a tampered payload (an attacker swapping in another email)", () => {
    const ticket = mintSamlTicket({ email: "ada@acme.com" }, NOW);
    const [, signature] = ticket.split(".");
    const forged = Buffer.from(
      JSON.stringify({ email: "admin@acme.com", exp: Math.floor(NOW / 1000) + 60 }),
    ).toString("base64url");

    expect(verifySamlTicket(`${forged}.${signature}`, NOW)).toBeNull();
  });

  it("rejects a ticket signed with a different secret", () => {
    const ticket = mintSamlTicket({ email: "ada@acme.com" }, NOW, "another-secret");

    expect(verifySamlTicket(ticket, NOW)).toBeNull();
  });

  it("rejects garbage without throwing", () => {
    for (const bad of ["", "abc", "a.b.c", ".", "x.y", "%%%.%%%"]) {
      expect(verifySamlTicket(bad, NOW)).toBeNull();
    }
  });

  it("cannot be minted without AUTH_SECRET", () => {
    vi.stubEnv("AUTH_SECRET", "");

    expect(() => mintSamlTicket({ email: "a@b.co" })).toThrow(/AUTH_SECRET/);
  });
});

describe("profile helpers", () => {
  it("takes the email from the configured attribute first", () => {
    expect(
      emailFromProfile(
        profile({ "http://schemas/mail": "Ada@Acme.com", nameID: "other@x.co" }),
        { ...env, emailAttribute: "http://schemas/mail" },
      ),
    ).toBe("ada@acme.com");
  });

  it("falls back to email, mail, then an email-shaped NameID", () => {
    expect(emailFromProfile(profile({ email: "e@x.co" }), env)).toBe("e@x.co");
    expect(emailFromProfile(profile({ mail: "m@x.co", nameID: "id-1" }), env)).toBe(
      "m@x.co",
    );
    expect(emailFromProfile(profile(), env)).toBe("ada@acme.com");
  });

  it("returns null when nothing looks like an email", () => {
    expect(emailFromProfile(profile({ nameID: "opaque-123" }), env)).toBeNull();
  });

  it("reads the display name from the configured attribute only", () => {
    expect(nameFromProfile(profile({ displayName: " Ada L " }), { ...env, nameAttribute: "displayName" })).toBe(
      "Ada L",
    );
    expect(nameFromProfile(profile({ displayName: "Ada" }), env)).toBeNull();
  });
});

describe("isDomainAllowed", () => {
  it("allows everything with an empty list, otherwise only listed domains", () => {
    expect(isDomainAllowed("a@anything.io", [])).toBe(true);
    expect(isDomainAllowed("a@acme.com", ["acme.com"])).toBe(true);
    expect(isDomainAllowed("a@ACME.com", ["acme.com"])).toBe(true);
    expect(isDomainAllowed("a@evil.com", ["acme.com"])).toBe(false);
    expect(isDomainAllowed("a@acme.com.evil.com", ["acme.com"])).toBe(false);
    expect(isDomainAllowed("no-at-sign", ["acme.com"])).toBe(false);
  });
});

describe("safeCallbackPath (no open redirect)", () => {
  it("allows same-site paths and rejects everything else", () => {
    expect(safeCallbackPath("/t/acme/issues?x=1")).toBe("/t/acme/issues?x=1");
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "javascript:alert(1)",
      "",
      null,
      undefined,
      "/ok\nSet-Cookie: x=1",
    ]) {
      expect(safeCallbackPath(bad)).toBe("/onboarding");
    }
  });
});

describe("loginFromSamlProfile", () => {
  it("signs in an existing, enabled user", async () => {
    db.user.findUnique.mockResolvedValue({ disabled: false });
    const result = await loginFromSamlProfile(profile(), env);

    expect(result).toMatchObject({ ok: true, email: "ada@acme.com" });
    expect(db.user.create).not.toHaveBeenCalled();
    if (result.ok) {
      expect(verifySamlTicket(result.ticket)).toMatchObject({ email: "ada@acme.com" });
    }
  });

  it("creates a first-time user, so they land on onboarding", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({});
    const result = await loginFromSamlProfile(profile(), {
      ...env,
      nameAttribute: "displayName",
    });

    expect(result.ok).toBe(true);
    expect(db.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: "ada@acme.com", name: "ada@acme.com" }),
    });
  });

  it("a SCIM-disabled user cannot sign in, however valid the assertion", async () => {
    db.user.findUnique.mockResolvedValue({ disabled: true });

    await expect(loginFromSamlProfile(profile(), env)).resolves.toEqual({
      ok: false,
      reason: "disabled",
    });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("refuses a domain outside the allowlist, and creates nothing", async () => {
    await expect(
      loginFromSamlProfile(profile({ nameID: "x@evil.com" }), {
        ...env,
        allowedDomains: ["acme.com"],
      }),
    ).resolves.toEqual({ ok: false, reason: "domain_not_allowed" });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("refuses a profile with no email", async () => {
    await expect(
      loginFromSamlProfile(profile({ nameID: "opaque" }), env),
    ).resolves.toEqual({ ok: false, reason: "no_email" });
  });

  it("refuses on a private (GitHub-allowlist) host", async () => {
    vi.stubEnv("AUTH_ALLOWED_GITHUB", "ada");

    await expect(loginFromSamlProfile(profile(), env)).resolves.toEqual({
      ok: false,
      reason: "private_host",
    });
  });

  it("every failure reason has a login error code", () => {
    expect(Object.values(SAML_ERROR_CODE).every((code) => code.startsWith("Saml"))).toBe(
      true,
    );
  });
});

describe("replay store", () => {
  function memoryStore(): SamlSeenStore & { rows: Map<string, number> } {
    const rows = new Map<string, number>();
    const values = new Map<string, string>();

    return {
      rows,
      async saveIfAbsent(key, value, expiresAtMs) {
        if (rows.has(key) && (rows.get(key) as number) > Date.now()) return false;
        rows.set(key, expiresAtMs);
        values.set(key, value);

        return true;
      },
      async get(key) {
        return values.get(key) ?? null;
      },
      async consume(key) {
        const value = values.get(key) ?? null;

        rows.delete(key);
        values.delete(key);

        return value;
      },
      async prune() {},
    };
  }

  it("accepts an assertion id once and rejects the replay", async () => {
    const cache = cacheProviderFrom(memoryStore());
    const until = Date.now() + 60_000;

    await expect(cache.saveIfAbsentAsync!("assertion:_abc", "1", until)).resolves.toBe(true);
    await expect(cache.saveIfAbsentAsync!("assertion:_abc", "1", until)).resolves.toBe(false);
  });

  it("consumes a request id exactly once, so two copies of a response can't both pass", async () => {
    const cache = cacheProviderFrom(memoryStore());

    await cache.saveAsync("_req1", "2026-01-01T00:00:00Z");
    await expect(cache.consumeAsync!("_req1")).resolves.toBe("2026-01-01T00:00:00Z");
    await expect(cache.consumeAsync!("_req1")).resolves.toBeNull();
  });

  it("the Postgres store treats a unique violation as 'already seen'", async () => {
    db.samlSeen.deleteMany.mockResolvedValue({ count: 0 });
    db.samlSeen.create.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("P2002"));
    const store = await prismaSeenStore();
    const until = Date.now() + 60_000;

    await expect(store.saveIfAbsent("assertion:_x", "", until)).resolves.toBe(true);
    await expect(store.saveIfAbsent("assertion:_x", "", until)).resolves.toBe(false);
  });

  it("the Postgres store only returns unexpired values and consumes atomically", async () => {
    const store = await prismaSeenStore();

    db.samlSeen.findUnique.mockResolvedValueOnce({
      value: "v",
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(store.get("k")).resolves.toBeNull();

    db.samlSeen.findUnique.mockResolvedValueOnce({
      value: "v",
      expiresAt: new Date(Date.now() + 60_000),
    });
    db.samlSeen.deleteMany.mockResolvedValueOnce({ count: 1 });
    await expect(store.consume("k")).resolves.toBe("v");

    // A concurrent copy loses the race: deleteMany reports 0 rows.
    db.samlSeen.findUnique.mockResolvedValueOnce({
      value: "v",
      expiresAt: new Date(Date.now() + 60_000),
    });
    db.samlSeen.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(store.consume("k")).resolves.toBeNull();
  });
});

describe("SAML routes", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const form = (fields: Record<string, string>) => {
    const body = new URLSearchParams(fields);

    return new Request("http://localhost/api/auth/saml/acs", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
  };

  it("every SAML route is a 404 when SAML is not configured", async () => {
    vi.stubEnv("SAML_IDP_SSO_URL", "");
    vi.stubEnv("SAML_IDP_CERT", "");
    const login = await import("@/app/api/auth/saml/login/route");
    const acs = await import("@/app/api/auth/saml/acs/route");
    const metadata = await import("@/app/api/auth/saml/metadata/route");

    expect((await login.GET(new Request("http://localhost/api/auth/saml/login"))).status).toBe(404);
    expect((await acs.POST(form({ SAMLResponse: "x" }))).status).toBe(404);
    expect((await metadata.GET()).status).toBe(404);
  });

  describe("when configured", () => {
    beforeEach(() => {
      vi.stubEnv("SAML_IDP_SSO_URL", env.ssoUrl);
      vi.stubEnv("SAML_IDP_CERT", "MIIB");
      vi.stubEnv("AUTH_URL", "https://verk.example.com");
    });

    it("ACS sends a missing or invalid SAMLResponse back to /login with an error", async () => {
      const acs = await import("@/app/api/auth/saml/acs/route");
      const missing = await acs.POST(form({}));
      const garbage = await acs.POST(form({ SAMLResponse: "not-base64-xml" }));

      for (const response of [missing, garbage]) {
        expect(response.status).toBe(303);
        const location = new URL(response.headers.get("location")!);

        expect(location.pathname).toBe("/login");
        expect(location.searchParams.get("error")).toBe("SamlInvalid");
      }
    });

    it("the complete route refuses a forged or expired ticket", async () => {
      const complete = await import("@/app/api/auth/saml/complete/route");
      const forged = await complete.GET(
        new Request("http://localhost/api/auth/saml/complete?ticket=abc.def"),
      );
      const expired = await complete.GET(
        new Request(
          `http://localhost/api/auth/saml/complete?ticket=${encodeURIComponent(
            mintSamlTicket({ email: "ada@acme.com" }, Date.now() - 120_000),
          )}`,
        ),
      );

      for (const response of [forged, expired]) {
        expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe(
          "SamlInvalid",
        );
      }
    });

    it("metadata publishes the entity id and the ACS url for the IdP", async () => {
      const metadata = await import("@/app/api/auth/saml/metadata/route");
      const response = await metadata.GET();
      const xml = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("xml");
      expect(xml).toContain("https://verk.example.com/api/auth/saml/metadata");
      expect(xml).toContain("https://verk.example.com/api/auth/saml/acs");
    });

    it("login redirects to Google's SSO URL with a SAMLRequest", async () => {
      db.samlSeen.deleteMany.mockResolvedValue({ count: 0 });
      db.samlSeen.create.mockResolvedValue({});
      const login = await import("@/app/api/auth/saml/login/route");
      const response = await login.GET(
        new Request("http://localhost/api/auth/saml/login?callbackUrl=/t/acme/issues"),
      );
      const location = new URL(response.headers.get("location")!);

      expect(response.status).toBe(307);
      expect(location.origin + location.pathname).toBe(
        "https://accounts.google.com/o/saml2/idp",
      );
      expect(location.searchParams.get("SAMLRequest")).toBeTruthy();
      expect(location.searchParams.get("RelayState")).toBe("/t/acme/issues");
    });

    it("login drops an off-site callbackUrl instead of echoing it as RelayState", async () => {
      db.samlSeen.deleteMany.mockResolvedValue({ count: 0 });
      db.samlSeen.create.mockResolvedValue({});
      const login = await import("@/app/api/auth/saml/login/route");
      const response = await login.GET(
        new Request("http://localhost/api/auth/saml/login?callbackUrl=https://evil.com"),
      );

      expect(
        new URL(response.headers.get("location")!).searchParams.get("RelayState"),
      ).toBe("/onboarding");
    });
  });
});
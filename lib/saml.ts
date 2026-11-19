import type {
  CacheProvider,
  Profile,
  SAML,
  SamlConfig,
  ValidateInResponseTo,
} from "@node-saml/node-saml";

import { createHmac, timingSafeEqual } from "node:crypto";

// Types only: the library itself is loaded lazily in `createSamlClient`, so importing
// this module (which `lib/auth.ts` does on every request) never pays for the XML stack.

/**
 * SAML 2.0 single sign-on (service-provider side), tuned for Google Workspace.
 *
 * Flow: /api/auth/saml/login -> IdP -> POST /api/auth/saml/acs -> a short-lived signed
 * ticket -> the Auth.js `saml` credentials provider turns the ticket into a session.
 * Auth.js v5 has no SAML provider, so the ticket is the bridge.
 */

export const SAML_TICKET_TTL_SECONDS = 60;
export const SAML_PROVIDER_ID = "saml";

export type SamlEnv = {
  /** Google's "SSO URL". */
  ssoUrl: string;
  /** Google's "Entity ID", the IdP issuer. */
  idpIssuer?: string;
  /** Google's x509 certificate (PEM, or the bare base64 body). */
  idpCert: string;
  /** Our entity id. Defaults to `${AUTH_URL}/api/auth/saml/metadata`. */
  spEntityId: string;
  /** Our Assertion Consumer Service URL. */
  acsUrl: string;
  emailAttribute?: string;
  nameAttribute?: string;
  allowedDomains: string[];
};

function trimmedEnv(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : undefined;
}

/** Env vars sometimes lose their newlines. Rebuild a PEM body so the XML library accepts it. */
export function normalizeCert(raw: string) {
  const body = raw
    .replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");

  return body;
}

/** Null when SAML is not configured. Both the SSO URL and the certificate are required. */
export function samlEnv(): SamlEnv | null {
  const ssoUrl = trimmedEnv("SAML_IDP_SSO_URL");
  const idpCert = trimmedEnv("SAML_IDP_CERT");
  const origin = (trimmedEnv("AUTH_URL") ?? "").replace(/\/$/, "");

  if (!ssoUrl || !idpCert || !origin) return null;

  return {
    ssoUrl,
    idpIssuer: trimmedEnv("SAML_IDP_ISSUER"),
    idpCert: normalizeCert(idpCert),
    spEntityId:
      trimmedEnv("SAML_SP_ENTITY_ID") ?? `${origin}/api/auth/saml/metadata`,
    acsUrl: `${origin}/api/auth/saml/acs`,
    emailAttribute: trimmedEnv("SAML_EMAIL_ATTRIBUTE"),
    nameAttribute: trimmedEnv("SAML_NAME_ATTRIBUTE"),
    allowedDomains: (trimmedEnv("SAML_ALLOWED_DOMAINS") ?? "")
      .split(",")
      .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean),
  };
}

export function isSamlEnabled() {
  return samlEnv() !== null;
}

/** The two things the library needs to remember: request ids and assertion ids. */
export type SamlSeenStore = {
  /** Save only if absent. True when this call saved it, false when it was already there. */
  saveIfAbsent(
    key: string,
    value: string,
    expiresAtMs: number,
  ): Promise<boolean>;
  get(key: string): Promise<string | null>;
  /** Remove and return, atomically, so two copies of one response can't both pass. */
  consume(key: string): Promise<string | null>;
  prune(nowMs: number): Promise<void>;
};

/** Postgres-backed store. Serverless instances share it, so replays are caught across them. */
export async function prismaSeenStore(): Promise<SamlSeenStore> {
  const { prisma } = await import("@/lib/db");

  return {
    async saveIfAbsent(key, value, expiresAtMs) {
      // An expired row for the same key must not block a fresh one.
      await prisma.samlSeen.deleteMany({
        where: { key, expiresAt: { lt: new Date() } },
      });
      try {
        await prisma.samlSeen.create({
          data: { key, value, expiresAt: new Date(expiresAtMs) },
        });

        return true;
      } catch {
        return false; // unique violation: already seen
      }
    },
    async get(key) {
      const row = await prisma.samlSeen.findUnique({ where: { key } });

      return row && row.expiresAt > new Date() ? row.value : null;
    },
    async consume(key) {
      const row = await prisma.samlSeen.findUnique({ where: { key } });

      if (!row) return null;
      const { count } = await prisma.samlSeen.deleteMany({ where: { key } });

      return count === 1 && row.expiresAt > new Date() ? row.value : null;
    },
    async prune(nowMs) {
      await prisma.samlSeen.deleteMany({
        where: { expiresAt: { lt: new Date(nowMs) } },
      });
    },
  };
}

/** Adapt our store to node-saml's CacheProvider. */
export function cacheProviderFrom(
  store: SamlSeenStore,
  requestTtlMs = 10 * 60_000,
): CacheProvider {
  return {
    async saveAsync(key, value) {
      await store.saveIfAbsent(key, value, Date.now() + requestTtlMs);

      return { value, createdAt: Date.now() };
    },
    getAsync: (key) => store.get(key),
    async removeAsync(key) {
      return key ? store.consume(key) : null;
    },
    consumeAsync: (key) => store.consume(key),
    saveIfAbsentAsync: (key, value, expiresAtMs) =>
      store.saveIfAbsent(key, value, expiresAtMs),
  };
}

export function samlConfig(
  env: SamlEnv,
  cacheProvider: CacheProvider,
): SamlConfig {
  return {
    entryPoint: env.ssoUrl,
    idpCert: env.idpCert,
    ...(env.idpIssuer ? { idpIssuer: env.idpIssuer } : {}),
    issuer: env.spEntityId,
    callbackUrl: env.acsUrl,
    // Google Workspace's default NameID is the primary email.
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    audience: env.spEntityId,
    // Reject anything the IdP did not sign, and anything we did not ask for.
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    validateInResponseTo: "always" as ValidateInResponseTo,
    requestIdExpirationPeriodMs: 10 * 60_000,
    rejectReplayedAssertions: true,
    acceptedClockSkewMs: 60_000,
    maxAssertionAgeMs: 5 * 60_000,
    disableRequestedAuthnContext: true,
    cacheProvider,
  };
}

export async function createSamlClient(env = samlEnv()): Promise<SAML | null> {
  if (!env) return null;
  const { SAML: SamlClient } = await import("@node-saml/node-saml");

  return new SamlClient(
    samlConfig(env, cacheProviderFrom(await prismaSeenStore())),
  );
}

/** The email a Profile carries, from the configured attribute or the usual places. */
export function emailFromProfile(
  profile: Profile,
  env: SamlEnv,
): string | null {
  const candidates = [
    env.emailAttribute ? profile[env.emailAttribute] : undefined,
    profile.email,
    profile.mail,
    profile["urn:oid:0.9.2342.19200300.100.1.3"],
    profile.nameID,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.includes("@")) {
      return candidate.trim().toLowerCase();
    }
  }

  return null;
}

export function nameFromProfile(profile: Profile, env: SamlEnv): string | null {
  const value = env.nameAttribute ? profile[env.nameAttribute] : undefined;

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** True when the email's domain is allowed. An empty allowlist allows every domain. */
export function isDomainAllowed(email: string, allowed: string[]) {
  if (!allowed.length) return true;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  return allowed.includes(domain);
}

/** Only same-site relative paths may be used as the post-login destination. */
export function safeCallbackPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/onboarding";
  }
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value))
    return "/onboarding";

  return value;
}

function ticketSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) throw new Error("AUTH_SECRET is required to sign SAML tickets");

  return secret;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * A short-lived, signed proof that the IdP just authenticated `email`.
 * Format: base64url(JSON{email,name,exp}) + "." + HMAC. Only our ACS route mints one,
 * and only the `saml` credentials provider redeems it.
 */
export function mintSamlTicket(
  input: { email: string; name?: string | null },
  nowMs = Date.now(),
  secret = ticketSecret(),
) {
  const payload = Buffer.from(
    JSON.stringify({
      email: input.email.toLowerCase(),
      name: input.name ?? null,
      exp: Math.floor(nowMs / 1000) + SAML_TICKET_TTL_SECONDS,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the email and name when the ticket is authentic and unexpired, otherwise null. */
export function verifySamlTicket(
  ticket: string,
  nowMs = Date.now(),
  secret = ticketSecret(),
): { email: string; name: string | null } | null {
  const [payload, signature, ...rest] = ticket.split(".");

  if (!payload || !signature || rest.length) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);

  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      email?: unknown;
      name?: unknown;
      exp?: unknown;
    };

    if (typeof data.email !== "string" || typeof data.exp !== "number") {
      return null;
    }
    if (data.exp * 1000 < nowMs) return null;

    return {
      email: data.email,
      name: typeof data.name === "string" ? data.name : null,
    };
  } catch {
    return null;
  }
}

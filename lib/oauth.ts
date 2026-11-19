/**
 * Pure OAuth helpers: PKCE, redirect-URI matching, scopes. The database side is in
 * `lib/services/oauth.ts`.
 *
 * We implement the authorization-code flow with PKCE (RFC 7636, S256 only; `plain` is refused).
 * Redirect URIs are compared exactly, never by prefix, and must be https (or http on localhost).
 */

import { createHash, timingSafeEqual } from "node:crypto";

export const SCOPES = {
  read: "Read issues, projects and comments",
  write: "Read and change issues, projects and comments",
} as const;

export type Scope = keyof typeof SCOPES;

export const CODE_TTL_MS = 10 * 60_000;
export const MAX_REDIRECT_URIS = 10;

export function parseScope(raw: string | null | undefined): Scope | null {
  const wanted = (raw ?? "read").trim() || "read";

  return wanted === "read" || wanted === "write" ? wanted : null;
}

/** `read` tokens may only be used by the app as a guest-level key; `write` as a member. */
export function roleForScope(scope: string): "GUEST" | "MEMBER" {
  return scope === "write" ? "MEMBER" : "GUEST";
}

export function isValidRedirectUri(uri: string): boolean {
  let url: URL;

  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.hash) return false; // fragments are not allowed in redirect URIs
  if (url.protocol === "https:") return true;

  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  );
}

/** Exact string match against the registered list. */
export function redirectUriAllowed(registered: string[], uri: string): boolean {
  return registered.includes(uri);
}

/** BASE64URL(SHA256(verifier)), what the client sends as `code_challenge`. */
export function s256(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** RFC 7636: a verifier is 43 to 128 characters from `A-Z a-z 0-9 - . _ ~`. */
export function isValidVerifier(verifier: string): boolean {
  return /^[A-Za-z0-9\-._~]{43,128}$/.test(verifier);
}

/** A challenge is a 43-character base64url SHA-256 digest. */
export function isValidChallenge(challenge: string): boolean {
  return /^[A-Za-z0-9\-_]{43}$/.test(challenge);
}

export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!isValidVerifier(verifier) || !isValidChallenge(challenge)) return false;
  const expected = Buffer.from(s256(verifier));
  const given = Buffer.from(challenge);

  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Add `code` / `state` (or `error`) to a redirect URI without disturbing its existing query. */
export function redirectWith(
  uri: string,
  params: Record<string, string | undefined>,
): string {
  const url = new URL(uri);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  return url.toString();
}

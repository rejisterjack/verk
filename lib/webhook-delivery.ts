/**
 * Pure rules for outgoing webhooks: the retry schedule and the destination check.
 *
 * Retries back off at 1, 5, 30 minutes and 2 hours, then the delivery is marked failed. A
 * receiver that answers 4xx (except 408 and 429) is telling us the request itself is wrong, so
 * it is not retried.
 */

export const RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
] as const;

export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;
export const DELIVERY_TIMEOUT_MS = 10_000;
export const KEEP_DELIVERIES_DAYS = 14;

export function shouldRetry(code: number | null): boolean {
  if (code === null) return true; // network error or timeout
  if (code >= 500) return true;

  return code === 408 || code === 429;
}

/** When the next attempt is due after `attempts` failed ones, or null once we should give up. */
export function nextAttemptAt(
  attempts: number,
  code: number | null,
  now: Date = new Date(),
): Date | null {
  if (!shouldRetry(code)) return null;
  const delay = RETRY_DELAYS_MS[attempts - 1];

  return delay === undefined ? null : new Date(now.getTime() + delay);
}

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // carrier-grade NAT
];

/**
 * Refuse destinations that point inside our own network (server-side request forgery): non-http
 * schemes, localhost, private and link-local IPv4/IPv6 literals and `.internal`/`.local` names.
 * Hostnames that merely resolve to a private address are not caught here; this is the cheap,
 * always-on check, and `WEBHOOK_ALLOW_PRIVATE=1` turns it off for local development.
 */
export function isSafeWebhookUrl(
  raw: string,
  allowPrivate = process.env.WEBHOOK_ALLOW_PRIVATE === "1",
): boolean {
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  if (allowPrivate) return true;
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.endsWith(".internal") || host.endsWith(".local")) return false;
  if (PRIVATE_V4.some((pattern) => pattern.test(host))) return false;
  if (host.includes(":")) {
    // IPv6 literal: loopback, unspecified, unique-local, link-local, and mapped IPv4.
    if (host === "::1" || host === "::") return false;
    if (/^f[cd]/.test(host) || /^fe[89ab]/.test(host)) return false;
    if (host.startsWith("::ffff:")) return false;
  }
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) return false; // integer / hex IPs

  return true;
}

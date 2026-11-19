import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  MAX_ATTEMPTS,
  RETRY_DELAYS_MS,
  isSafeWebhookUrl,
  nextAttemptAt,
  shouldRetry,
} from "@/lib/webhook-delivery";
import { signWebhookBody } from "@/lib/webhook-sign";

describe("shouldRetry", () => {
  it("retries network errors, 5xx, 408 and 429", () => {
    expect(shouldRetry(null)).toBe(true);
    expect(shouldRetry(500)).toBe(true);
    expect(shouldRetry(503)).toBe(true);
    expect(shouldRetry(408)).toBe(true);
    expect(shouldRetry(429)).toBe(true);
  });

  it("does not retry other 4xx or successes", () => {
    expect(shouldRetry(400)).toBe(false);
    expect(shouldRetry(404)).toBe(false);
    expect(shouldRetry(410)).toBe(false);
    expect(shouldRetry(200)).toBe(false);
  });
});

describe("nextAttemptAt", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("backs off 1 min, 5 min, 30 min, 2 h", () => {
    expect(nextAttemptAt(1, 500, now)?.getTime()).toBe(now.getTime() + 60_000);
    expect(nextAttemptAt(2, 500, now)?.getTime()).toBe(
      now.getTime() + 5 * 60_000,
    );
    expect(nextAttemptAt(3, null, now)?.getTime()).toBe(
      now.getTime() + 30 * 60_000,
    );
    expect(nextAttemptAt(4, 502, now)?.getTime()).toBe(
      now.getTime() + 2 * 60 * 60_000,
    );
  });

  it("gives up after the schedule is used up", () => {
    expect(RETRY_DELAYS_MS).toHaveLength(4);
    expect(MAX_ATTEMPTS).toBe(5);
    expect(nextAttemptAt(5, 500, now)).toBeNull();
  });

  it("gives up straight away on a permanent client error", () => {
    expect(nextAttemptAt(1, 404, now)).toBeNull();
  });
});

describe("isSafeWebhookUrl (SSRF guard)", () => {
  const safe = (url: string) => isSafeWebhookUrl(url, false);

  it("accepts a public https URL", () => {
    expect(safe("https://hooks.example.com/verk")).toBe(true);
    expect(safe("https://8.8.8.8/hook")).toBe(true);
  });

  it("refuses plain http, other schemes and garbage", () => {
    expect(safe("http://hooks.example.com/verk")).toBe(false);
    expect(safe("ftp://hooks.example.com")).toBe(false);
    expect(safe("file:///etc/passwd")).toBe(false);
    expect(safe("not a url")).toBe(false);
  });

  it("refuses credentials in the URL", () => {
    expect(safe("https://user:pass@example.com/")).toBe(false);
  });

  it("refuses localhost and internal names", () => {
    expect(safe("https://localhost/hook")).toBe(false);
    expect(safe("https://app.localhost/hook")).toBe(false);
    expect(safe("https://db.internal/hook")).toBe(false);
    expect(safe("https://printer.local/hook")).toBe(false);
  });

  it("refuses private, loopback, link-local and carrier-grade IPv4", () => {
    for (const host of [
      "10.0.0.1",
      "127.0.0.1",
      "169.254.169.254",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "0.0.0.0",
      "100.64.0.1",
    ]) {
      expect(safe(`https://${host}/hook`), host).toBe(false);
    }
    expect(safe("https://172.32.0.1/hook")).toBe(true);
  });

  it("refuses private IPv6 literals", () => {
    for (const host of ["[::1]", "[::]", "[fd00::1]", "[fe80::1]", "[::ffff:127.0.0.1]"]) {
      expect(safe(`https://${host}/hook`), host).toBe(false);
    }
  });

  it("refuses integer and hex IP spellings", () => {
    expect(safe("https://2130706433/hook")).toBe(false);
    expect(safe("https://0x7f000001/hook")).toBe(false);
  });

  it("allows private targets and plain http only when explicitly enabled", () => {
    expect(isSafeWebhookUrl("http://localhost:3000/hook", true)).toBe(true);
    expect(isSafeWebhookUrl("ftp://localhost/hook", true)).toBe(false);
    expect(isSafeWebhookUrl("https://user:pw@localhost/", true)).toBe(false);
  });
});

describe("signWebhookBody", () => {
  it("is deterministic for the same secret and body", () => {
    expect(signWebhookBody("s", "{}")).toBe(signWebhookBody("s", "{}"));
  });

  it("changes with the secret or the body", () => {
    expect(signWebhookBody("s", "{}")).not.toBe(signWebhookBody("t", "{}"));
    expect(signWebhookBody("s", "{}")).not.toBe(signWebhookBody("s", "{ }"));
  });

  it("is an HMAC-SHA256 of the body", () => {
    const expected = createHmac("sha256", "secret").update("body").digest("hex");

    expect(signWebhookBody("secret", "body")).toContain(expected);
  });
});
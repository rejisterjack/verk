import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  describeSentry,
  parseSentry,
  priorityForLevel,
  safeUrl,
  verifySentrySignature,
} from "@/lib/sentry";

const sign = (secret: string, body: string) =>
  createHmac("sha256", secret).update(body).digest("hex");

describe("verifySentrySignature", () => {
  const body = JSON.stringify({ action: "created" });

  it("accepts the HMAC-SHA256 of the raw body", () => {
    expect(verifySentrySignature("s3cret", body, sign("s3cret", body))).toBe(true);
  });

  it("is case-insensitive about the hex but strict about everything else", () => {
    expect(verifySentrySignature("s3cret", body, sign("s3cret", body).toUpperCase())).toBe(true);
    expect(verifySentrySignature("other", body, sign("s3cret", body))).toBe(false);
    expect(verifySentrySignature("s3cret", `${body} `, sign("s3cret", body))).toBe(false);
  });

  it("rejects an empty secret or signature and a wrong-length value without throwing", () => {
    expect(verifySentrySignature("", body, sign("", body))).toBe(false);
    expect(verifySentrySignature("s3cret", body, "")).toBe(false);
    expect(verifySentrySignature("s3cret", body, "abc")).toBe(false);
  });
});

describe("priorityForLevel", () => {
  it("maps Sentry levels to priorities", () => {
    expect(priorityForLevel("fatal")).toBe("URGENT");
    expect(priorityForLevel("ERROR")).toBe("HIGH");
    expect(priorityForLevel("warning")).toBe("MEDIUM");
    expect(priorityForLevel("info")).toBe("LOW");
    expect(priorityForLevel("debug")).toBe("LOW");
    expect(priorityForLevel(undefined)).toBe("LOW");
  });
});

describe("safeUrl", () => {
  it("keeps http(s) links and drops everything else", () => {
    expect(safeUrl("https://sentry.io/organizations/x/issues/1/")).toBe(
      "https://sentry.io/organizations/x/issues/1/",
    );
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("data:text/html,<script>")).toBe("");
    expect(safeUrl("not a url")).toBe("");
    expect(safeUrl(undefined)).toBe("");
  });
});

describe("parseSentry: issue.created", () => {
  const payload = {
    action: "created",
    data: {
      issue: {
        id: "1234",
        title: "TypeError: x is undefined",
        level: "fatal",
        culprit: "app/page.tsx in render",
        web_url: "https://sentry.io/organizations/acme/issues/1234/",
        project: { slug: "web" },
      },
    },
  };

  it("turns a new Sentry issue into issue fields", () => {
    const result = parseSentry("issue", payload);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issue).toMatchObject({
        key: "issue:1234",
        title: "TypeError: x is undefined",
        level: "fatal",
        priority: "URGENT",
        project: "web",
        url: "https://sentry.io/organizations/acme/issues/1234/",
      });
    }
  });

  it("ignores other actions on an issue (assigned, resolved, ...)", () => {
    for (const action of ["assigned", "resolved", "ignored", "archived"]) {
      expect(parseSentry("issue", { ...payload, action })).toEqual({
        ok: false,
        reason: "ignored",
      });
    }
  });

  it("calls a payload without an id or title invalid, not a crash", () => {
    expect(parseSentry("issue", { action: "created", data: { issue: { title: "x" } } })).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(parseSentry("issue", { action: "created", data: {} })).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(parseSentry("issue", null)).toEqual({ ok: false, reason: "ignored" });
  });

  it("defaults the level to error and drops an unsafe link", () => {
    const result = parseSentry("issue", {
      action: "created",
      data: { issue: { id: "9", title: "Boom", web_url: "javascript:alert(1)" } },
    });

    expect(result.ok && result.issue.level).toBe("error");
    expect(result.ok && result.issue.priority).toBe("HIGH");
    expect(result.ok && result.issue.url).toBe("");
  });

  it("caps very long titles", () => {
    const result = parseSentry("issue", {
      action: "created",
      data: { issue: { id: "1", title: "x".repeat(500) } },
    });

    expect(result.ok && result.issue.title).toHaveLength(160);
  });
});

describe("parseSentry: event_alert", () => {
  it("uses the same key as the issue, so an alert and an issue event make one Verk issue", () => {
    const fromIssue = parseSentry("issue", {
      action: "created",
      data: { issue: { id: "77", title: "Boom" } },
    });
    const fromAlert = parseSentry("event_alert", {
      data: { event: { issue_id: "77", title: "Boom", level: "warning", web_url: "https://sentry.io/x" } },
    });

    expect(fromIssue.ok && fromAlert.ok && fromIssue.issue.key === fromAlert.issue.key).toBe(true);
    expect(fromAlert.ok && fromAlert.issue.priority).toBe("MEDIUM");
  });

  it("falls back across the field names Sentry has used", () => {
    const result = parseSentry("event_alert", {
      data: { event: { groupID: "5", message: "Slow query", url: "https://sentry.io/y" } },
    });

    expect(result.ok && result.issue.title).toBe("Slow query");
    expect(result.ok && result.issue.url).toBe("https://sentry.io/y");
  });
});

describe("parseSentry: everything else", () => {
  it("ignores resources it does not handle", () => {
    for (const resource of ["metric_alert", "comment", "error", "installation", ""]) {
      expect(parseSentry(resource, { action: "created", data: {} })).toEqual({
        ok: false,
        reason: "ignored",
      });
    }
  });
});

describe("describeSentry", () => {
  it("lists the useful facts as plain text and skips empty ones", () => {
    const text = describeSentry({
      key: "issue:1",
      title: "t",
      url: "https://sentry.io/x",
      level: "error",
      culprit: "a.ts",
      project: "web",
      priority: "HIGH",
    });

    expect(text).toContain("Reported by Sentry.");
    expect(text).toContain("Level: error");
    expect(text).toContain("Project: web");
    expect(text).toContain("Where: a.ts");
    expect(text).toContain("Link: https://sentry.io/x");
    expect(
      describeSentry({ key: "k", title: "t", url: "", level: "error", culprit: "", project: "", priority: "HIGH" }),
    ).not.toContain("Link:");
  });
});
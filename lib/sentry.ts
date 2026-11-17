/**
 * Sentry webhooks, as pure functions: signature check and turning a payload into an issue.
 *
 * Sentry signs the raw request body with HMAC-SHA256 (hex) using the integration's client secret
 * and sends it in `Sentry-Hook-Signature`; `Sentry-Hook-Resource` names the kind of event. This
 * file understands the two that matter for a backlog:
 *  - `issue` with action `created`: a new error group appeared;
 *  - `event_alert`: an alert rule fired for an event.
 * Everything else (assigned, resolved, comments, metric alerts...) is ignored on purpose, so a
 * busy Sentry project cannot flood the tracker with noise.
 *
 * The payload shape follows Sentry's published webhook docs. The parser is defensive: a field it
 * does not find is skipped, never a crash, because Sentry versions differ.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySentrySignature(
  secret: string,
  rawBody: string,
  signature: string,
): boolean {
  if (!secret || !signature) return false;
  const expected = Buffer.from(
    createHmac("sha256", secret).update(rawBody, "utf8").digest("hex"),
  );
  const given = Buffer.from(signature.trim().toLowerCase());

  return expected.length === given.length && timingSafeEqual(expected, given);
}

export type SentryPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

/** fatal and error are urgent signals; warnings are worth a look; the rest is background. */
export function priorityForLevel(level: string | undefined): SentryPriority {
  switch ((level ?? "").toLowerCase()) {
    case "fatal":
      return "URGENT";
    case "error":
      return "HIGH";
    case "warning":
      return "MEDIUM";
    default:
      return "LOW";
  }
}

export type SentryIssue = {
  /** Stable per Sentry issue, so a retry or a second alert for it makes one Verk issue. */
  key: string;
  title: string;
  url: string;
  level: string;
  culprit: string;
  project: string;
  priority: SentryPriority;
};

export type SentryParse =
  | { ok: true; issue: SentryIssue }
  | { ok: false; reason: "ignored" | "invalid" };

const str = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Only http(s) links are kept, so a payload cannot smuggle a `javascript:` URL into the UI. */
export function safeUrl(value: unknown): string {
  const text = str(value);

  try {
    const url = new URL(text);

    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export function parseSentry(resource: string, payload: unknown): SentryParse {
  const body = record(payload);
  const action = str(body.action);
  const data = record(body.data);

  if (resource === "issue") {
    if (action !== "created") return { ok: false, reason: "ignored" };
    const issue = record(data.issue);
    const id = str(issue.id) || str(issue.shortId);
    const title = str(issue.title);

    if (!id || !title) return { ok: false, reason: "invalid" };
    const level = str(issue.level) || "error";

    return {
      ok: true,
      issue: {
        key: `issue:${id}`,
        title: title.slice(0, 160),
        url: safeUrl(issue.web_url) || safeUrl(issue.permalink),
        level,
        culprit: str(issue.culprit).slice(0, 200),
        project:
          str(record(issue.project).slug) || str(record(issue.project).name),
        priority: priorityForLevel(level),
      },
    };
  }

  if (resource === "event_alert") {
    const event = record(data.event);
    const id = str(event.issue_id) || str(event.groupID) || str(event.event_id);
    const title = str(event.title) || str(event.message);

    if (!id || !title) return { ok: false, reason: "invalid" };
    const level = str(event.level) || "error";

    return {
      ok: true,
      issue: {
        key: `issue:${id}`,
        title: title.slice(0, 160),
        url: safeUrl(event.web_url) || safeUrl(event.url),
        level,
        culprit: str(event.culprit).slice(0, 200),
        project: str(event.project_name) || str(event.project),
        priority: priorityForLevel(level),
      },
    };
  }

  return { ok: false, reason: "ignored" };
}

/** Plain-text description for the new issue. The link is also stored as a real issue link. */
export function describeSentry(issue: SentryIssue): string {
  return [
    "Reported by Sentry.",
    "",
    `Level: ${issue.level}`,
    issue.project ? `Project: ${issue.project}` : "",
    issue.culprit ? `Where: ${issue.culprit}` : "",
    issue.url ? `Link: ${issue.url}` : "",
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n")
    .trim();
}

import { createHmac, timingSafeEqual } from "node:crypto";

/** Slack's own guidance: reject requests more than five minutes old. */
export const SLACK_MAX_AGE_SECONDS = 5 * 60;

/**
 * Verify a Slack request signature AND that its timestamp is fresh.
 * A validly signed body replayed later (or with a forged far-future timestamp)
 * is rejected. `nowMs` is injectable for tests.
 */
export function verifySlackSignature(
  secret: string,
  body: string,
  timestamp: string,
  signature: string,
  nowMs: number = Date.now(),
) {
  if (!secret || !timestamp || !signature) return false;

  const sentAt = Number(timestamp);

  if (!Number.isFinite(sentAt)) return false;
  if (Math.abs(nowMs / 1000 - sentAt) > SLACK_MAX_AGE_SECONDS) return false;

  const base = `v0:${timestamp}:${body}`;
  const digest = `v0=${createHmac("sha256", secret).update(base).digest("hex")}`;
  const left = Buffer.from(digest);
  const right = Buffer.from(signature);

  return left.length === right.length && timingSafeEqual(left, right);
}

export type SlackCommand =
  | { kind: "usage" }
  | { kind: "assign"; number: number; email: string }
  | { kind: "status"; number: number; status: string }
  | { kind: "create"; title: string; customer: string | null };

export function parseSlackText(text: string): SlackCommand {
  const trimmed = text.trim();

  if (!trimmed) return { kind: "usage" };
  const assign = trimmed.match(/^assign\s+(\d+)\s+(\S+)/i);
  const statusChange = trimmed.match(/^status\s+(\d+)\s+(\S+)/i);

  if (assign) {
    return {
      kind: "assign",
      number: Number(assign[1]),
      email: assign[2].replace(/^@/, ""),
    };
  }
  if (statusChange) {
    return {
      kind: "status",
      number: Number(statusChange[1]),
      status: statusChange[2].toUpperCase(),
    };
  }

  const prefixed = trimmed.match(/^customer:(\S+)\s+([\s\S]+)$/i);
  const trailed = trimmed.match(/^([\s\S]+?)\s+\|\s+(\S+)$/);

  if (prefixed) {
    return { kind: "create", title: prefixed[2].trim(), customer: prefixed[1] };
  }
  if (trailed) {
    return { kind: "create", title: trailed[1].trim(), customer: trailed[2] };
  }

  return { kind: "create", title: trimmed, customer: null };
}

/** `<@U123> fix the login bug` -> `fix the login bug`. Also strips Slack's `<mailto:...>` and link wrappers. */
export function stripSlackMentions(text: string): string {
  return text
    .replace(/<@[A-Z0-9]+(?:\|[^>]*)?>/g, "")
    .replace(/<mailto:([^|>]+)(?:\|[^>]*)?>/g, "$1")
    .replace(/<(https?:[^|>]+)\|([^>]+)>/g, "$2 ($1)")
    .replace(/<(https?:[^>]+)>/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** First line becomes the title (max 200 chars), the whole text becomes the description. */
export function titleFromMessage(text: string): {
  title: string;
  body: string;
} {
  const clean = text.trim();
  const firstLine = clean.split(/\r?\n/)[0]?.trim() ?? "";
  const title = (firstLine || "Slack message").slice(0, 200);

  return { title, body: clean };
}

type SlackFetch = typeof fetch;

/** Look up a Slack user's email via `users.info`. Needs the `users:read.email` scope. */
export async function fetchSlackUserEmail(
  slackUserId: string,
  token: string,
  fetchImpl: SlackFetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl(
      `https://slack.com/api/users.info?user=${encodeURIComponent(slackUserId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(4000),
      },
    );
    const data = (await response.json()) as {
      ok?: boolean;
      user?: { profile?: { email?: string } };
    };

    if (!data.ok) return null;

    return data.user?.profile?.email?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

/** Permalink to a message, via `chat.getPermalink`. Null when Slack refuses or is unreachable. */
export async function fetchSlackPermalink(
  input: { token: string; channel: string; messageTs: string },
  fetchImpl: SlackFetch = fetch,
): Promise<string | null> {
  try {
    const query = new URLSearchParams({
      channel: input.channel,
      message_ts: input.messageTs,
    });
    const response = await fetchImpl(
      `https://slack.com/api/chat.getPermalink?${query}`,
      {
        headers: { Authorization: `Bearer ${input.token}` },
        signal: AbortSignal.timeout(4000),
      },
    );
    const data = (await response.json()) as {
      ok?: boolean;
      permalink?: string;
    };

    return data.ok && data.permalink ? data.permalink : null;
  } catch {
    return null;
  }
}

/** Post a message with the bot token. Never throws; returns whether Slack accepted it. */
export async function postSlackMessage(
  input: { token: string; channel: string; text: string; threadTs?: string },
  fetchImpl: SlackFetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: input.channel,
        text: input.text,
        ...(input.threadTs ? { thread_ts: input.threadTs } : {}),
      }),
      signal: AbortSignal.timeout(4000),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean };

    return response.ok && data.ok !== false;
  } catch {
    return false;
  }
}

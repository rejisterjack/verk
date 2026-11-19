/**
 * Slack link unfurling: turn a pasted Verk issue URL into a small preview card. This file is
 * pure (URL parsing and the card shape); `lib/services/slack-unfurl.ts` does the lookups.
 */

export type IssueLink = { slug: string; number: number; url: string };

/**
 * `https://<our host>/t/<team>/issues/<number>`, matched against our own host only so a link to
 * another site with the same path is never "unfurled" as ours.
 */
export function parseIssueLink(url: string, host: string): IssueLink | null {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.host.toLowerCase() !== host.toLowerCase()) return null;
  const match = /^\/t\/([a-z0-9-]+)\/issues\/(\d{1,9})\/?$/i.exec(
    parsed.pathname,
  );

  if (!match) return null;

  return {
    slug: match[1]!.toLowerCase(),
    number: Number(match[2]),
    url: parsed.toString(),
  };
}

const STATUS_EMOJI: Record<string, string> = {
  BACKLOG: "⚪",
  TODO: "🔵",
  IN_PROGRESS: "🟡",
  DONE: "🟢",
  CANCELLED: "⚫",
};

export type UnfurlIssue = {
  key: string;
  title: string;
  status: string;
  priority: string;
  assignee: string | null;
  description: string;
};

/** Slack escapes only these three characters in message text. */
export function escapeSlack(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function unfurlBlocks(issue: UnfurlIssue, url: string) {
  const status = issue.status.replace("_", " ").toLowerCase();
  const lines = [
    `*<${url}|${escapeSlack(issue.key)}: ${escapeSlack(issue.title)}>*`,
    `${STATUS_EMOJI[issue.status] ?? "⚪"} ${status} · ${issue.priority.toLowerCase()}${
      issue.assignee ? ` · ${escapeSlack(issue.assignee)}` : " · unassigned"
    }`,
  ];
  const summary = issue.description.replace(/\s+/g, " ").trim().slice(0, 200);

  if (summary) lines.push(escapeSlack(summary));

  return [
    { type: "section", text: { type: "mrkdwn", text: lines.join("\n") } },
  ];
}

/**
 * Pure decisions for the GitHub integration: which issues a pull request mentions, whether it
 * says it closes them, and what each GitHub event should do. The route and the service do the I/O.
 *
 * Issue keys look like `ENG-12` (the first three letters of the team slug, or the whole slug).
 * "Closing" words follow GitHub's own list: close(s/d), fix(es/ed), resolve(s/d). They only count
 * directly before a key, so "this does not fix ENG-12" is still read as a close; people who want
 * a link without closing just leave the verb out.
 */

const CLOSING = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\b[:\s]+$/i;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type MentionedIssue = { number: number; closes: boolean };

/** Every distinct issue key in `text` for this team, with whether a closing word precedes it. */
export function findMentions(text: string, teamSlug: string): MentionedIssue[] {
  const prefixes = [...new Set([teamSlug.slice(0, 3), teamSlug])]
    .filter(Boolean)
    .map(escapeRegExp)
    .join("|");

  if (!prefixes) return [];
  const pattern = new RegExp(
    `(?<![A-Za-z0-9])(?:${prefixes})-(\\d{1,9})\\b`,
    "gi",
  );
  const found = new Map<number, boolean>();

  for (const match of text.matchAll(pattern)) {
    const number = Number(match[1]);
    const before = text.slice(Math.max(0, match.index - 24), match.index);
    const closes = CLOSING.test(before);

    // Seeing a key twice, once with a closing word, counts as closing.
    found.set(number, (found.get(number) ?? false) || closes);
  }

  return [...found].map(([number, closes]) => ({ number, closes }));
}

export type PullRequestPayload = {
  action?: string;
  number?: number;
  pull_request?: {
    title?: string;
    body?: string | null;
    html_url?: string;
    merged?: boolean;
    draft?: boolean;
    head?: { ref?: string };
    user?: { login?: string };
  };
  review?: { state?: string; user?: { login?: string } };
  repository?: { full_name?: string };
};

export type PullRequestAction =
  | { kind: "link" }
  | { kind: "started" } // opened or ready for review: move to In progress
  | { kind: "merged" }
  | { kind: "closed_unmerged" }
  | { kind: "ignore" };

/** What a `pull_request` event means for the issues it mentions. */
export function classifyPullRequest(
  payload: PullRequestPayload,
): PullRequestAction {
  const pr = payload.pull_request;

  if (!pr) return { kind: "ignore" };
  switch (payload.action) {
    case "opened":
    case "reopened":
      return pr.draft ? { kind: "link" } : { kind: "started" };
    case "ready_for_review":
      return { kind: "started" };
    case "edited":
    case "synchronize":
      return { kind: "link" };
    case "closed":
      return pr.merged ? { kind: "merged" } : { kind: "closed_unmerged" };
    default:
      return { kind: "ignore" };
  }
}

/** Text to search for issue keys: title, description and the branch name. */
export function pullRequestText(payload: PullRequestPayload): string {
  const pr = payload.pull_request;

  return [pr?.title, pr?.body, pr?.head?.ref].filter(Boolean).join("\n");
}

/** `eng-12-fix-login` style branch names: the key is the leading part. */
export function branchName(issueKey: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");

  return `${issueKey.toLowerCase()}${slug ? `-${slug}` : ""}`;
}

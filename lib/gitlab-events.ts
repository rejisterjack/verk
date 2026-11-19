/**
 * Pure decisions for the GitLab integration. It mirrors the GitHub one: a merge request that
 * mentions `ENG-12` is linked to that issue, opening it starts the issue, and merging it finishes
 * the issue when the text says "fixes ENG-12" or the team turned on "merging completes issues".
 * Key matching and closing words are shared with GitHub (`lib/github-events.ts`).
 *
 * GitLab does not sign webhooks. It sends the secret you configure verbatim in `X-Gitlab-Token`,
 * so verification is a constant-time comparison of that header.
 */

import { createHash, timingSafeEqual } from "node:crypto";

export type MergeRequestPayload = {
  object_kind?: string;
  event_type?: string;
  object_attributes?: {
    iid?: number;
    title?: string;
    description?: string | null;
    url?: string;
    action?: string;
    state?: string;
    draft?: boolean;
    work_in_progress?: boolean;
    source_branch?: string;
  };
  project?: { path_with_namespace?: string };
};

export type MergeRequestAction =
  | { kind: "link" }
  | { kind: "started" }
  | { kind: "merged" }
  | { kind: "closed_unmerged" }
  | { kind: "ignore" };

/** What a `merge_request` event means for the issues it mentions. */
export function classifyMergeRequest(
  payload: MergeRequestPayload,
): MergeRequestAction {
  const mr = payload.object_attributes;
  const kind = payload.object_kind ?? payload.event_type;

  if (!mr || kind !== "merge_request") return { kind: "ignore" };
  const draft = Boolean(mr.draft ?? mr.work_in_progress);

  switch (mr.action) {
    case "open":
    case "reopen":
      return draft ? { kind: "link" } : { kind: "started" };
    case "update":
      // Taking the draft flag off ("ready") is not reported as its own action; an update to a
      // non-draft request is treated as a link, never a state change.
      return { kind: "link" };
    case "merge":
      return { kind: "merged" };
    case "close":
      return { kind: "closed_unmerged" };
    default:
      return { kind: "ignore" };
  }
}

/** Text to search for issue keys: title, description and the source branch. */
export function mergeRequestText(payload: MergeRequestPayload): string {
  const mr = payload.object_attributes;

  return [mr?.title, mr?.description, mr?.source_branch]
    .filter(Boolean)
    .join("\n");
}

/** Compare the `X-Gitlab-Token` header to the configured secret without leaking length or content. */
export function verifyGitlabToken(secret: string, header: string): boolean {
  if (!secret || !header) return false;
  // Hash both so the comparison is over equal-length buffers.
  const a = createHash("sha256").update(secret).digest();
  const b = createHash("sha256").update(header).digest();

  return timingSafeEqual(a, b);
}

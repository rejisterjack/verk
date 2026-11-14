import { prisma } from "@/lib/db";
import { findMentions } from "@/lib/github-events";
import {
  classifyMergeRequest,
  type MergeRequestPayload,
  mergeRequestText,
  verifyGitlabToken,
} from "@/lib/gitlab-events";
import { rateLimitShared } from "@/lib/rate-limit";
import { addComment } from "@/lib/services/comments";
import { issueKey } from "@/lib/utils";

/**
 * GitLab webhook: add it under Settings → Webhooks with the "Merge request events" trigger and
 * the secret token from `GITLAB_WEBHOOK_SECRET`.
 *
 * For every issue key a merge request mentions in a team linked to that project:
 *  - the merge request is linked on the issue once, with a comment;
 *  - opening it (not as a draft) moves a backlog or todo issue to In progress;
 *  - merging it finishes the issue when the text says "fixes/closes/resolves ENG-12", or when the
 *    team turned on "merging completes issues".
 * Only teams whose `gitlabProject` matches `project.path_with_namespace` are ever touched.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!(await rateLimitShared(`gitlab-webhook:${ip}`)).ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const secret = process.env.GITLAB_WEBHOOK_SECRET;

  if (!secret) return new Response(null, { status: 404 });
  if (!verifyGitlabToken(secret, request.headers.get("x-gitlab-token") ?? "")) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }
  let event: MergeRequestPayload;

  try {
    event = (await request.json()) as MergeRequestPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const action = classifyMergeRequest(event);
  const project = event.project?.path_with_namespace;

  if (action.kind === "ignore" || !project) {
    return Response.json({ ok: true, skipped: true });
  }
  const teams = await prisma.team.findMany({
    where: { gitlabProject: project },
  });
  const text = mergeRequestText(event);
  const url = event.object_attributes?.url;
  const touched: string[] = [];

  for (const team of teams) {
    const mentions = findMentions(text, team.slug);

    if (!mentions.length) continue;
    const owner = await prisma.membership.findFirst({
      where: { teamId: team.id, role: "OWNER" },
      select: { userId: true },
    });

    if (!owner) continue;
    const { updateIssue } = await import("@/lib/services/issues");

    for (const mention of mentions) {
      const issue = await prisma.issue.findFirst({
        where: { teamId: team.id, number: mention.number, archivedAt: null },
        select: { id: true, status: true },
      });

      if (!issue) continue;
      const key = issueKey(team.slug, mention.number);

      if (url) {
        const existing = await prisma.issueLink.findFirst({
          where: { issueId: issue.id, kind: "gitlab", url },
        });

        if (!existing) {
          await prisma.issueLink.create({
            data: { issueId: issue.id, kind: "gitlab", url },
          });
          await addComment(team.id, issue.id, owner.userId, {
            body: `GitLab merge request ${url} mentions ${key} in ${project}.`,
          });
        }
      }
      if (
        action.kind === "started" &&
        (issue.status === "BACKLOG" || issue.status === "TODO")
      ) {
        await updateIssue(
          team.id,
          issue.id,
          { status: "IN_PROGRESS" },
          "OWNER",
          owner.userId,
        );
      }
      if (
        action.kind === "merged" &&
        (mention.closes || team.githubMergeCompletes) &&
        issue.status !== "DONE" &&
        issue.status !== "CANCELLED"
      ) {
        await updateIssue(
          team.id,
          issue.id,
          { status: "DONE" },
          "OWNER",
          owner.userId,
        );
      }
      touched.push(key);
    }
  }

  return Response.json({
    ok: true,
    linked: touched.length > 0,
    issues: touched,
  });
}

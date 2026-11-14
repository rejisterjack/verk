import { prisma } from "@/lib/db";
import {
  classifyPullRequest,
  findMentions,
  type PullRequestPayload,
  pullRequestText,
} from "@/lib/github-events";
import { verifyGithubSignature } from "@/lib/github";
import { rateLimitShared } from "@/lib/rate-limit";
import { addComment } from "@/lib/services/comments";
import { issueKey } from "@/lib/utils";

/**
 * GitHub webhook (set the content type to JSON and send `pull_request` events).
 *
 * For every issue key a pull request mentions in a team linked to that repository:
 *  - the pull request is linked on the issue once, with a comment;
 *  - opening it (not as a draft) or marking it ready moves a backlog or todo issue to In progress;
 *  - merging it finishes the issue when the text says "fixes/closes/resolves ENG-12", or when the
 *    team turned on "merging completes issues".
 * Only teams whose `githubRepo` matches `repository.full_name` are ever touched.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!(await rateLimitShared(`github-webhook:${ip}`)).ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) return new Response(null, { status: 404 });

  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";

  if (!signature || !verifyGithubSignature(secret, raw, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (request.headers.get("x-github-event") === "ping") {
    return Response.json({ ok: true, pong: true });
  }
  let event: PullRequestPayload;

  try {
    event = JSON.parse(raw) as PullRequestPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const action = classifyPullRequest(event);
  const repo = event.repository?.full_name;

  if (action.kind === "ignore" || !repo) {
    return Response.json({ ok: true, skipped: true });
  }
  const teams = await prisma.team.findMany({ where: { githubRepo: repo } });
  const text = pullRequestText(event);
  const url = event.pull_request?.html_url;
  const touched: string[] = [];

  for (const team of teams) {
    const mentions = findMentions(text, team.slug);

    if (!mentions.length) continue;
    const owner = await prisma.membership.findFirst({
      where: { teamId: team.id, role: "OWNER" },
      select: { userId: true },
    });

    if (!owner) continue;

    for (const mention of mentions) {
      const issue = await prisma.issue.findFirst({
        where: { teamId: team.id, number: mention.number, archivedAt: null },
        select: { id: true, status: true },
      });

      if (!issue) continue;
      const key = issueKey(team.slug, mention.number);

      if (url) {
        const existing = await prisma.issueLink.findFirst({
          where: { issueId: issue.id, kind: "github", url },
        });

        if (!existing) {
          await prisma.issueLink.create({
            data: { issueId: issue.id, kind: "github", url },
          });
          await addComment(team.id, issue.id, owner.userId, {
            body: `GitHub pull request ${url} mentions ${key} in ${repo}.`,
          });
        }
      }
      const { updateIssue } = await import("@/lib/services/issues");

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

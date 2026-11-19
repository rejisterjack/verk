import { prisma } from "@/lib/db";
import { parseIssueLink, unfurlBlocks } from "@/lib/slack-unfurl";
import { canSeeIssue } from "@/lib/services/guest-scope";
import { resolveSlackContext } from "@/lib/services/slack-intake";

export type LinkSharedEvent = {
  type?: string;
  user?: string;
  channel?: string;
  message_ts?: string;
  links?: { url?: string; domain?: string }[];
};

/**
 * For each shared link that is one of our issues AND that the Slack user is allowed to see, build
 * a card. Anything else is simply left out, so a link never reveals more than the person could
 * open themselves. Returns the `unfurls` map Slack expects (url to blocks).
 */
export async function buildUnfurls(
  slackTeamId: string | undefined,
  event: LinkSharedEvent,
  host: string,
): Promise<Record<string, { blocks: unknown[] }>> {
  const out: Record<string, { blocks: unknown[] }> = {};

  if (!event.user || !event.links?.length) return out;
  const resolved = await resolveSlackContext({
    slackTeamId,
    channelId: event.channel,
    slackUserId: event.user,
    fallbackSlug: process.env.SLACK_TEAM_SLUG,
  });

  if (!resolved.ok) return out;

  for (const link of event.links.slice(0, 10)) {
    const parsed = link.url ? parseIssueLink(link.url, host) : null;

    if (!parsed || parsed.slug !== resolved.context.team.slug) continue;
    const issue = await prisma.issue.findUnique({
      where: {
        teamId_number: {
          teamId: resolved.context.team.id,
          number: parsed.number,
        },
      },
      select: {
        number: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        projectId: true,
        archivedAt: true,
        assignee: { select: { name: true, email: true } },
      },
    });

    if (!issue || issue.archivedAt) continue;
    if (
      !(await canSeeIssue(
        resolved.context.team.id,
        resolved.context.userId,
        issue,
      ))
    ) {
      continue;
    }
    out[parsed.url] = {
      blocks: unfurlBlocks(
        {
          key: `${parsed.slug.slice(0, 3).toUpperCase()}-${issue.number}`,
          title: issue.title,
          status: issue.status,
          priority: issue.priority,
          assignee: issue.assignee
            ? (issue.assignee.name ?? issue.assignee.email)
            : null,
          description: issue.description,
        },
        parsed.url,
      ),
    };
  }

  return out;
}

/** Send the cards back with `chat.unfurl`. Failures are swallowed: the link just stays plain. */
export async function sendUnfurls(
  token: string,
  event: LinkSharedEvent,
  unfurls: Record<string, { blocks: unknown[] }>,
) {
  if (!token || !event.channel || !event.message_ts) return;
  if (!Object.keys(unfurls).length) return;
  try {
    await fetch("https://slack.com/api/chat.unfurl", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel: event.channel,
        ts: event.message_ts,
        unfurls,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // nothing to do
  }
}

import { rateLimitShared } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import * as issuesService from "@/lib/services/issues";
import {
  createIssueFromSlack,
  resolveSlackContext,
  SLACK_REFUSAL,
} from "@/lib/services/slack-intake";
import { parseSlackText, verifySlackSignature } from "@/lib/slack";

const ephemeral = (text: string) =>
  Response.json({ response_type: "ephemeral", text });

const STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"];

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!(await rateLimitShared(`slack:${ip}`)).ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_BOT_TOKEN) {
    return Response.json({ error: "Slack is not configured" }, { status: 404 });
  }
  const raw = await request.text();

  if (
    !verifySlackSignature(
      process.env.SLACK_SIGNING_SECRET,
      raw,
      request.headers.get("x-slack-request-timestamp") ?? "",
      request.headers.get("x-slack-signature") ?? "",
    )
  ) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(raw);
  const command = parseSlackText(params.get("text")?.trim() ?? "");

  if (command.kind === "usage") {
    return ephemeral(
      "Usage: /verk <issue title>, /verk customer:Acme <title>, /verk assign <number> <email>, /verk status <number> <status>",
    );
  }

  // Who is asking, and in which team? They act as THEIR Verk member, with their own role.
  const resolved = await resolveSlackContext({
    slackTeamId: params.get("team_id"),
    channelId: params.get("channel_id"),
    slackUserId: params.get("user_id") ?? "",
    fallbackSlug: process.env.SLACK_TEAM_SLUG,
  });

  if (!resolved.ok) return ephemeral(SLACK_REFUSAL[resolved.reason]);
  const { team, userId, role } = resolved.context;

  if (command.kind === "assign" || command.kind === "status") {
    if (role === "GUEST") return ephemeral("Guests can't change issues.");
    const existing = await issuesService.getIssueByNumber(
      team.id,
      command.number,
    );

    if (!existing) return ephemeral("Issue was not found.");

    if (command.kind === "assign") {
      const member = await prisma.membership.findFirst({
        where: {
          teamId: team.id,
          user: { email: command.email.toLowerCase(), disabled: false },
        },
      });

      if (!member) return ephemeral("Member was not found.");
      await issuesService.updateIssue(
        team.id,
        existing.id,
        { assigneeId: member.userId },
        role,
        userId,
      );
    } else {
      if (!STATUSES.includes(command.status)) {
        return ephemeral(`Status must be one of ${STATUSES.join(", ")}.`);
      }
      await issuesService.updateIssue(
        team.id,
        existing.id,
        { status: command.status },
        role,
        userId,
      );
    }

    return Response.json({
      response_type: "in_channel",
      text: `Updated ${command.number}`,
    });
  }

  const created = await createIssueFromSlack(resolved.context, {
    title: command.title,
    customer: command.customer,
  });

  if (!created.ok) return ephemeral(created.error);

  return Response.json({
    response_type: "in_channel",
    text: `Created ${created.key} ${created.issue.title}`,
  });
}

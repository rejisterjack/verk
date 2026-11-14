import type { Role } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/db";
import { fetchSlackUserEmail } from "@/lib/slack";
import * as issuesService from "@/lib/services/issues";
import { addCustomerRequest, createCustomer } from "@/lib/services/surface";

export type SlackContext = {
  team: { id: string; slug: string; slackChannelId: string | null };
  userId: string;
  role: Role;
  email: string;
};

export type SlackContextResult =
  | { ok: true; context: SlackContext }
  | { ok: false; reason: "no_team" | "no_email" | "not_member" };

/** Messages shown to the Slack user (ephemeral) for each refusal. */
export const SLACK_REFUSAL: Record<
  Extract<SlackContextResult, { ok: false }>["reason"],
  string
> = {
  no_team:
    "No Verk team is connected to this Slack workspace. Ask an admin to set the Slack workspace id in team settings.",
  no_email:
    "I couldn't read your Slack email address. Ask a Slack admin to grant the users:read.email scope.",
  not_member: "You're not a member of this Verk team.",
};

/**
 * Pick the team for a Slack request:
 *   1. exact (slackTeamId, channelId) match
 *   2. workspace-wide mapping (slackTeamId, no channel)
 *   3. the legacy SLACK_TEAM_SLUG env fallback
 */
export async function findTeamForSlack(input: {
  slackTeamId?: string | null;
  channelId?: string | null;
  fallbackSlug?: string | null;
}) {
  const { slackTeamId, channelId, fallbackSlug } = input;

  if (slackTeamId && channelId) {
    const exact = await prisma.team.findFirst({
      where: { slackTeamId, slackChannelId: channelId },
    });

    if (exact) return exact;
  }
  if (slackTeamId) {
    const workspaceWide = await prisma.team.findFirst({
      where: { slackTeamId, slackChannelId: null },
    });

    if (workspaceWide) return workspaceWide;
  }
  if (fallbackSlug) {
    return prisma.team.findUnique({ where: { slug: fallbackSlug } });
  }

  return null;
}

/**
 * Turn a Slack payload into "this Verk member acting in this Verk team".
 * The Slack user is mapped by email, so they act with their OWN role, never as OWNER.
 * `lookupEmail` is injectable for tests.
 */
export async function resolveSlackContext(
  input: {
    slackTeamId?: string | null;
    channelId?: string | null;
    slackUserId: string;
    fallbackSlug?: string | null;
  },
  lookupEmail: (slackUserId: string) => Promise<string | null> = (id) =>
    fetchSlackUserEmail(id, process.env.SLACK_BOT_TOKEN ?? ""),
): Promise<SlackContextResult> {
  const team = await findTeamForSlack(input);

  if (!team) return { ok: false, reason: "no_team" };

  const email = await lookupEmail(input.slackUserId);

  if (!email) return { ok: false, reason: "no_email" };

  const membership = await prisma.membership.findFirst({
    where: { teamId: team.id, user: { email, disabled: false } },
    select: { userId: true, role: true },
  });

  if (!membership) return { ok: false, reason: "not_member" };

  return {
    ok: true,
    context: {
      team: {
        id: team.id,
        slug: team.slug,
        slackChannelId: team.slackChannelId,
      },
      userId: membership.userId,
      role: membership.role,
      email,
    },
  };
}

/** `ACM-12`-style key shown back to the Slack user. */
export function slackIssueKey(teamSlug: string, number: number) {
  return `${teamSlug.slice(0, 3).toUpperCase()}-${number}`;
}

/**
 * The single issue creator for the slash command, @mentions and the message shortcut.
 * Guests can't create issues. An optional customer name records a customer request.
 */
export async function createIssueFromSlack(
  context: SlackContext,
  input: {
    title: string;
    description?: string;
    customer?: string | null;
  },
) {
  if (context.role === "GUEST") {
    return { ok: false as const, error: "Guests can't create issues." };
  }

  const issue = await issuesService.createIssue(
    context.team.id,
    context.userId,
    {
      title: input.title.slice(0, 200),
      description: input.description ?? "",
      status: "BACKLOG",
    },
  );

  if (input.customer?.trim()) {
    const customer = await createCustomer(context.team.id, {
      name: input.customer.trim(),
    });

    await addCustomerRequest(context.team.id, customer.id, {
      body: input.description || input.title,
      issueId: issue.id,
    });
  }

  return {
    ok: true as const,
    issue,
    key: slackIssueKey(context.team.slug, issue.number),
  };
}

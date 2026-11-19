import {
  createIssueFromSlack,
  resolveSlackContext,
  SLACK_REFUSAL,
} from "@/lib/services/slack-intake";
import {
  fetchSlackPermalink,
  postSlackMessage,
  stripSlackMentions,
  titleFromMessage,
} from "@/lib/slack";

export const MESSAGE_SHORTCUT_CALLBACK_ID = "verk_create_issue";

export type SlackEvent = {
  type?: string;
  user?: string;
  bot_id?: string;
  subtype?: string;
  text?: string;
  channel?: string;
  ts?: string;
  thread_ts?: string;
};

export type EventCallback = {
  type?: string;
  challenge?: string;
  team_id?: string;
  event_id?: string;
  event?: SlackEvent;
};

export type MessageActionPayload = {
  type?: string;
  callback_id?: string;
  response_url?: string;
  team?: { id?: string };
  channel?: { id?: string };
  user?: { id?: string };
  message?: { text?: string; ts?: string; bot_id?: string };
};

/** Everything the handlers touch outside this file, so tests can swap it. */
export type SlackDeps = {
  resolve: typeof resolveSlackContext;
  create: typeof createIssueFromSlack;
  post: typeof postSlackMessage;
  permalink: typeof fetchSlackPermalink;
  respond: (url: string, text: string) => Promise<void>;
  token: string;
  fallbackSlug?: string | null;
};

async function respondEphemeral(url: string, text: string) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response_type: "ephemeral", text }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // The user just doesn't see the confirmation. The issue is already created.
  }
}

export function defaultSlackDeps(): SlackDeps {
  return {
    resolve: resolveSlackContext,
    create: createIssueFromSlack,
    post: postSlackMessage,
    permalink: fetchSlackPermalink,
    respond: respondEphemeral,
    token: process.env.SLACK_BOT_TOKEN ?? "",
    fallbackSlug: process.env.SLACK_TEAM_SLUG,
  };
}

/**
 * True for a Slack redelivery. Slack retries after 3 seconds with `x-slack-retry-num`,
 * and the first delivery already did the work, so retries are acknowledged and skipped.
 */
export function isSlackRetry(headers: Headers) {
  return Boolean(headers.get("x-slack-retry-num"));
}

/** `@Verk fix the login bug` in a channel creates an issue and replies in the thread. */
export async function handleAppMention(
  payload: EventCallback,
  deps: SlackDeps = defaultSlackDeps(),
): Promise<{ handled: boolean; reason?: string; key?: string }> {
  const event = payload.event;

  if (!event || event.type !== "app_mention") {
    return { handled: false, reason: "not_a_mention" };
  }
  // Never react to bots (including ourselves), edits or other message subtypes.
  if (event.bot_id || event.subtype) return { handled: false, reason: "bot" };
  if (!event.user || !event.channel || !event.ts) {
    return { handled: false, reason: "incomplete" };
  }

  const threadTs = event.thread_ts ?? event.ts;
  const reply = (text: string) =>
    deps.post({ token: deps.token, channel: event.channel!, text, threadTs });

  const resolved = await deps.resolve({
    slackTeamId: payload.team_id,
    channelId: event.channel,
    slackUserId: event.user,
    fallbackSlug: deps.fallbackSlug,
  });

  if (!resolved.ok) {
    await reply(SLACK_REFUSAL[resolved.reason]);

    return { handled: false, reason: resolved.reason };
  }

  const text = stripSlackMentions(event.text ?? "");

  if (!text) {
    await reply("Tell me what to file, for example: @Verk fix the login bug");

    return { handled: false, reason: "empty" };
  }
  const { title, body } = titleFromMessage(text);
  const created = await deps.create(resolved.context, {
    title,
    description: body === title ? "" : body,
  });

  if (!created.ok) {
    await reply(created.error);

    return { handled: false, reason: "refused" };
  }
  await reply(`Created ${created.key}: ${created.issue.title}`);

  return { handled: true, key: created.key };
}

/** The "Create Verk issue" message shortcut: the message becomes the issue. */
export async function handleMessageShortcut(
  payload: MessageActionPayload,
  deps: SlackDeps = defaultSlackDeps(),
): Promise<{ handled: boolean; reason?: string; key?: string }> {
  if (
    payload.type !== "message_action" ||
    payload.callback_id !== MESSAGE_SHORTCUT_CALLBACK_ID
  ) {
    return { handled: false, reason: "unknown_action" };
  }
  const respond = (text: string) =>
    payload.response_url ? deps.respond(payload.response_url, text) : undefined;
  const message = payload.message;
  const userId = payload.user?.id;

  if (!message?.text?.trim() || !userId) {
    await respond("That message has no text to turn into an issue.");

    return { handled: false, reason: "empty" };
  }

  const resolved = await deps.resolve({
    slackTeamId: payload.team?.id,
    channelId: payload.channel?.id,
    slackUserId: userId,
    fallbackSlug: deps.fallbackSlug,
  });

  if (!resolved.ok) {
    await respond(SLACK_REFUSAL[resolved.reason]);

    return { handled: false, reason: resolved.reason };
  }

  const link =
    payload.channel?.id && message.ts
      ? await deps.permalink({
          token: deps.token,
          channel: payload.channel.id,
          messageTs: message.ts,
        })
      : null;
  const text = stripSlackMentions(message.text);
  const { title } = titleFromMessage(text);
  const created = await deps.create(resolved.context, {
    title,
    description: link ? `${text}\n\nSlack: ${link}` : text,
  });

  if (!created.ok) {
    await respond(created.error);

    return { handled: false, reason: "refused" };
  }
  await respond(`Created ${created.key}: ${created.issue.title}`);

  return { handled: true, key: created.key };
}

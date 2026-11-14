import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
// The route chain reaches next-auth through the issues service; it can't load under vitest.
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitShared: vi.fn(async () => ({ ok: true, remaining: 19 })),
}));

import {
  handleAppMention,
  handleMessageShortcut,
  isSlackRetry,
  MESSAGE_SHORTCUT_CALLBACK_ID,
  type SlackDeps,
} from "@/lib/services/slack-events";
import { SLACK_REFUSAL } from "@/lib/services/slack-intake";

const context = {
  team: { id: "t1", slug: "acme-engineering", slackChannelId: null },
  userId: "u-ada",
  role: "MEMBER" as const,
  email: "ada@x.dev",
};

function deps(over: Partial<SlackDeps> = {}) {
  const post = vi.fn(async () => true);
  const respond = vi.fn(async () => undefined);
  const resolve = vi.fn(async () => ({ ok: true as const, context }));
  const create = vi.fn(async (_context: unknown, _input: unknown) => ({
    ok: true as const,
    issue: { id: "i1", number: 12, title: "Fix login" },
    key: "ACM-12",
  }));
  const permalink = vi.fn(async () => "https://acme.slack.com/archives/C1/p1");
  const value = {
    resolve,
    create,
    post,
    respond,
    permalink,
    token: "xoxb-test",
    fallbackSlug: null,
    ...over,
  } as unknown as SlackDeps;

  return { value, post, respond, resolve, create, permalink };
}

const mention = (over: Record<string, unknown> = {}) => ({
  type: "event_callback",
  team_id: "T1",
  event: {
    type: "app_mention",
    user: "U1",
    channel: "C1",
    ts: "100.1",
    text: "<@UBOT> fix the login bug",
    ...over,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleAppMention", () => {
  it("creates exactly one issue and replies in the thread", async () => {
    const d = deps();

    await expect(handleAppMention(mention(), d.value)).resolves.toEqual({
      handled: true,
      key: "ACM-12",
    });
    expect(d.create).toHaveBeenCalledTimes(1);
    expect(d.create).toHaveBeenCalledWith(context, {
      title: "fix the login bug",
      description: "",
    });
    expect(d.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        slackTeamId: "T1",
        channelId: "C1",
        slackUserId: "U1",
      }),
    );
    expect(d.post).toHaveBeenCalledWith({
      token: "xoxb-test",
      channel: "C1",
      text: "Created ACM-12: Fix login",
      threadTs: "100.1",
    });
  });

  it("replies into an existing thread", async () => {
    const d = deps();

    await handleAppMention(mention({ thread_ts: "90.0" }), d.value);
    expect(d.post).toHaveBeenCalledWith(
      expect.objectContaining({ threadTs: "90.0" }),
    );
  });

  it("keeps the rest of a multi-line message as the description", async () => {
    const d = deps();

    await handleAppMention(
      mention({ text: "<@UBOT> Crash on save\nsteps: open, save" }),
      d.value,
    );
    expect(d.create).toHaveBeenCalledWith(context, {
      title: "Crash on save steps: open, save",
      description: "",
    });
  });

  it("ignores bots, so it never loops on its own messages", async () => {
    const d = deps();

    await expect(
      handleAppMention(mention({ bot_id: "B1" }), d.value),
    ).resolves.toMatchObject({ handled: false, reason: "bot" });
    await expect(
      handleAppMention(mention({ subtype: "message_changed" }), d.value),
    ).resolves.toMatchObject({ handled: false, reason: "bot" });
    expect(d.create).not.toHaveBeenCalled();
  });

  it("ignores non-mention events and incomplete payloads", async () => {
    const d = deps();

    await expect(
      handleAppMention(mention({ type: "message" }), d.value),
    ).resolves.toMatchObject({ handled: false });
    await expect(
      handleAppMention(mention({ user: undefined }), d.value),
    ).resolves.toMatchObject({ handled: false, reason: "incomplete" });
    expect(d.create).not.toHaveBeenCalled();
  });

  it("tells a non-member why nothing was created", async () => {
    const d = deps({
      resolve: vi.fn(async () => ({ ok: false as const, reason: "not_member" as const })),
    });

    await expect(handleAppMention(mention(), d.value)).resolves.toMatchObject({
      handled: false,
      reason: "not_member",
    });
    expect(d.create).not.toHaveBeenCalled();
    expect(d.post).toHaveBeenCalledWith(
      expect.objectContaining({ text: SLACK_REFUSAL.not_member }),
    );
  });

  it("asks for text when the mention is empty", async () => {
    const d = deps();

    await expect(
      handleAppMention(mention({ text: "<@UBOT>" }), d.value),
    ).resolves.toMatchObject({ handled: false, reason: "empty" });
    expect(d.create).not.toHaveBeenCalled();
  });

  it("reports a refused creation (guest) without throwing", async () => {
    const d = deps({
      create: vi.fn(async () => ({
        ok: false as const,
        error: "Guests can't create issues.",
      })),
    } as unknown as Partial<SlackDeps>);

    await expect(handleAppMention(mention(), d.value)).resolves.toMatchObject({
      handled: false,
      reason: "refused",
    });
    expect(d.post).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Guests can't create issues." }),
    );
  });
});

describe("isSlackRetry", () => {
  it("detects Slack's redelivery header so retries never duplicate an issue", () => {
    expect(isSlackRetry(new Headers({ "x-slack-retry-num": "1" }))).toBe(true);
    expect(isSlackRetry(new Headers())).toBe(false);
  });
});

describe("handleMessageShortcut", () => {
  const action = (over: Record<string, unknown> = {}) => ({
    type: "message_action",
    callback_id: MESSAGE_SHORTCUT_CALLBACK_ID,
    response_url: "https://hooks.slack.com/actions/T/1/x",
    team: { id: "T1" },
    channel: { id: "C1" },
    user: { id: "U1" },
    message: { text: "Checkout fails on Safari\nhappens after coupon", ts: "55.5" },
    ...over,
  });

  it("turns the message into an issue with its text and Slack link", async () => {
    const d = deps();

    await expect(handleMessageShortcut(action(), d.value)).resolves.toEqual({
      handled: true,
      key: "ACM-12",
    });
    expect(d.permalink).toHaveBeenCalledWith({
      token: "xoxb-test",
      channel: "C1",
      messageTs: "55.5",
    });
    const input = d.create.mock.calls[0]![1] as { title: string; description: string };

    expect(input.title).toBe("Checkout fails on Safari happens after coupon");
    expect(input.description).toContain("Checkout fails on Safari");
    expect(input.description).toContain(
      "Slack: https://acme.slack.com/archives/C1/p1",
    );
    expect(d.respond).toHaveBeenCalledWith(
      "https://hooks.slack.com/actions/T/1/x",
      "Created ACM-12: Fix login",
    );
  });

  it("still creates the issue when the permalink lookup fails", async () => {
    const d = deps({ permalink: vi.fn(async () => null) });

    await handleMessageShortcut(action(), d.value);
    const input = d.create.mock.calls[0]![1] as { description: string };

    expect(input.description).not.toContain("Slack:");
    expect(d.create).toHaveBeenCalledTimes(1);
  });

  it("ignores other shortcuts and other payload types", async () => {
    const d = deps();

    await expect(
      handleMessageShortcut(action({ callback_id: "something_else" }), d.value),
    ).resolves.toMatchObject({ handled: false, reason: "unknown_action" });
    await expect(
      handleMessageShortcut(action({ type: "block_actions" }), d.value),
    ).resolves.toMatchObject({ handled: false, reason: "unknown_action" });
    expect(d.create).not.toHaveBeenCalled();
  });

  it("tells the user when the message has no text", async () => {
    const d = deps();

    await expect(
      handleMessageShortcut(action({ message: { text: "  ", ts: "1.1" } }), d.value),
    ).resolves.toMatchObject({ handled: false, reason: "empty" });
    expect(d.respond).toHaveBeenCalled();
    expect(d.create).not.toHaveBeenCalled();
  });

  it("refuses a non-member privately", async () => {
    const d = deps({
      resolve: vi.fn(async () => ({ ok: false as const, reason: "not_member" as const })),
    });

    await handleMessageShortcut(action(), d.value);
    expect(d.create).not.toHaveBeenCalled();
    expect(d.respond).toHaveBeenCalledWith(
      "https://hooks.slack.com/actions/T/1/x",
      SLACK_REFUSAL.not_member,
    );
  });
});

describe("slack route guards", () => {
  const secret = "signing-secret";
  const sign = (timestamp: string, body: string) =>
    `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex")}`;
  const now = () => String(Math.floor(Date.now() / 1000));

  function post(path: string, body: string, headers: Record<string, string> = {}) {
    return new Request(`http://localhost${path}`, {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
    });
  }

  beforeEach(() => {
    vi.resetModules();
  });

  it("every Slack route returns 404 when Slack is not configured", async () => {
    vi.stubEnv("SLACK_SIGNING_SECRET", "");
    vi.stubEnv("SLACK_BOT_TOKEN", "");
    const eventsRoute = await import("@/app/api/slack/events/route");
    const interactivity = await import("@/app/api/slack/interactivity/route");
    const command = await import("@/app/api/slack/command/route");

    for (const [route, path] of [
      [eventsRoute, "/api/slack/events"],
      [interactivity, "/api/slack/interactivity"],
      [command, "/api/slack/command"],
    ] as const) {
      const response = await route.POST(post(path, "text=hi"));

      expect(response.status).toBe(404);
    }
    vi.unstubAllEnvs();
  });

  it("rejects a bad signature, a stale one, and a missing one with 401", async () => {
    vi.stubEnv("SLACK_SIGNING_SECRET", secret);
    vi.stubEnv("SLACK_BOT_TOKEN", "xoxb");
    const eventsRoute = await import("@/app/api/slack/events/route");
    const interactivity = await import("@/app/api/slack/interactivity/route");
    const command = await import("@/app/api/slack/command/route");
    const body = "payload=%7B%7D";
    const stale = String(Math.floor(Date.now() / 1000) - 6 * 60);

    for (const [route, path] of [
      [eventsRoute, "/api/slack/events"],
      [interactivity, "/api/slack/interactivity"],
      [command, "/api/slack/command"],
    ] as const) {
      const bad = await route.POST(
        post(path, body, {
          "x-slack-request-timestamp": now(),
          "x-slack-signature": "v0=bad",
        }),
      );
      const old = await route.POST(
        post(path, body, {
          "x-slack-request-timestamp": stale,
          "x-slack-signature": sign(stale, body),
        }),
      );
      const missing = await route.POST(post(path, body));

      expect(bad.status).toBe(401);
      expect(old.status).toBe(401);
      expect(missing.status).toBe(401);
    }
    vi.unstubAllEnvs();
  });

  it("answers Slack's url_verification challenge for a signed request", async () => {
    vi.stubEnv("SLACK_SIGNING_SECRET", secret);
    vi.stubEnv("SLACK_BOT_TOKEN", "xoxb");
    const eventsRoute = await import("@/app/api/slack/events/route");
    const body = JSON.stringify({ type: "url_verification", challenge: "abc123" });
    const ts = now();
    const response = await eventsRoute.POST(
      post("/api/slack/events", body, {
        "x-slack-request-timestamp": ts,
        "x-slack-signature": sign(ts, body),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ challenge: "abc123" });
    vi.unstubAllEnvs();
  });

  it("acknowledges a Slack retry without doing any work", async () => {
    vi.stubEnv("SLACK_SIGNING_SECRET", secret);
    vi.stubEnv("SLACK_BOT_TOKEN", "xoxb");
    const eventsRoute = await import("@/app/api/slack/events/route");
    const body = JSON.stringify(mention());
    const ts = now();
    const response = await eventsRoute.POST(
      post("/api/slack/events", body, {
        "x-slack-request-timestamp": ts,
        "x-slack-signature": sign(ts, body),
        "x-slack-retry-num": "1",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, retry: true });
    vi.unstubAllEnvs();
  });
});
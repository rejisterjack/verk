import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { notifyTeamSlack } from "@/lib/services/surface";

const webhook = "https://hooks.slack.com/services/T/B/x";

describe("notifyTeamSlack", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("SLACK_CHANNEL", "");
    vi.stubEnv("SLACK_BOT_TOKEN", "");
    fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("posts ONCE through the bot to the team's channel, never also the webhook", async () => {
    const post = vi.fn(async () => true);

    await expect(
      notifyTeamSlack(
        { slackChannelId: "C1", slackWebhookUrl: webhook },
        "Assigned: Fix",
        { token: "xoxb", post },
      ),
    ).resolves.toBe("bot");
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith({
      token: "xoxb",
      channel: "C1",
      text: "Assigned: Fix",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the incoming webhook when no bot is configured", async () => {
    await expect(
      notifyTeamSlack({ slackWebhookUrl: webhook }, "Created: X", {
        token: null,
      }),
    ).resolves.toBe("webhook");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toBe(webhook);
  });

  it("falls back to the webhook when the bot can't post", async () => {
    const post = vi.fn(async () => false);

    await expect(
      notifyTeamSlack(
        { slackChannelId: "C1", slackWebhookUrl: webhook },
        "Status",
        { token: "xoxb", post },
      ),
    ).resolves.toBe("webhook");
    expect(post).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses the global SLACK_CHANNEL when the team has no channel id", async () => {
    vi.stubEnv("SLACK_CHANNEL", "C-GLOBAL");
    const post = vi.fn(async () => true);

    await notifyTeamSlack({ slackWebhookUrl: null }, "hi", {
      token: "xoxb",
      post,
    });
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "C-GLOBAL" }),
    );
  });

  it("does nothing when nothing is configured", async () => {
    await expect(
      notifyTeamSlack({ slackWebhookUrl: null }, "hi", { token: null }),
    ).resolves.toBe("skipped");
    await expect(notifyTeamSlack(null, "hi")).resolves.toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws when Slack is down", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(
      notifyTeamSlack({ slackWebhookUrl: webhook }, "hi", { token: null }),
    ).resolves.toBe("webhook");
  });
});
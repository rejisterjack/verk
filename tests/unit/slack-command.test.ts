import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  fetchSlackUserEmail,
  parseSlackText,
  postSlackMessage,
  stripSlackMentions,
  titleFromMessage,
  verifySlackSignature,
} from "@/lib/slack";

const sign = (secret: string, timestamp: string, body: string) =>
  `v0=${createHmac("sha256", secret)
    .update(`v0:${timestamp}:${body}`)
    .digest("hex")}`;

describe("slack command", () => {
  it("parses create, customer, assign, and status", () => {
    expect(parseSlackText("Fix login")).toEqual({
      kind: "create",
      title: "Fix login",
      customer: null,
    });
    expect(parseSlackText("customer:Acme Fix login")).toEqual({
      kind: "create",
      title: "Fix login",
      customer: "Acme",
    });
    expect(parseSlackText("assign 4 ada@example.com").kind).toBe("assign");
    expect(parseSlackText("status 4 done")).toMatchObject({
      kind: "status",
      status: "DONE",
    });
  });
});

describe("verifySlackSignature", () => {
  const body = "text=hi";
  const nowMs = 1_800_000_000_000;
  const fresh = String(Math.floor(nowMs / 1000));

  it("accepts a good signature with a fresh timestamp", () => {
    expect(
      verifySlackSignature("secret", body, fresh, sign("secret", fresh, body), nowMs),
    ).toBe(true);
  });

  it("rejects a bad signature", () => {
    expect(verifySlackSignature("secret", body, fresh, "v0=bad", nowMs)).toBe(
      false,
    );
    expect(
      verifySlackSignature("other", body, fresh, sign("secret", fresh, body), nowMs),
    ).toBe(false);
  });

  it("rejects a validly signed request older than five minutes (replay)", () => {
    const stale = String(Math.floor(nowMs / 1000) - 6 * 60);

    expect(
      verifySlackSignature("secret", body, stale, sign("secret", stale, body), nowMs),
    ).toBe(false);
  });

  it("accepts a request just inside the five minute window", () => {
    const edge = String(Math.floor(nowMs / 1000) - 4 * 60);

    expect(
      verifySlackSignature("secret", body, edge, sign("secret", edge, body), nowMs),
    ).toBe(true);
  });

  it("rejects a forged far-future timestamp", () => {
    const future = String(Math.floor(nowMs / 1000) + 6 * 60);

    expect(
      verifySlackSignature("secret", body, future, sign("secret", future, body), nowMs),
    ).toBe(false);
  });

  it("rejects a non-numeric or missing timestamp", () => {
    expect(
      verifySlackSignature("secret", body, "abc", sign("secret", "abc", body), nowMs),
    ).toBe(false);
    expect(verifySlackSignature("secret", body, "", "v0=x", nowMs)).toBe(false);
  });
});

describe("message helpers", () => {
  it("strips mentions and unwraps Slack links", () => {
    expect(stripSlackMentions("<@U123ABC> fix the login bug")).toBe(
      "fix the login bug",
    );
    expect(stripSlackMentions("<@U1|ada> see <https://x.dev/p|the page>")).toBe(
      "see the page (https://x.dev/p)",
    );
    expect(stripSlackMentions("mail <mailto:a@b.dev|a@b.dev> now")).toBe(
      "mail a@b.dev now",
    );
  });

  it("uses the first line as the title and the whole text as the body", () => {
    expect(titleFromMessage("Crash on save\nsteps: open, save")).toEqual({
      title: "Crash on save",
      body: "Crash on save\nsteps: open, save",
    });
    expect(titleFromMessage("   ").title).toBe("Slack message");
    expect(titleFromMessage("x".repeat(300)).title).toHaveLength(200);
  });
});

describe("slack web api helpers", () => {
  const reply = (body: unknown, ok = true) =>
    vi.fn(async () => ({ ok, json: async () => body }) as Response);

  it("looks up a user's email, lower-cased", async () => {
    const fetchMock = reply({ ok: true, user: { profile: { email: "Ada@X.dev" } } });

    await expect(fetchSlackUserEmail("U1", "xoxb", fetchMock)).resolves.toBe(
      "ada@x.dev",
    );
    expect(String(fetchMock.mock.calls[0]![0])).toContain("users.info?user=U1");
  });

  it("returns null when Slack says not ok or the call fails", async () => {
    await expect(
      fetchSlackUserEmail("U1", "t", reply({ ok: false, error: "missing_scope" })),
    ).resolves.toBeNull();
    await expect(
      fetchSlackUserEmail(
        "U1",
        "t",
        vi.fn(async () => {
          throw new Error("offline");
        }) as unknown as typeof fetch,
      ),
    ).resolves.toBeNull();
  });

  it("posts with an optional thread and never throws", async () => {
    const fetchMock = reply({ ok: true });

    await expect(
      postSlackMessage(
        { token: "t", channel: "C1", text: "hi", threadTs: "1.2" },
        fetchMock,
      ),
    ).resolves.toBe(true);
    const init = fetchMock.mock.calls[0]![1] as { body: string };

    expect(JSON.parse(init.body)).toMatchObject({
      channel: "C1",
      text: "hi",
      thread_ts: "1.2",
    });

    await expect(
      postSlackMessage(
        { token: "t", channel: "C1", text: "hi" },
        reply({ ok: false, error: "channel_not_found" }),
      ),
    ).resolves.toBe(false);
    await expect(
      postSlackMessage(
        { token: "t", channel: "C1", text: "hi" },
        vi.fn(async () => {
          throw new Error("offline");
        }) as unknown as typeof fetch,
      ),
    ).resolves.toBe(false);
  });
});
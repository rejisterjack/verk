import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  team: { findFirst: vi.fn(), findUnique: vi.fn() },
  membership: { findFirst: vi.fn() },
}));
const issues = vi.hoisted(() => ({ createIssue: vi.fn() }));
const surface = vi.hoisted(() => ({
  createCustomer: vi.fn(),
  addCustomerRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/services/issues", () => issues);
vi.mock("@/lib/services/surface", () => surface);

import {
  createIssueFromSlack,
  findTeamForSlack,
  resolveSlackContext,
  slackIssueKey,
} from "@/lib/services/slack-intake";

const team = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  slug: "acme-engineering",
  slackTeamId: "T1",
  slackChannelId: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findTeamForSlack", () => {
  it("prefers the exact workspace+channel match", async () => {
    db.team.findFirst.mockResolvedValueOnce(team({ id: "exact", slackChannelId: "C1" }));

    await expect(
      findTeamForSlack({ slackTeamId: "T1", channelId: "C1" }),
    ).resolves.toMatchObject({ id: "exact" });
    expect(db.team.findFirst).toHaveBeenCalledWith({
      where: { slackTeamId: "T1", slackChannelId: "C1" },
    });
  });

  it("falls back to the workspace-wide mapping", async () => {
    db.team.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(team({ id: "wide" }));

    await expect(
      findTeamForSlack({ slackTeamId: "T1", channelId: "C9" }),
    ).resolves.toMatchObject({ id: "wide" });
    expect(db.team.findFirst).toHaveBeenLastCalledWith({
      where: { slackTeamId: "T1", slackChannelId: null },
    });
  });

  it("falls back to SLACK_TEAM_SLUG when nothing is mapped", async () => {
    db.team.findFirst.mockResolvedValue(null);
    db.team.findUnique.mockResolvedValue(team({ id: "legacy" }));

    await expect(
      findTeamForSlack({
        slackTeamId: "T1",
        channelId: "C1",
        fallbackSlug: "acme-engineering",
      }),
    ).resolves.toMatchObject({ id: "legacy" });
  });

  it("routes two channels of one workspace to two different teams", async () => {
    db.team.findFirst.mockImplementation(
      async ({ where }: { where: { slackChannelId: string | null } }) =>
        where.slackChannelId === "C-WEB"
          ? team({ id: "web", slackChannelId: "C-WEB" })
          : where.slackChannelId === "C-API"
            ? team({ id: "api", slackChannelId: "C-API" })
            : null,
    );

    await expect(
      findTeamForSlack({ slackTeamId: "T1", channelId: "C-WEB" }),
    ).resolves.toMatchObject({ id: "web" });
    await expect(
      findTeamForSlack({ slackTeamId: "T1", channelId: "C-API" }),
    ).resolves.toMatchObject({ id: "api" });
  });

  it("returns null with no mapping and no fallback", async () => {
    db.team.findFirst.mockResolvedValue(null);

    await expect(
      findTeamForSlack({ slackTeamId: "T1", channelId: "C1" }),
    ).resolves.toBeNull();
  });
});

describe("resolveSlackContext", () => {
  const base = { slackTeamId: "T1", channelId: "C1", slackUserId: "U1" };

  it("acts as the member with their own role, not OWNER", async () => {
    db.team.findFirst.mockResolvedValue(team());
    db.membership.findFirst.mockResolvedValue({ userId: "u-ada", role: "MEMBER" });

    const result = await resolveSlackContext(base, async () => "ada@x.dev");

    expect(result).toMatchObject({
      ok: true,
      context: { userId: "u-ada", role: "MEMBER", email: "ada@x.dev" },
    });
    expect(db.membership.findFirst).toHaveBeenCalledWith({
      where: { teamId: "t1", user: { email: "ada@x.dev", disabled: false } },
      select: { userId: true, role: true },
    });
  });

  it("refuses a Slack user who is not a team member", async () => {
    db.team.findFirst.mockResolvedValue(team());
    db.membership.findFirst.mockResolvedValue(null);

    await expect(
      resolveSlackContext(base, async () => "stranger@x.dev"),
    ).resolves.toEqual({ ok: false, reason: "not_member" });
  });

  it("refuses when the email can't be read", async () => {
    db.team.findFirst.mockResolvedValue(team());

    await expect(
      resolveSlackContext(base, async () => null),
    ).resolves.toEqual({ ok: false, reason: "no_email" });
    expect(db.membership.findFirst).not.toHaveBeenCalled();
  });

  it("refuses when no team is connected, without calling Slack", async () => {
    db.team.findFirst.mockResolvedValue(null);
    const lookup = vi.fn();

    await expect(resolveSlackContext(base, lookup)).resolves.toEqual({
      ok: false,
      reason: "no_team",
    });
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("createIssueFromSlack", () => {
  const context = (role: "GUEST" | "MEMBER" | "ADMIN") => ({
    team: { id: "t1", slug: "acme-engineering", slackChannelId: null },
    userId: "u-ada",
    role,
    email: "ada@x.dev",
  });

  beforeEach(() => {
    issues.createIssue.mockResolvedValue({ id: "i1", number: 12, title: "Fix" });
    surface.createCustomer.mockResolvedValue({ id: "c1" });
  });

  it("creates the issue as the Slack member, so creatorId is theirs", async () => {
    const result = await createIssueFromSlack(context("MEMBER"), {
      title: "Fix login",
    });

    expect(result).toMatchObject({ ok: true, key: "ACM-12" });
    expect(issues.createIssue).toHaveBeenCalledWith("t1", "u-ada", {
      title: "Fix login",
      description: "",
      status: "BACKLOG",
    });
  });

  it("refuses guests", async () => {
    await expect(
      createIssueFromSlack(context("GUEST"), { title: "x" }),
    ).resolves.toMatchObject({ ok: false });
    expect(issues.createIssue).not.toHaveBeenCalled();
  });

  it("records a customer request when a customer is given", async () => {
    await createIssueFromSlack(context("MEMBER"), {
      title: "Fix",
      description: "details",
      customer: "Acme",
    });

    expect(surface.createCustomer).toHaveBeenCalledWith("t1", { name: "Acme" });
    expect(surface.addCustomerRequest).toHaveBeenCalledWith("t1", "c1", {
      body: "details",
      issueId: "i1",
    });
  });

  it("truncates a long title to 200 characters", async () => {
    await createIssueFromSlack(context("MEMBER"), { title: "x".repeat(300) });

    expect(
      (issues.createIssue.mock.calls[0]![2] as { title: string }).title,
    ).toHaveLength(200);
  });
});

describe("slackIssueKey", () => {
  it("builds the short key shown in Slack", () => {
    expect(slackIssueKey("acme-engineering", 7)).toBe("ACM-7");
  });
});
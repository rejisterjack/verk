import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listMatchingPulls } from "@/lib/github-pulls";

const pull = (number: number, ref: string, draft = false) => ({
  number,
  title: `PR ${number}`,
  html_url: `https://github.com/acme/app/pull/${number}`,
  draft,
  head: { ref },
});

function respond(body: unknown, ok = true) {
  return vi.fn(async () => ({ ok, json: async () => body }) as Response);
}

describe("listMatchingPulls", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns nothing and makes no request without a token", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const fetchMock = respond([]);

    await expect(
      listMatchingPulls("acme/app", "acm-1-fix", fetchMock),
    ).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("makes one head-filtered call and never asks for files or patches", async () => {
    const fetchMock = respond([pull(7, "acm-1-fix", true)]);
    const result = await listMatchingPulls("acme/app", "acm-1-fix", fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]![0]);

    expect(url).toContain("/repos/acme/app/pulls?");
    expect(url).toContain("head=acme%3Aacm-1-fix");
    expect(url).toContain("state=open");
    expect(url).not.toContain("/files");
    expect(result).toEqual([
      {
        number: 7,
        title: "PR 7",
        url: "https://github.com/acme/app/pull/7",
        draft: true,
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("patch");
  });

  it("drops pulls whose head branch does not match exactly", async () => {
    const fetchMock = respond([pull(1, "acm-1-fix"), pull(2, "acm-1-fix-2")]);
    const result = await listMatchingPulls("acme/app", "acm-1-fix", fetchMock);

    expect(result.map((item) => item.number)).toEqual([1]);
  });

  it("returns [] on a GitHub error, a network failure, or a bad repo", async () => {
    await expect(
      listMatchingPulls("acme/app", "b", respond({}, false)),
    ).resolves.toEqual([]);
    await expect(
      listMatchingPulls(
        "acme/app",
        "b",
        vi.fn(async () => {
          throw new Error("offline");
        }) as unknown as typeof fetch,
      ),
    ).resolves.toEqual([]);
    await expect(
      listMatchingPulls("not-a-repo", "b", respond([])),
    ).resolves.toEqual([]);
  });
});
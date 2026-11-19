import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const issues = vi.hoisted(() => ({
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  getIssueByNumber: vi.fn(),
}));
const keys = vi.hoisted(() => ({ resolveApiKey: vi.fn() }));
const db = vi.hoisted(() => ({ user: { findFirst: vi.fn() } }));
const comments = vi.hoisted(() => ({ addComment: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitShared: vi.fn(async () => ({ ok: true, remaining: 19 })),
}));
vi.mock("@/lib/services/issues", () => issues);
vi.mock("@/lib/services/api-keys", () => keys);
vi.mock("@/lib/services/comments", () => comments);

import {
  extractAgentJson,
  parseAgentReply,
  refusesCodeWrite,
} from "@/lib/agent-json";
import { POST } from "@/app/api/agent/route";

const TOKEN = "verk_" + "c".repeat(40);

function call(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function modelReplies(content: string, ok = true) {
  const fetchMock = vi.fn(async () => ({
    ok,
    json: async () => ({ choices: [{ message: { content } }] }),
  }));

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AI_API_KEY", "sk-test");
  keys.resolveApiKey.mockResolvedValue({
    teamId: "t1",
    createdById: "u1",
    effectiveRole: "MEMBER",
  });
  issues.createIssue.mockImplementation(async (_t: string, _u: string, input: unknown) => ({
    id: "i1",
    number: 1,
    ...(input as object),
  }));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("agent prompt helpers", () => {
  it("refuses prompts that write code", () => {
    expect(refusesCodeWrite("open a pull request")).toBe(true);
    expect(refusesCodeWrite("file a high-priority issue titled X")).toBe(false);
  });

  it("extracts JSON from a fenced model reply", () => {
    expect(
      extractAgentJson('Sure\n```json\n{"action":"create","title":"X"}\n```'),
    ).toEqual({ action: "create", title: "X" });
  });

  it("parseAgentReply never throws and explains unusable replies", () => {
    expect(parseAgentReply("sorry, I can't")).toEqual({
      ok: false,
      error: "The agent did not return JSON",
    });
    expect(parseAgentReply('{"action":"delete_everything"}')).toEqual({
      ok: false,
      error: "The agent returned an invalid action",
    });
    expect(parseAgentReply('{"priority":"HIGH","title":"X"}')).toMatchObject({
      ok: true,
      reply: { priority: "HIGH", title: "X", description: "" },
    });
  });
});

describe("POST /api/agent", () => {
  it("returns 404 when the agent is not configured", async () => {
    vi.stubEnv("AI_API_KEY", "");

    expect((await call({ teamId: "t1", prompt: "hi" })).status).toBe(404);
  });

  it("returns 401 without a verk_ key", async () => {
    const response = await POST(
      new Request("http://localhost/api/agent", {
        method: "POST",
        body: JSON.stringify({ teamId: "t1", prompt: "hi" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("malformed JSON is a 400, not a 500", async () => {
    expect((await call("{not json")).status).toBe(400);
  });

  it("a missing prompt, wrong types, or an oversize prompt are 400s", async () => {
    expect((await call({ teamId: "t1" })).status).toBe(400);
    expect((await call({ teamId: 5, prompt: "x" })).status).toBe(400);
    expect((await call({ teamId: "t1", prompt: "x".repeat(4001) })).status).toBe(400);
  });

  it("refuses a request to open a pull request and never calls the model", async () => {
    const fetchMock = modelReplies("{}");
    const response = await call({ teamId: "t1", prompt: "open a pull request for X" });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(issues.createIssue).not.toHaveBeenCalled();
  });

  it("rejects a key for another team", async () => {
    modelReplies("{}");
    keys.resolveApiKey.mockResolvedValue({
      teamId: "other",
      createdById: "u1",
      effectiveRole: "ADMIN",
    });

    expect((await call({ teamId: "t1", prompt: "file X" })).status).toBe(401);
  });

  it("rejects an unknown key", async () => {
    keys.resolveApiKey.mockResolvedValue(null);

    expect((await call({ teamId: "t1", prompt: "file X" })).status).toBe(401);
  });

  it("a read-only (GUEST) key can't file issues, and the model is never called", async () => {
    const fetchMock = modelReplies("{}");

    keys.resolveApiKey.mockResolvedValue({
      teamId: "t1",
      createdById: "u1",
      effectiveRole: "GUEST",
    });
    const response = await call({ teamId: "t1", prompt: "file X" });

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(issues.createIssue).not.toHaveBeenCalled();
  });

  it('"file a high-priority issue titled X" creates a HIGH issue', async () => {
    modelReplies('{"action":"create","title":"X","priority":"HIGH"}');
    const response = await call({
      teamId: "t1",
      prompt: "file a high-priority issue titled X",
    });

    expect(response.status).toBe(200);
    expect(issues.createIssue).toHaveBeenCalledWith(
      "t1",
      "u1",
      expect.objectContaining({ title: "X", priority: "HIGH" }),
    );
  });

  it("updates act with the key's effective role, never ADMIN by default", async () => {
    modelReplies('{"action":"update","number":4,"status":"DONE"}');
    issues.getIssueByNumber.mockResolvedValue({ id: "i4" });
    issues.updateIssue.mockResolvedValue({ id: "i4" });

    await call({ teamId: "t1", prompt: "close issue 4" });
    expect(issues.updateIssue).toHaveBeenCalledWith(
      "t1",
      "i4",
      { status: "DONE" },
      "MEMBER",
      "u1",
    );
  });

  it("an update for a missing issue is a 404", async () => {
    modelReplies('{"action":"update","number":99,"status":"DONE"}');
    issues.getIssueByNumber.mockResolvedValue(null);

    expect((await call({ teamId: "t1", prompt: "close issue 99" })).status).toBe(404);
  });

  it("a model reply that isn't JSON is a 502, not a 500", async () => {
    modelReplies("I would love to help but here is a poem");

    expect((await call({ teamId: "t1", prompt: "file X" })).status).toBe(502);
    expect(issues.createIssue).not.toHaveBeenCalled();
  });

  it("a model reply with an invalid action is a 502 and changes nothing", async () => {
    modelReplies('{"action":"drop_table","priority":"WHENEVER"}');

    expect((await call({ teamId: "t1", prompt: "file X" })).status).toBe(502);
    expect(issues.createIssue).not.toHaveBeenCalled();
  });

  it("a failing model API is a 502", async () => {
    modelReplies("{}", false);

    expect((await call({ teamId: "t1", prompt: "file X" })).status).toBe(502);
  });

  it("a network failure is a 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNRESET");
      }),
    );

    expect((await call({ teamId: "t1", prompt: "file X" })).status).toBe(502);
  });

  it("a slow model is a 504", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const error = new Error("timed out");

        error.name = "TimeoutError";
        throw error;
      }),
    );

    expect((await call({ teamId: "t1", prompt: "file X" })).status).toBe(504);
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  apiKey: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  membership: { findUnique: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));

import { authenticateRequest } from "@/lib/api-auth";
import { createVerkMcpServer, requireWrite } from "@/lib/mcp/server";
import { effectiveApiKeyRole, lowerRole } from "@/lib/roles";
import { createApiKey, resolveApiKey } from "@/lib/services/api-keys";

const TOKEN = "verk_" + "b".repeat(40);

const key = (role: string) => ({
  id: "k1",
  teamId: "t1",
  createdById: "u1",
  role,
  team: { id: "t1" },
  createdBy: { id: "u1", disabled: false },
});

function request() {
  return new Request("http://localhost/api/x", {
    headers: { authorization: `Bearer ${TOKEN}` },
  }) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.apiKey.update.mockResolvedValue({});
  db.apiKey.create.mockImplementation(async ({ data }) => ({
    id: "k2",
    prefix: data.prefix,
    ...data,
  }));
});

describe("role helpers", () => {
  it("lowerRole picks the weaker role", () => {
    expect(lowerRole("ADMIN", "MEMBER")).toBe("MEMBER");
    expect(lowerRole("GUEST", "OWNER")).toBe("GUEST");
    expect(lowerRole("MEMBER", "MEMBER")).toBe("MEMBER");
  });

  it("effectiveApiKeyRole caps by the creator and dies without membership", () => {
    expect(effectiveApiKeyRole("ADMIN", "MEMBER")).toBe("MEMBER");
    expect(effectiveApiKeyRole("MEMBER", "OWNER")).toBe("MEMBER");
    expect(effectiveApiKeyRole("ADMIN", null)).toBeNull();
    expect(effectiveApiKeyRole("ADMIN", undefined)).toBeNull();
  });
});

describe("createApiKey", () => {
  it("defaults new keys to MEMBER", async () => {
    const { apiKey } = await createApiKey("t1", "u1", { name: "agent" }, "ADMIN");

    expect(apiKey.role).toBe("MEMBER");
  });

  it("stores the requested role", async () => {
    const { apiKey } = await createApiKey(
      "t1",
      "u1",
      { name: "ro", role: "GUEST" },
      "ADMIN",
    );

    expect(apiKey.role).toBe("GUEST");
  });

  it("refuses a role above the creator's own", async () => {
    await expect(
      createApiKey("t1", "u1", { name: "x", role: "ADMIN" }, "MEMBER"),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.apiKey.create).not.toHaveBeenCalled();
  });

  it("only team admins can create keys at all", async () => {
    await expect(
      createApiKey("t1", "u1", { name: "x", role: "GUEST" }, "MEMBER"),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("resolveApiKey", () => {
  it("returns the effective role", async () => {
    db.apiKey.findFirst.mockResolvedValue(key("ADMIN"));
    db.membership.findUnique.mockResolvedValue({ role: "MEMBER" });

    await expect(resolveApiKey(TOKEN)).resolves.toMatchObject({
      effectiveRole: "MEMBER",
    });
  });

  it("rejects a key whose creator left the team", async () => {
    db.apiKey.findFirst.mockResolvedValue(key("ADMIN"));
    db.membership.findUnique.mockResolvedValue(null);

    await expect(resolveApiKey(TOKEN)).resolves.toBeNull();
    expect(db.apiKey.update).not.toHaveBeenCalled();
  });
});

describe("authenticateRequest with API keys", () => {
  it("a demoted creator immediately weakens their ADMIN key", async () => {
    db.apiKey.findFirst.mockResolvedValue(key("ADMIN"));

    db.membership.findUnique.mockResolvedValueOnce({ role: "ADMIN" });
    await expect(
      authenticateRequest(request(), "t1", "ADMIN"),
    ).resolves.toMatchObject({ role: "ADMIN" });

    db.membership.findUnique.mockResolvedValueOnce({ role: "MEMBER" });
    await expect(
      authenticateRequest(request(), "t1", "ADMIN"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("a GUEST key can read but not write", async () => {
    db.apiKey.findFirst.mockResolvedValue(key("GUEST"));
    db.membership.findUnique.mockResolvedValue({ role: "OWNER" });

    await expect(
      authenticateRequest(request(), "t1", "GUEST"),
    ).resolves.toMatchObject({ role: "GUEST" });
    await expect(
      authenticateRequest(request(), "t1", "MEMBER"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("a key whose creator left the team gets 401", async () => {
    db.apiKey.findFirst.mockResolvedValue(key("ADMIN"));
    db.membership.findUnique.mockResolvedValue(null);

    await expect(authenticateRequest(request(), "t1")).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe("MCP write guard", () => {
  const ctx = (role: "GUEST" | "MEMBER" | "ADMIN") => ({
    teamId: "t1",
    userId: "u1",
    role,
  });

  it("blocks GUEST keys from every write and allows MEMBER and up", () => {
    expect(() => requireWrite(ctx("GUEST"))).toThrow(/Insufficient/);
    expect(() => requireWrite(ctx("MEMBER"))).not.toThrow();
    expect(() => requireWrite(ctx("ADMIN"))).not.toThrow();
  });

  it("registers the read and write tools", () => {
    const server = createVerkMcpServer(ctx("GUEST")) as unknown as {
      _registeredTools: Record<string, unknown>;
    };
    const names = Object.keys(server._registeredTools);

    for (const name of [
      "list_issues",
      "create_issue",
      "update_issue",
      "add_comment",
      "delete_comment",
      "add_relation",
      "create_project",
      "update_project",
    ]) {
      expect(names).toContain(name);
    }
  });
});
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
// The services reach next-auth through the issues service; it can't load under vitest.
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));

import { createVerkMcpServer, type McpContext } from "@/lib/mcp/server";

type Registered = {
  handler: (args: unknown, extra: unknown) => Promise<unknown>;
};

function tools(role: McpContext["role"]) {
  const server = createVerkMcpServer({
    teamId: "t1",
    userId: "u1",
    role,
  }) as unknown as { _registeredTools: Record<string, Registered> };

  return server._registeredTools;
}

const READ_TOOLS = [
  "list_issues",
  "get_issue",
  "list_cycles",
  "list_members",
  "list_projects",
  "list_labels",
  "list_comments",
  "search",
  "list_statuses",
  "list_sub_issues",
  "find_similar_issues",
  "list_initiatives",
];

const WRITE_TOOLS = [
  "create_issue",
  "update_issue",
  "archive_issue",
  "restore_issue",
  "bulk_update_issues",
  "create_project",
  "update_project",
  "add_comment",
  "delete_comment",
  "add_relation",
  "create_sub_issue",
  "set_parent_issue",
  "create_status",
  "create_initiative",
  "update_initiative",
  "create_release",
  "set_issue_release",
  "save_document",
  "add_customer_request",
  "add_project_dependency",
  "remove_project_dependency",
  "set_customer_value",
];

/** Reads that can show customer, release or document detail: MEMBER and above only. */
const MEMBER_READ_TOOLS = [
  "list_releases",
  "list_documents",
  "list_customers",
  "list_views",
  "list_project_dependencies",
];

/** Settings-page data: ADMIN only, the same as the pages that show it. */
const ADMIN_TOOLS = ["list_automations", "list_audit_log"];

describe("MCP tool surface", () => {
  const registered = tools("MEMBER");

  it("registers 47 tools", () => {
    expect(Object.keys(registered)).toHaveLength(47);
  });

  it("has every tool the README documents", () => {
    for (const name of [
      ...READ_TOOLS,
      ...WRITE_TOOLS,
      ...MEMBER_READ_TOOLS,
      ...ADMIN_TOOLS,
      "summarize_issue",
      "suggest_triage",
      "claim_issue",
      "agent_heartbeat",
      "report_result",
      "release_issue",
    ]) {
      expect(registered, name).toHaveProperty(name);
    }
  });
});

describe("MCP guest keys", () => {
  const guest = tools("GUEST");

  it.each(WRITE_TOOLS)("%s refuses a GUEST key before touching data", async (name) => {
    await expect(guest[name]!.handler({}, {})).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  it.each(MEMBER_READ_TOOLS)(
    "%s needs MEMBER because it can show detail a scoped guest must not see",
    async (name) => {
      await expect(guest[name]!.handler({}, {})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    },
  );

  it.each(ADMIN_TOOLS)("%s refuses a GUEST key", async (name) => {
    await expect(guest[name]!.handler({}, {})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("MCP admin tools need ADMIN, not just MEMBER", () => {
  const member = tools("MEMBER");

  it.each(ADMIN_TOOLS)(
    "%s refuses a MEMBER key, the same role the settings page needs",
    async (name) => {
      await expect(member[name]!.handler({}, {})).rejects.toMatchObject({
        code: "FORBIDDEN",
        status: 403,
      });
    },
  );
});
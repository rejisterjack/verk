import { describe, expect, it } from "vitest";

import { parseLinearCsv } from "@/lib/import/linear-csv";

describe("parseLinearCsv", () => {
  it("maps Linear export columns", () => {
    const csv = `Title,Description,Status,Priority,Assignee
"Ship MCP","Details","In Progress","High","demo@verk.dev"
"Bug","","Canceled","Urgent",""
`;

    const rows = parseLinearCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      title: "Ship MCP",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assigneeEmail: "demo@verk.dev",
    });
    expect(rows[1]?.status).toBe("CANCELLED");
  });

  it("maps labels and project", () => {
    const csv = `Title,Description,Status,Priority,Assignee,Labels,Project
"Ship","Details","Todo","Low","demo@verk.dev","Bug, MCP","Launch"
`;
    const rows = parseLinearCsv(csv);

    expect(rows[0]?.labels).toEqual(["Bug", "MCP"]);
    expect(rows[0]?.projectName).toBe("Launch");
  });

  it("throws without Title", () => {
    expect(() => parseLinearCsv("Name\nfoo")).toThrow(/Title/);
  });
});

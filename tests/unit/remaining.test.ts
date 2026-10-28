import { describe, expect, it } from "vitest";

import { inverseRelation } from "@/lib/relation-pairs";
import { slaBreached, withinSlaWindow } from "@/lib/sla";
import { nextTriageAt } from "@/lib/triage";
import { signWebhookBody } from "@/lib/webhook-sign";
import { fetchLinearIssuePages } from "@/lib/import/linear-pages";

describe("nextTriageAt", () => {
  it("clears triage when the issue leaves backlog", () => {
    expect(
      nextTriageAt(
        { status: "BACKLOG", assigneeId: null, triageAt: new Date() },
        { status: "TODO" },
      ),
    ).toBeNull();
  });

  it("clears triage when someone is assigned", () => {
    expect(
      nextTriageAt(
        { status: "BACKLOG", assigneeId: null },
        { assigneeId: "user_1" },
      ),
    ).toBeNull();
  });

  it("stamps triage when an issue returns to unassigned backlog", () => {
    const next = nextTriageAt(
      { status: "TODO", assigneeId: "user_1" },
      { status: "BACKLOG", assigneeId: null },
    );

    expect(next).toBeInstanceOf(Date);
  });
});

describe("signWebhookBody", () => {
  it("does not return the raw secret", () => {
    const secret = "hook-secret";
    const signed = signWebhookBody(secret, "{\"event\":\"issue.created\"}");

    expect(signed.startsWith("sha256=")).toBe(true);
    expect(signed).not.toContain(secret);
  });
});

describe("inverseRelation", () => {
  it("pairs blocks and parent links", () => {
    expect(inverseRelation("BLOCKS")).toBe("BLOCKED_BY");
    expect(inverseRelation("PARENT")).toBe("CHILD");
    expect(inverseRelation("RELATED")).toBeNull();
  });
});

describe("slaBreached", () => {
  it("flags open issues past the priority hours", () => {
    const created = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-01T05:00:00Z");

    expect(slaBreached("URGENT", "TODO", created, { URGENT: 4 }, now)).toBe(
      true,
    );
    expect(slaBreached("URGENT", "DONE", created, { URGENT: 4 }, now)).toBe(
      false,
    );
    expect(
      withinSlaWindow(new Date("2026-01-03T12:00:00Z"), {
        timezone: "UTC",
        startHour: 0,
        endHour: 1,
        weekdays: "1,2,3,4,5,6,7",
      }),
    ).toBe(false);
  });
});

describe("fetchLinearIssuePages", () => {
  it("follows endCursor until the last page", async () => {
    const calls: Array<string | null> = [];
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        variables: { after: string | null };
      };

      calls.push(body.variables.after);
      const after = body.variables.after;
      const last = after === "cursor-1";

      return new Response(
        JSON.stringify({
          data: {
            issues: {
              pageInfo: {
                hasNextPage: !last,
                endCursor: last ? null : "cursor-1",
              },
              nodes: [{ title: after ?? "first", priority: 0 }],
            },
          },
        }),
      );
    }) as typeof fetch;

    const result = await fetchLinearIssuePages("lin_test", fetchImpl, 2000);

    expect(calls).toEqual([null, "cursor-1"]);
    expect(result.nodes).toHaveLength(2);
    expect(result.capped).toBe(false);
  });
});

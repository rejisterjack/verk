import { describe, expect, it } from "vitest";

import {
  formatArr,
  rankDemand,
  type DemandIssue,
  type DemandRequest,
} from "@/lib/demand";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const issue = (id: string, over: Partial<DemandIssue> = {}): DemandIssue => ({
  id,
  number: Number(id.replace(/\D/g, "")) || 1,
  title: id,
  status: "TODO",
  priority: "NONE",
  ...over,
});
const ask = (
  customerId: string,
  issueId: string | null,
  over: Partial<DemandRequest> = {},
): DemandRequest => ({
  customerId,
  customerName: customerId.toUpperCase(),
  issueId,
  createdAt: d("2026-03-01"),
  ...over,
});

describe("rankDemand (default: breadth first)", () => {
  it("counts a customer once per issue however often they asked", () => {
    const rows = rankDemand(
      [ask("a", "i1"), ask("a", "i1"), ask("a", "i1"), ask("b", "i2"), ask("c", "i2")],
      [issue("i1"), issue("i2")],
    );

    expect(rows.map((r) => r.issue.id)).toEqual(["i2", "i1"]);
    expect(rows[1]!.customerCount).toBe(1);
    expect(rows[1]!.requestCount).toBe(3);
    expect(rows[1]!.customers[0]!.asks).toBe(3);
  });

  it("breaks a tie by total requests, then by revenue, then by the oldest ask", () => {
    const rows = rankDemand(
      [
        ask("a", "i1", { customerArr: 1000 }),
        ask("b", "i2", { customerArr: 9000 }),
        ask("c", "i3", { customerArr: 9000, createdAt: d("2026-01-01") }),
      ],
      [issue("i1"), issue("i2"), issue("i3")],
    );

    expect(rows.map((r) => r.issue.id)).toEqual(["i3", "i2", "i1"]);
  });

  it("skips finished issues unless asked, and requests with no issue", () => {
    const requests = [ask("a", "i1"), ask("b", null), ask("c", "gone")];
    const issues = [issue("i1", { status: "DONE" })];

    expect(rankDemand(requests, issues)).toEqual([]);
    expect(rankDemand(requests, issues, { includeClosed: true })).toHaveLength(1);
  });
});

describe("rankDemand (revenue)", () => {
  const requests = [
    // i1: one big customer.
    ask("big", "i1", { customerArr: 500_000, customerTier: "Enterprise" }),
    // i2: three small customers.
    ask("s1", "i2", { customerArr: 10_000 }),
    ask("s2", "i2", { customerArr: 10_000 }),
    ask("s3", "i2", { customerArr: 10_000 }),
  ];
  const issues = [issue("i1"), issue("i2")];

  it("puts the issue backed by the most revenue first", () => {
    expect(
      rankDemand(requests, issues, { sort: "revenue" }).map((r) => r.issue.id),
    ).toEqual(["i1", "i2"]);
  });

  it("while the default still puts the broadest demand first", () => {
    expect(rankDemand(requests, issues).map((r) => r.issue.id)).toEqual([
      "i2",
      "i1",
    ]);
  });

  it("adds each customer's revenue once, however many times they asked", () => {
    const rows = rankDemand(
      [
        ask("a", "i1", { customerArr: 1000 }),
        ask("a", "i1", { customerArr: 1000 }),
        ask("b", "i1", { customerArr: 2000 }),
      ],
      [issue("i1")],
      { sort: "revenue" },
    );

    expect(rows[0]!.totalArr).toBe(3000);
    expect(rows[0]!.customers.find((c) => c.id === "a")!.arr).toBe(1000);
  });

  it("carries the tier and treats missing or negative revenue as zero", () => {
    const rows = rankDemand(
      [
        ask("a", "i1", { customerTier: "Enterprise", customerArr: -50 }),
        ask("b", "i1"),
      ],
      [issue("i1")],
    );

    expect(rows[0]!.totalArr).toBe(0);
    expect(rows[0]!.customers.find((c) => c.id === "a")!.tier).toBe("Enterprise");
  });
});

describe("formatArr", () => {
  it("is compact and shows a dash for unknown", () => {
    expect(formatArr(0)).toBe("—");
    expect(formatArr(-5)).toBe("—");
    expect(formatArr(Number.NaN)).toBe("—");
    expect(formatArr(950)).toBe("950");
    expect(formatArr(1200)).toBe("1.2k");
    expect(formatArr(50_000)).toBe("50k");
    expect(formatArr(2_500_000)).toBe("2.5M");
  });
});
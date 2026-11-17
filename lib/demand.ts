/**
 * Customer demand: which open issues the most customers are asking for. A customer counts once
 * per issue however many times they asked, so one loud customer can't outrank broad demand;
 * ties break by total requests, then by the oldest unanswered ask.
 */

export type DemandRequest = {
  customerId: string;
  customerName: string;
  issueId: string | null;
  createdAt: Date;
  /** Annual recurring revenue in whole currency units. 0 or missing means unknown. */
  customerArr?: number;
  /** Free-text plan or segment, for example "Enterprise". */
  customerTier?: string;
};

export type DemandIssue = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
};

export type DemandRow = {
  issue: DemandIssue;
  customers: {
    id: string;
    name: string;
    asks: number;
    arr: number;
    tier: string;
  }[];
  /** Distinct customers asking. */
  customerCount: number;
  /** Every request, including repeats. */
  requestCount: number;
  oldestAsk: Date;
  /** Sum of annual revenue over the distinct customers asking (each counted once). */
  totalArr: number;
};

export type DemandSort = "customers" | "revenue";

/** Compact money for a table cell: 1200 -> "1.2k", 2500000 -> "2.5M". Zero shows as a dash. */
export function formatArr(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trim(value / 1_000)}k`;

  return String(Math.round(value));
}

function trim(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

const CLOSED = new Set(["DONE", "CANCELLED"]);

export function rankDemand(
  requests: DemandRequest[],
  issues: DemandIssue[],
  opts: { includeClosed?: boolean; sort?: DemandSort } = {},
): DemandRow[] {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const grouped = new Map<string, DemandRequest[]>();

  for (const request of requests) {
    if (!request.issueId || !byId.has(request.issueId)) continue;
    grouped.set(request.issueId, [
      ...(grouped.get(request.issueId) ?? []),
      request,
    ]);
  }
  const rows: DemandRow[] = [];

  for (const [issueId, asks] of grouped) {
    const issue = byId.get(issueId)!;

    if (!opts.includeClosed && CLOSED.has(issue.status)) continue;
    const perCustomer = new Map<
      string,
      { id: string; name: string; asks: number; arr: number; tier: string }
    >();

    for (const ask of asks) {
      const entry = perCustomer.get(ask.customerId) ?? {
        id: ask.customerId,
        name: ask.customerName,
        asks: 0,
        arr: Math.max(0, ask.customerArr ?? 0),
        tier: ask.customerTier ?? "",
      };

      entry.asks += 1;
      perCustomer.set(ask.customerId, entry);
    }
    rows.push({
      issue,
      customers: [...perCustomer.values()].sort(
        (a, b) => b.asks - a.asks || a.name.localeCompare(b.name),
      ),
      customerCount: perCustomer.size,
      requestCount: asks.length,
      oldestAsk: new Date(
        Math.min(...asks.map((ask) => ask.createdAt.getTime())),
      ),
      totalArr: [...perCustomer.values()].reduce((sum, c) => sum + c.arr, 0),
    });
  }

  // Revenue order breaks ties by breadth, so two issues worth the same sort by how many
  // customers asked. The default keeps the original rule: breadth first, revenue last.
  const byBreadth = (a: DemandRow, b: DemandRow) =>
    b.customerCount - a.customerCount ||
    b.requestCount - a.requestCount ||
    b.totalArr - a.totalArr ||
    a.oldestAsk.getTime() - b.oldestAsk.getTime();

  if (opts.sort === "revenue") {
    return rows.sort(
      (a, b) =>
        b.totalArr - a.totalArr ||
        b.customerCount - a.customerCount ||
        b.requestCount - a.requestCount ||
        a.oldestAsk.getTime() - b.oldestAsk.getTime(),
    );
  }

  return rows.sort(byBreadth);
}

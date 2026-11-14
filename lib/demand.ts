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
  customers: { id: string; name: string; asks: number }[];
  /** Distinct customers asking. */
  customerCount: number;
  /** Every request, including repeats. */
  requestCount: number;
  oldestAsk: Date;
};

const CLOSED = new Set(["DONE", "CANCELLED"]);

export function rankDemand(
  requests: DemandRequest[],
  issues: DemandIssue[],
  opts: { includeClosed?: boolean } = {},
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
      { id: string; name: string; asks: number }
    >();

    for (const ask of asks) {
      const entry = perCustomer.get(ask.customerId) ?? {
        id: ask.customerId,
        name: ask.customerName,
        asks: 0,
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
    });
  }

  return rows.sort(
    (a, b) =>
      b.customerCount - a.customerCount ||
      b.requestCount - a.requestCount ||
      a.oldestAsk.getTime() - b.oldestAsk.getTime(),
  );
}

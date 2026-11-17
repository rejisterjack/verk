import NextLink from "next/link";
import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { formatArr, rankDemand } from "@/lib/demand";
import { prisma } from "@/lib/db";
import { requireTeamBySlug } from "@/lib/rbac";
import { guestIssueScope } from "@/lib/services/guest-scope";
import { issueKey } from "@/lib/utils";

export default async function DemandPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ closed?: string; sort?: string }>;
}) {
  const { teamSlug } = await params;
  const query = await searchParams;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "MEMBER");
  } catch {
    notFound();
  }
  const teamId = teamCtx.team.id;
  const scope = await guestIssueScope(teamId, teamCtx.user.id);
  const requests = await prisma.customerRequest.findMany({
    where: {
      customer: { teamId },
      issueId: { not: null },
      ...(scope ? { issue: scope } : {}),
    },
    select: {
      createdAt: true,
      issueId: true,
      customer: {
        select: { id: true, name: true, arr: true, tier: true },
      },
      issue: {
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          priority: true,
        },
      },
    },
    take: 5000,
  });
  const issues = new Map(
    requests.flatMap((request) =>
      request.issue ? [[request.issue.id, request.issue] as const] : [],
    ),
  );
  const rows = rankDemand(
    requests.map((request) => ({
      customerId: request.customer.id,
      customerName: request.customer.name,
      issueId: request.issueId,
      createdAt: request.createdAt,
      customerArr: request.customer.arr,
      customerTier: request.customer.tier,
    })),
    [...issues.values()],
    {
      includeClosed: query.closed === "1",
      sort: query.sort === "revenue" ? "revenue" : "customers",
    },
  );
  const byRevenue = query.sort === "revenue";
  const link = (toggle: "sort" | "closed") => {
    const params = new URLSearchParams();
    const closed =
      toggle === "closed" ? query.closed !== "1" : query.closed === "1";
    const revenue = toggle === "sort" ? !byRevenue : byRevenue;

    if (closed) params.set("closed", "1");
    if (revenue) params.set("sort", "revenue");
    const text = params.toString();

    return `/t/${teamSlug}/customers/demand${text ? `?${text}` : ""}`;
  };

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          <div className="flex items-center gap-1">
            <NextLink
              className="rounded px-2 py-1 text-[12px] text-accent hover:bg-default"
              href={link("sort")}
            >
              {byRevenue ? "Rank by customers" : "Rank by revenue"}
            </NextLink>
            <NextLink
              className="rounded px-2 py-1 text-[12px] text-accent hover:bg-default"
              href={link("closed")}
            >
              {query.closed === "1"
                ? "Hide finished issues"
                : "Include finished issues"}
            </NextLink>
          </div>
        }
        description={
          byRevenue
            ? "Issues ranked by the annual revenue of the customers asking (each customer counted once)."
            : "Issues ranked by how many different customers asked for them."
        }
        title="Customer demand"
      />
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-[13px] text-muted">
          No customer requests are linked to issues yet. Link a request to an
          issue on the Customers page.
        </p>
      ) : (
        <ul className="divide-y divide-separator text-[13px]">
          {rows.map((row) => (
            <li
              key={row.issue.id}
              className="flex flex-wrap items-center gap-3 px-4 py-2.5"
            >
              <span className="w-24 shrink-0 text-center">
                <span className="text-lg font-semibold">
                  {row.customerCount}
                </span>
                <span className="block text-[11px] text-muted">
                  customer{row.customerCount === 1 ? "" : "s"}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <NextLink
                  className="font-medium hover:text-accent"
                  href={`/t/${teamSlug}/issues/${row.issue.number}`}
                >
                  <span className="font-mono text-[11px] text-muted">
                    {issueKey(teamSlug, row.issue.number)}
                  </span>{" "}
                  {row.issue.title}
                </NextLink>
                <p className="truncate text-[12px] text-muted">
                  {row.customers
                    .slice(0, 6)
                    .map((c) => {
                      const label = c.tier ? `${c.name} (${c.tier})` : c.name;

                      return c.asks > 1 ? `${label} ×${c.asks}` : label;
                    })
                    .join(", ")}
                  {row.customers.length > 6
                    ? ` +${row.customers.length - 6} more`
                    : ""}
                  {" · "}
                  {row.requestCount} request{row.requestCount === 1 ? "" : "s"},
                  oldest {row.oldestAsk.toISOString().slice(0, 10)}
                </p>
              </div>
              <span
                className="w-16 text-right text-[12px] text-muted"
                title="Annual revenue of the customers asking"
              >
                {formatArr(row.totalArr)}
              </span>
              <span className="text-[12px] text-muted">
                {row.issue.status.replace("_", " ").toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

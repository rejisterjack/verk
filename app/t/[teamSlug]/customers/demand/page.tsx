import NextLink from "next/link";
import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { rankDemand } from "@/lib/demand";
import { prisma } from "@/lib/db";
import { requireTeamBySlug } from "@/lib/rbac";
import { guestIssueScope } from "@/lib/services/guest-scope";
import { issueKey } from "@/lib/utils";

export default async function DemandPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ closed?: string }>;
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
      customer: { select: { id: true, name: true } },
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
    })),
    [...issues.values()],
    { includeClosed: query.closed === "1" },
  );

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          <NextLink
            className="rounded px-2 py-1 text-[12px] text-accent hover:bg-default"
            href={`/t/${teamSlug}/customers/demand${query.closed === "1" ? "" : "?closed=1"}`}
          >
            {query.closed === "1"
              ? "Hide finished issues"
              : "Include finished issues"}
          </NextLink>
        }
        description="Issues ranked by how many different customers asked for them."
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
                    .map((c) => (c.asks > 1 ? `${c.name} ×${c.asks}` : c.name))
                    .join(", ")}
                  {row.customers.length > 6
                    ? ` +${row.customers.length - 6} more`
                    : ""}
                  {" · "}
                  {row.requestCount} request{row.requestCount === 1 ? "" : "s"},
                  oldest {row.oldestAsk.toISOString().slice(0, 10)}
                </p>
              </div>
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

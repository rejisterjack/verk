import NextLink from "next/link";
import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { forceReleaseClaimAction } from "@/lib/actions/agents";
import { requireTeamBySlug } from "@/lib/rbac";
import { listClaims } from "@/lib/services/agent-claims";

const STATE_STYLE: Record<string, string> = {
  active: "text-success",
  expired: "text-warning",
  completed: "text-muted",
  failed: "text-danger",
  released: "text-muted",
};

export default async function AgentsSettingsPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "ADMIN");
  } catch {
    notFound();
  }
  const claims = await listClaims(teamCtx.team.id);

  return (
    <div className="px-4 py-3">
      <ViewToolbar
        description="Issues handed to coding agents. An agent takes a lease, keeps it alive while it works and reports back; if it goes quiet the lease runs out and the issue is free again. Agents use the API (/agent/claims) or the MCP tools claim_issue, agent_heartbeat, report_result and release_issue."
        title="Agents"
      />
      {claims.length === 0 ? (
        <p className="py-6 text-[13px] text-muted">
          No agent has claimed an issue yet.
        </p>
      ) : (
        <ul className="divide-y divide-separator text-[13px]">
          {claims.map((claim) => (
            <li
              key={claim.issueId}
              className="flex flex-wrap items-center gap-3 py-2.5"
            >
              <span className={`w-20 text-[12px] ${STATE_STYLE[claim.state]}`}>
                {claim.state}
              </span>
              <div className="min-w-0 flex-1">
                <NextLink
                  className="font-medium hover:text-accent"
                  href={`/t/${teamSlug}/issues/${claim.number}`}
                >
                  {teamSlug.toUpperCase()}-{claim.number} {claim.title}
                </NextLink>
                <p className="truncate text-[12px] text-muted">
                  {claim.agent}
                  {claim.state === "active"
                    ? ` · lease until ${claim.leaseExpiresAt.toISOString().slice(0, 16).replace("T", " ")} UTC`
                    : ""}
                  {claim.note ? ` · ${claim.note}` : ""}
                </p>
              </div>
              {claim.resultUrl ? (
                <a
                  className="text-[12px] text-accent hover:underline"
                  href={claim.resultUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Result
                </a>
              ) : null}
              {claim.state === "active" || claim.state === "expired" ? (
                <form
                  action={forceReleaseClaimAction.bind(
                    null,
                    teamSlug,
                    claim.issueId,
                  )}
                >
                  <Button size="sm" type="submit" variant="secondary">
                    Release
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

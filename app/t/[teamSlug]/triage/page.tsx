import NextLink from "next/link";
import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { triageIssueAction } from "@/lib/actions/issues";
import { requireTeamBySlug } from "@/lib/rbac";
import * as issuesService from "@/lib/services/issues";
import { issueKey } from "@/lib/utils";

export default async function TriagePage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }

  const { team } = teamCtx;
  const { issues } = await issuesService.listIssues(team.id, {
    triage: true,
    take: 100,
  });

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar description="New and unassigned work" title="Triage" />
      {issues.length === 0 ? (
        <p className="px-4 py-8 text-[13px] text-muted">Triage is clear.</p>
      ) : (
        <ul className="divide-y divide-separator">
          {issues.map((issue) => (
            <li
              key={issue.id}
              className="flex flex-wrap items-center gap-2 px-4 py-1.5 text-[13px]"
            >
              <NextLink
                className="min-w-0 flex-1 truncate hover:text-accent"
                href={`/t/${teamSlug}/issues/${issue.number}`}
              >
                <span className="font-mono text-[11px] text-muted">
                  {issueKey(teamSlug, issue.number)}
                </span>{" "}
                <span className="font-medium">{issue.title}</span>
              </NextLink>
              <form
                action={triageIssueAction.bind(
                  null,
                  teamSlug,
                  issue.id,
                  "accept",
                )}
              >
                <Button size="sm" type="submit">
                  Accept
                </Button>
              </form>
              <form
                action={triageIssueAction.bind(
                  null,
                  teamSlug,
                  issue.id,
                  "decline",
                )}
              >
                <Button size="sm" type="submit" variant="danger">
                  Decline
                </Button>
              </form>
              <form
                action={triageIssueAction.bind(
                  null,
                  teamSlug,
                  issue.id,
                  "snooze",
                )}
              >
                <Button size="sm" type="submit" variant="secondary">
                  Snooze 1h
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

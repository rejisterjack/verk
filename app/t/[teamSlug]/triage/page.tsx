import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { TriageSuggest } from "@/components/triage-suggest";
import { SubmitButton as Button } from "@/components/submit-button";
import { TriageRulesForm } from "@/components/triage-rules-form";
import { triageIssueAction } from "@/lib/actions/issues";
import { suggestTriage } from "@/lib/ai";
import { requireTeamBySlug } from "@/lib/rbac";
import { serverTranslator } from "@/lib/server-locale";
import * as issuesService from "@/lib/services/issues";
import * as labelsService from "@/lib/services/labels";
import * as membersService from "@/lib/services/members";
import * as statusRules from "@/lib/services/status-rules";
import * as triageRules from "@/lib/services/triage-rules";
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

  const { team, membership } = teamCtx;
  const [{ issues }, rules, statusRuleList, labels, members] =
    await Promise.all([
      issuesService.listIssues(team.id, { triage: true, take: 100 }),
      triageRules.listTriageRules(team.id),
      statusRules.listStatusRules(team.id),
      labelsService.listLabels(team.id),
      membersService.listMembers(team.id),
    ]);

  async function addRule(formData: FormData) {
    "use server";
    const blank = (name: string) => {
      const value = String(formData.get(name) ?? "").trim();

      return value || null;
    };

    try {
      await triageRules.createTriageRule(team.id, {
        titleContains: String(formData.get("titleContains") ?? ""),
        priority: blank("priority"),
        labelId: blank("labelId"),
        setAssigneeId: blank("setAssigneeId"),
        setStatus: blank("setStatus"),
        addLabelId: blank("addLabelId"),
      });
    } catch {
      // A rule needs a title, priority, or label to match.
    }
    redirect(`/t/${teamSlug}/triage`);
  }

  async function removeRule(formData: FormData) {
    "use server";
    await triageRules.deleteTriageRule(
      team.id,
      String(formData.get("ruleId") ?? ""),
    );
    redirect(`/t/${teamSlug}/triage`);
  }

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        description="New work. The first matching rule sets assignee, status, and label. Otherwise the triage owner is notified."
        title={(await serverTranslator())("triage.title")}
      />
      {membership.role !== "GUEST" ? (
        <section className="border-b border-separator px-4 py-4">
          <h2 className="text-sm font-semibold">Rules</h2>
          <ul className="mt-2 space-y-1 text-[13px]">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-muted">
                  {[
                    rule.titleContains ? `title “${rule.titleContains}”` : null,
                    rule.priority,
                    rule.label?.name,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Any issue"}
                  {" → "}
                  {[
                    rule.setAssignee
                      ? (rule.setAssignee.name ?? rule.setAssignee.email)
                      : null,
                    rule.setStatus,
                    rule.addLabel?.name,
                  ]
                    .filter(Boolean)
                    .join(", ") || "no change"}
                </span>
                <form action={removeRule}>
                  <input name="ruleId" type="hidden" value={rule.id} />
                  <Button size="sm" type="submit" variant="ghost">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
            {rules.length === 0 ? (
              <li className="text-muted">
                No rules yet. Unassigned issues stay in this queue.
              </li>
            ) : null}
          </ul>
          <div className="mt-4">
            <TriageRulesForm
              action={addRule}
              labels={labels.map((label) => ({
                id: label.id,
                label: label.name,
              }))}
              members={members.map((member) => ({
                id: member.user.id,
                label: member.user.name ?? member.user.email,
              }))}
            />
          </div>
          <h2 className="mt-6 text-sm font-semibold">When status changes</h2>
          <ul className="mt-2 space-y-1 text-[13px]">
            {statusRuleList.map((rule) => (
              <li key={rule.id} className="text-muted">
                {rule.fromStatus} →{" "}
                {[
                  rule.setAssignee
                    ? (rule.setAssignee.name ?? rule.setAssignee.email)
                    : null,
                  rule.addLabel?.name,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </li>
            ))}
          </ul>
          <form
            action={async (formData) => {
              "use server";
              const value = (name: string) => {
                const raw = String(formData.get(name) ?? "").trim();

                return raw || null;
              };

              try {
                await statusRules.createStatusRule(team.id, {
                  fromStatus: String(formData.get("fromStatus") ?? "TODO"),
                  setAssigneeId: value("setAssigneeId"),
                  addLabelId: value("addLabelId"),
                });
              } catch {
                // Needs a status plus an assignee or label.
              }
              redirect(`/t/${teamSlug}/triage`);
            }}
            className="mt-3 flex flex-wrap items-end gap-2"
          >
            <label className="text-[12px] text-muted">
              Status
              <select
                className="mt-1 block h-8 rounded-md border border-separator bg-background px-2 text-[13px]"
                name="fromStatus"
              >
                {["BACKLOG", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"].map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="text-[12px] text-muted">
              Assign
              <select
                className="mt-1 block h-8 rounded-md border border-separator bg-background px-2 text-[13px]"
                name="setAssigneeId"
              >
                <option value="">No change</option>
                {members.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name ?? member.user.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] text-muted">
              Add label
              <select
                className="mt-1 block h-8 rounded-md border border-separator bg-background px-2 text-[13px]"
                name="addLabelId"
              >
                <option value="">No label</option>
                {labels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
            </label>
            <Button size="sm" type="submit">
              Add status rule
            </Button>
          </form>
        </section>
      ) : null}
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
              <TriageSuggest
                apply={async (priority, suggestedLabels) => {
                  "use server";
                  const labelIds = labels
                    .filter((label) =>
                      suggestedLabels.some(
                        (name) =>
                          name.toLowerCase() === label.name.toLowerCase(),
                      ),
                    )
                    .map((label) => label.id);

                  await issuesService.updateIssue(
                    team.id,
                    issue.id,
                    { priority },
                    membership.role,
                    teamCtx.user.id,
                  );
                  const { prisma } = await import("@/lib/db");

                  await Promise.all(
                    labelIds.map((labelId) =>
                      prisma.issueLabel.upsert({
                        where: {
                          issueId_labelId: { issueId: issue.id, labelId },
                        },
                        create: { issueId: issue.id, labelId },
                        update: {},
                      }),
                    ),
                  );
                  redirect(`/t/${teamSlug}/triage`);
                }}
                suggest={async () => {
                  "use server";
                  // Uses the model when configured, keyword rules otherwise; only labels
                  // that exist in this team can come back.
                  const result = await suggestTriage(
                    issue.title,
                    issue.description ?? "",
                    labels.map((label) => label.name),
                  );

                  return { priority: result.priority, labels: result.labels };
                }}
              />
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

import { notFound } from "next/navigation";

import { SubmitButton as Button } from "@/components/submit-button";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings-nav";
import { deleteTeamAction, updateTeamAction } from "@/lib/actions/teams";
import { isDemoMode } from "@/lib/utils";
import { requireTeamBySlug } from "@/lib/rbac";
import { listMembers } from "@/lib/services/members";

export default async function SettingsPage({
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
  const canAdmin = membership.role === "ADMIN" || membership.role === "OWNER";
  const members = canAdmin ? await listMembers(team.id) : [];

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader title="Team settings" />

      <SettingsNav canAdmin={canAdmin} teamSlug={teamSlug} />

      {canAdmin ? (
        <form
          action={async (formData) => {
            "use server";
            await updateTeamAction(teamSlug, formData);
          }}
          className="space-y-6"
        >
          {/* General Section */}
          <section className="space-y-4 rounded-xl border border-separator bg-surface p-5">
            <div>
              <h2 className="font-semibold text-foreground">General</h2>
              <p className="text-xs text-muted">
                Basic team workspace identification
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted">Team Name</span>
                <input
                  required
                  className="rounded-lg border border-separator bg-background px-3 py-2 text-foreground"
                  defaultValue={team.name}
                  name="name"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted">Slug</span>
                <input
                  required
                  className="rounded-lg border border-separator bg-background px-3 py-2 text-foreground"
                  defaultValue={team.slug}
                  name="slug"
                />
              </label>
            </div>
          </section>

          {/* Cycles Section */}
          <section className="space-y-4 rounded-xl border border-separator bg-surface p-5">
            <div>
              <h2 className="font-semibold text-foreground">Sprint Cycles</h2>
              <p className="text-xs text-muted">
                Configure default duration and cooldown period between cycles
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted">Cycle duration (weeks)</span>
                <input
                  className="rounded-lg border border-separator bg-background px-3 py-2 text-foreground"
                  defaultValue={team.cycleDurationWeeks}
                  max={8}
                  min={1}
                  name="cycleDurationWeeks"
                  type="number"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted">Cycle cooldown (days)</span>
                <input
                  className="rounded-lg border border-separator bg-background px-3 py-2 text-foreground"
                  defaultValue={team.cycleCooldownDays}
                  min={0}
                  name="cycleCooldownDays"
                  type="number"
                />
              </label>
            </div>
          </section>

          {/* Integrations Section */}
          <section className="space-y-4 rounded-xl border border-separator bg-surface p-5">
            <div>
              <h2 className="font-semibold text-foreground">Integrations</h2>
              <p className="text-xs text-muted">
                Connect GitHub and Slack for automated notifications and
                workflows
              </p>
            </div>
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted">
                  GitHub repository (owner/repo)
                </span>
                <input
                  className="rounded-lg border border-separator bg-background px-3 py-2 text-foreground"
                  defaultValue={team.githubRepo ?? ""}
                  name="githubRepo"
                  placeholder="e.g. acme/web-app"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  defaultChecked={team.githubMergeCompletes}
                  name="githubMergeCompletes"
                  type="checkbox"
                  value="true"
                />
                Auto-complete: move issue to Done when a linked GitHub PR merges
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted">Slack incoming webhook</span>
                <input
                  className="rounded-lg border border-separator bg-background px-3 py-2 text-foreground"
                  defaultValue={team.slackWebhookUrl ?? ""}
                  name="slackWebhookUrl"
                  placeholder="https://hooks.slack.com/services/..."
                />
                <span className="text-[11px] text-muted">
                  Receives automated alerts on issue creation, assignment, and
                  status updates
                </span>
              </label>
            </div>
          </section>

          {/* Triage & SLA Section */}
          <section className="space-y-4 rounded-xl border border-separator bg-surface p-5">
            <div>
              <h2 className="font-semibold text-foreground">Triage & SLA</h2>
              <p className="text-xs text-muted">
                Configure default triage ownership, operational windows, and
                priority resolution targets
              </p>
            </div>
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted">Default triage owner</span>
                <select
                  className="rounded-lg border border-separator bg-background px-3 py-2 text-foreground"
                  defaultValue={team.triageOwnerId ?? ""}
                  name="triageOwnerId"
                >
                  <option value="">None (unassigned queue)</option>
                  {members.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.name ?? member.user.email}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted">SLA timezone</span>
                  <input
                    className="rounded-lg border border-separator bg-background px-3 py-2 text-foreground"
                    defaultValue={team.timezone}
                    name="timezone"
                    placeholder="UTC"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted">
                    SLA active weekdays (1=Mon … 7=Sun)
                  </span>
                  <input
                    className="rounded-lg border border-separator bg-background px-3 py-2 text-foreground"
                    defaultValue={team.slaWeekdays}
                    name="slaWeekdays"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex flex-col gap-1">
                  <span className="text-muted">
                    Operating start hour (0-23)
                  </span>
                  <input
                    className="rounded-lg border border-separator bg-background px-3 py-2 text-foreground"
                    defaultValue={team.slaStartHour}
                    max={23}
                    min={0}
                    name="slaStartHour"
                    type="number"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted">Operating end hour (1-24)</span>
                  <input
                    className="rounded-lg border border-separator bg-background px-3 py-2 text-foreground"
                    defaultValue={team.slaEndHour}
                    max={24}
                    min={1}
                    name="slaEndHour"
                    type="number"
                  />
                </label>
              </div>

              <div>
                <span className="text-xs font-medium text-foreground">
                  Priority SLA targets (hours to resolve)
                </span>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"] as const).map(
                    (key) => (
                      <label key={key} className="flex flex-col gap-1 text-xs">
                        <span className="text-muted">{key}</span>
                        <input
                          className="rounded-lg border border-separator bg-background px-3 py-2 text-sm text-foreground"
                          defaultValue={
                            team.slaHours &&
                            typeof team.slaHours === "object" &&
                            !Array.isArray(team.slaHours)
                              ? String(
                                  (team.slaHours as Record<string, number>)[
                                    key
                                  ] ?? "",
                                )
                              : ""
                          }
                          min={0}
                          name={`sla_${key}`}
                          placeholder="Hours"
                          type="number"
                        />
                      </label>
                    ),
                  )}
                </div>
              </div>
            </div>
          </section>

          <Button type="submit">Save settings</Button>
        </form>
      ) : (
        <p className="text-muted text-sm">
          {team.name} · Only admins can edit team settings.
        </p>
      )}

      {membership.role === "OWNER" && !isDemoMode() ? (
        <form
          action={async (formData) => {
            "use server";
            await deleteTeamAction(teamSlug, formData);
          }}
          className="space-y-3 rounded-xl border border-danger/40 p-4"
        >
          <h2 className="font-semibold text-danger">Danger zone</h2>
          <p className="text-sm text-muted">
            Type <code>{team.slug}</code> to permanently delete this team.
          </p>
          <input
            className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm"
            name="confirm"
            placeholder={team.slug}
          />
          <Button type="submit" variant="danger">
            Delete team
          </Button>
        </form>
      ) : null}

      {isDemoMode() ? (
        <p className="text-sm text-muted">
          Demo mode is on — team deletion is disabled. Shared demo data resets
          daily via cron (secret-gated). Do not put real secrets here.
        </p>
      ) : null}
    </div>
  );
}

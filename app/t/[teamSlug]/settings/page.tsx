import NextLink from "next/link";
import { notFound } from "next/navigation";

import { SubmitButton as Button } from "@/components/submit-button";
import { PageHeader } from "@/components/page-header";
import { deleteTeamAction, updateTeamAction } from "@/lib/actions/teams";
import { isDemoMode } from "@/lib/utils";
import { requireTeamBySlug } from "@/lib/rbac";

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

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader title="Team settings" />

      <nav className="flex flex-wrap gap-3 text-sm">
        <NextLink className="text-accent" href={`/t/${teamSlug}/settings`}>
          General
        </NextLink>
        <NextLink
          className="text-muted hover:text-foreground"
          href={`/t/${teamSlug}/settings/members`}
        >
          Members
        </NextLink>
        <NextLink
          className="text-muted hover:text-foreground"
          href={`/t/${teamSlug}/settings/labels`}
        >
          Labels
        </NextLink>
        <NextLink
          className="text-muted hover:text-foreground"
          href={`/t/${teamSlug}/settings/views`}
        >
          Views
        </NextLink>
        <NextLink
          className="text-muted hover:text-foreground"
          href={`/t/${teamSlug}/settings/workflow`}
        >
          Workflow
        </NextLink>
        <NextLink
          className="text-muted hover:text-foreground"
          href={`/t/${teamSlug}/settings/import`}
        >
          Import
        </NextLink>
        <NextLink
          className="text-muted hover:text-foreground"
          href={`/t/${teamSlug}/settings/api-keys`}
        >
          API keys
        </NextLink>
        {canAdmin ? (
          <NextLink
            className="text-muted hover:text-foreground"
            href={`/t/${teamSlug}/settings/webhooks`}
          >
            Webhooks
          </NextLink>
        ) : null}
      </nav>

      {canAdmin ? (
        <form
          action={async (formData) => {
            "use server";
            await updateTeamAction(teamSlug, formData);
          }}
          className="space-y-3 rounded-xl border border-separator p-4"
        >
          <h2 className="font-semibold">General</h2>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Name</span>
            <input
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={team.name}
              name="name"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Slug</span>
            <input
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={team.slug}
              name="slug"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Cycle cooldown (days)</span>
            <input
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={team.cycleCooldownDays}
              min={0}
              name="cycleCooldownDays"
              type="number"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Slack incoming webhook</span>
            <input
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={team.slackWebhookUrl ?? ""}
              name="slackWebhookUrl"
              placeholder="https://hooks.slack.com/..."
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              defaultChecked={team.githubMergeCompletes}
              name="githubMergeCompletes"
              type="checkbox"
              value="true"
            />
            Move issue to Done when a linked PR merges
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Cycle duration (weeks)</span>
            <input
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={team.cycleDurationWeeks}
              max={8}
              min={1}
              name="cycleDurationWeeks"
              type="number"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">GitHub repo (owner/name)</span>
            <input
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={team.githubRepo ?? ""}
              name="githubRepo"
              placeholder="rejisterjack/verk"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(["URGENT", "HIGH", "MEDIUM", "LOW"] as const).map((key) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-muted">{key} SLA hours</span>
                <input
                  className="rounded-lg border border-separator bg-background px-3 py-2"
                  defaultValue={
                    team.slaHours &&
                    typeof team.slaHours === "object" &&
                    !Array.isArray(team.slaHours)
                      ? String(
                          (team.slaHours as Record<string, number>)[key] ?? "",
                        )
                      : ""
                  }
                  min={0}
                  name={`sla_${key}`}
                  type="number"
                />
              </label>
            ))}
          </div>
          <Button type="submit">Save</Button>
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
          Demo mode is on — team deletion is disabled.
        </p>
      ) : null}
    </div>
  );
}

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

      <nav className="flex gap-3 text-sm">
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
          href={`/t/${teamSlug}/settings/api-keys`}
        >
          API keys
        </NextLink>
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

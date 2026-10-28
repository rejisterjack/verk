import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import * as webhooksService from "@/lib/services/webhooks";

export default async function WebhooksPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ secret?: string; created?: string }>;
}) {
  const { teamSlug } = await params;
  const query = await searchParams;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "ADMIN");
  } catch {
    notFound();
  }

  const teamId = teamCtx.team.id;
  const userId = teamCtx.user.id!;
  const hooks = await webhooksService.listWebhooks(teamId);

  async function create(formData: FormData) {
    "use server";
    const hook = await webhooksService.createWebhook(teamId, userId, {
      url: String(formData.get("url") ?? ""),
      events: ["issue.created", "issue.updated", "comment.created"],
    });

    redirect(
      `/t/${teamSlug}/settings/webhooks?created=${hook.id}&secret=${encodeURIComponent(hook.secret)}`,
    );
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        description="POST JSON to your endpoint on issue and comment events"
        title="Webhooks"
      />
      {query.secret ? (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium">Copy your signing secret now</p>
          <p className="mt-1 break-all font-mono text-xs">{query.secret}</p>
          <p className="mt-2 text-xs text-muted">
            It will not be shown again.
          </p>
        </div>
      ) : null}
      <form action={create} className="mb-6 flex gap-2">
        <input
          required
          className="flex-1 rounded-lg border border-separator bg-background px-3 py-2 text-sm"
          name="url"
          placeholder="https://example.com/hooks/verk"
          type="url"
        />
        <Button type="submit">Add</Button>
      </form>
      <ul className="space-y-2 text-sm">
        {hooks.map((h) => (
          <li
            key={h.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-separator px-3 py-2"
          >
            <div>
              <p className="font-mono text-xs">{h.url}</p>
              <p className="text-xs text-muted">
                {h.disabledAt ? "Disabled" : "Active"} ·{" "}
                {h.events.join(", ")}
              </p>
            </div>
            <div className="flex gap-1">
              <form
                action={async () => {
                  "use server";
                  await webhooksService.setWebhookDisabled(
                    teamId,
                    h.id,
                    !h.disabledAt,
                  );
                  redirect(`/t/${teamSlug}/settings/webhooks`);
                }}
              >
                <Button size="sm" type="submit" variant="ghost">
                  {h.disabledAt ? "Enable" : "Disable"}
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await webhooksService.deleteWebhook(teamId, h.id);
                  redirect(`/t/${teamSlug}/settings/webhooks`);
                }}
              >
                <Button size="sm" type="submit" variant="danger">
                  Delete
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { ZodError } from "zod";

import { AuthError } from "@/lib/errors";

import { ViewToolbar } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { CreateWebhookForm } from "@/components/webhooks-form";
import { requireTeamBySlug } from "@/lib/rbac";
import * as webhooksService from "@/lib/services/webhooks";

export default async function WebhooksPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ secret?: string; created?: string; error?: string }>;
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
  const [hooks, deliveries] = await Promise.all([
    webhooksService.listWebhooks(teamId),
    webhooksService.listDeliveries(teamId, 25),
  ]);

  async function create(formData: FormData) {
    "use server";
    let hook;

    try {
      hook = await webhooksService.createWebhook(teamId, userId, {
        url: String(formData.get("url") ?? ""),
        events: ["issue.created", "issue.updated", "comment.created"],
      });
    } catch (error) {
      const message =
        error instanceof AuthError
          ? error.message
          : error instanceof ZodError
            ? "Enter a valid webhook URL."
            : "Could not add that webhook.";

      redirect(
        `/t/${teamSlug}/settings/webhooks?error=${encodeURIComponent(message)}`,
      );
    }

    revalidatePath(`/t/${teamSlug}/settings/webhooks`);
    redirect(
      `/t/${teamSlug}/settings/webhooks?created=${hook.id}&secret=${encodeURIComponent(hook.secret)}`,
    );
  }

  return (
    <div className="px-4 py-3 max-w-lg">
      <ViewToolbar
        description="POST JSON to your endpoint on issue and comment events"
        title="Webhooks"
      />
      {query.error ? (
        <p className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {query.error}
        </p>
      ) : null}
      {query.secret ? (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium">Copy your signing secret now</p>
          <p className="mt-1 break-all font-mono text-xs">{query.secret}</p>
          <p className="mt-2 text-xs text-muted">It will not be shown again.</p>
        </div>
      ) : null}
      <CreateWebhookForm action={create} />
      <ul className="space-y-2 text-sm">
        {hooks.map((h) => (
          <li
            key={h.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-separator px-3 py-2"
          >
            <div>
              <p className="font-mono text-xs">{h.url}</p>
              <p className="text-xs text-muted">
                {h.disabledAt ? "Disabled" : "Active"} · {h.events.join(", ")}
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
                    { id: userId },
                  );
                  revalidatePath(`/t/${teamSlug}/settings/webhooks`);
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
                  await webhooksService.deleteWebhook(teamId, h.id, {
                    id: userId,
                  });
                  revalidatePath(`/t/${teamSlug}/settings/webhooks`);
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

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Recent deliveries</h2>
        <p className="text-xs text-muted">
          Failed deliveries retry after 1 minute, 5 minutes, 30 minutes and 2
          hours (the daily job picks up anything still waiting). Entries are
          kept for 14 days.
        </p>
        {deliveries.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing delivered yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-xs">
            {deliveries.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-separator px-2 py-1.5"
              >
                <span
                  className={
                    d.status === "delivered"
                      ? "text-success"
                      : d.status === "failed"
                        ? "text-danger"
                        : "text-warning"
                  }
                >
                  {d.status}
                </span>
                <span className="font-mono">{d.event}</span>
                <span className="min-w-0 flex-1 truncate text-muted">
                  {d.webhook.url} · {d.attempts} attempt
                  {d.attempts === 1 ? "" : "s"}
                  {d.lastCode ? ` · HTTP ${d.lastCode}` : ""}
                  {d.lastError && !d.lastCode ? ` · ${d.lastError}` : ""}
                </span>
                {d.status !== "delivered" ? (
                  <form
                    action={async () => {
                      "use server";
                      await webhooksService.retryDelivery(teamId, d.id);
                      revalidatePath(`/t/${teamSlug}/settings/webhooks`);
                    }}
                  >
                    <Button size="sm" type="submit" variant="ghost">
                      Retry
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

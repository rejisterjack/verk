import { notFound, redirect } from "next/navigation";
import NextLink from "next/link";

import { SubmitButton as Button } from "@/components/submit-button";
import { PageHeader } from "@/components/page-header";
import { auth } from "@/lib/auth";
import { requireTeamBySlug } from "@/lib/rbac";
import * as notifications from "@/lib/services/notifications";

export default async function InboxPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx: Awaited<ReturnType<typeof requireTeamBySlug>>;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }

  const session = await auth();

  if (!session?.user?.id) redirect("/login");

  const teamId = teamCtx.team.id;
  const userId = session.user.id;
  const items = await notifications.listInbox(userId, teamId);

  async function markAll() {
    "use server";
    const user = await auth();

    if (!user?.user?.id) return;
    await notifications.markAllRead(user.user.id, teamId);
  }

  return (
    <div>
      <PageHeader
        actions={
          <form action={markAll}>
            <Button size="sm" type="submit" variant="tertiary">
              Mark all read
            </Button>
          </form>
        }
        description="Catch up on assignments and comments — G then I · snooze 1h or tomorrow"
        title="Inbox"
      />
      {items.length === 0 ? (
        <p className="text-sm text-muted">You&apos;re all caught up.</p>
      ) : (
        <ul className="divide-y divide-separator rounded-xl border border-separator">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 text-sm ${
                n.readAt ? "opacity-60" : "bg-accent/5"
              }`}
            >
              <div className="flex-1">
                <p className="font-medium">{n.title}</p>
                {n.body ? (
                  <p className="mt-0.5 text-xs text-muted line-clamp-2">
                    {n.body}
                  </p>
                ) : null}
                {n.issue ? (
                  <NextLink
                    className="mt-1 inline-block text-xs text-accent"
                    href={`/t/${teamSlug}/issues/${n.issue.number}`}
                  >
                    Open issue
                  </NextLink>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <form
                  action={async () => {
                    "use server";
                    const user = await auth();

                    if (!user?.user?.id) return;
                    await notifications.markNotificationRead(user.user.id, n.id);
                  }}
                >
                  <Button size="sm" type="submit" variant="ghost">
                    Read
                  </Button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    const user = await auth();

                    if (!user?.user?.id) return;
                    await notifications.snoozeNotification(
                      user.user.id,
                      n.id,
                      new Date(Date.now() + 60 * 60 * 1000),
                    );
                  }}
                >
                  <Button size="sm" type="submit" variant="ghost">
                    1h
                  </Button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    const user = await auth();

                    if (!user?.user?.id) return;
                    const tomorrow = new Date();

                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(9, 0, 0, 0);
                    await notifications.snoozeNotification(
                      user.user.id,
                      n.id,
                      tomorrow,
                    );
                  }}
                >
                  <Button size="sm" type="submit" variant="ghost">
                    Tomorrow
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

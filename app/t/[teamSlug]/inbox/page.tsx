import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import NextLink from "next/link";

import { SubmitButton as Button } from "@/components/submit-button";
import { ViewToolbar } from "@/components/page-header";
import { auth } from "@/lib/auth";
import { requireTeamBySlug } from "@/lib/rbac";
import * as notifications from "@/lib/services/notifications";
import { listPulse } from "@/lib/services/surface";

export default async function InboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { teamSlug } = await params;
  const { view } = await searchParams;
  const showPulse = view === "pulse";
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
  const [items, pulse] = await Promise.all([
    notifications.listInbox(userId, teamId),
    listPulse(teamId),
  ]);
  const inboxPath = `/t/${teamSlug}/inbox`;
  const teamPath = `/t/${teamSlug}`;

  async function markAll() {
    "use server";
    const user = await auth();

    if (!user?.user?.id) return;
    await notifications.markAllRead(user.user.id, teamId);
    revalidatePath(inboxPath);
    revalidatePath(teamPath, "layout");
  }

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          <form action={markAll}>
            <Button size="sm" type="submit" variant="tertiary">
              Mark all read
            </Button>
          </form>
        }
        title="Inbox"
      />
      <div className="flex gap-3 border-b border-separator px-4 py-2 text-[13px]">
        <NextLink
          className={showPulse ? "text-muted" : "font-medium text-foreground"}
          href={`/t/${teamSlug}/inbox`}
        >
          Notifications
        </NextLink>
        <NextLink
          className={showPulse ? "font-medium text-foreground" : "text-muted"}
          href={`/t/${teamSlug}/inbox?view=pulse`}
        >
          Pulse
        </NextLink>
      </div>
      {showPulse ? (
        <section className="border-b border-separator px-4 py-3">
          <h2 className="text-[12px] font-medium uppercase tracking-wide text-muted">
            Pulse
          </h2>
          {pulse.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted">
              No recent team activity.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-[13px]">
              {pulse.map((item) => (
                <li key={item.id}>
                  <NextLink
                    className="hover:text-accent"
                    href={
                      item.kind === "issue"
                        ? `/t/${teamSlug}/issues/${item.href}`
                        : `/t/${teamSlug}/projects/${item.href}`
                    }
                  >
                    <span className="font-medium">{item.title}</span>
                    <span className="text-muted"> · {item.detail}</span>
                  </NextLink>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : items.length === 0 ? (
        <p className="px-4 py-8 text-[13px] text-muted">
          You&apos;re all caught up.
        </p>
      ) : (
        <ul className="divide-y divide-separator">
          {items.map((n) => {
            const issueHref = n.issue
              ? `/t/${teamSlug}/issues/${n.issue.number}`
              : null;

            return (
              <li
                key={n.id}
                className={`group flex items-start gap-3 px-4 py-2.5 text-[13px] ${
                  n.readAt ? "opacity-60" : "bg-accent/5"
                }`}
              >
                <div className="min-w-0 flex-1">
                  {issueHref ? (
                    <NextLink
                      className="font-medium text-foreground hover:text-accent"
                      href={issueHref}
                    >
                      {n.title}
                    </NextLink>
                  ) : (
                    <p className="font-medium">{n.title}</p>
                  )}
                  {n.body ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {n.body}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <form
                    action={async () => {
                      "use server";
                      const user = await auth();

                      if (!user?.user?.id) return;
                      await notifications.markNotificationRead(
                        user.user.id,
                        n.id,
                      );
                      revalidatePath(inboxPath);
                      revalidatePath(teamPath, "layout");
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
                      revalidatePath(inboxPath);
                      revalidatePath(teamPath, "layout");
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
                      revalidatePath(inboxPath);
                      revalidatePath(teamPath, "layout");
                    }}
                  >
                    <Button size="sm" type="submit" variant="ghost">
                      Tomorrow
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import {
  CalendarDaysIcon,
  Cog6ToothIcon,
  FolderIcon,
  FunnelIcon,
  InboxIcon,
  QueueListIcon,
  UserIcon,
  ViewColumnsIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import clsx from "clsx";
import NextLink from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { InstallPrompt } from "@/components/pwa/install-prompt";
import { VerkLogo } from "@/components/verk-logo";
import { logoutAction } from "@/lib/actions/auth";

type TeamOption = { slug: string; name: string };
type ViewOption = { id: string; name: string };

export function AppSidebar({
  teamSlug,
  teams,
  role,
  views = [],
  inboxCount = 0,
  workspaceSlug,
}: {
  teamSlug: string;
  teams: TeamOption[];
  role: string;
  views?: ViewOption[];
  inboxCount?: number;
  workspaceSlug?: string | null;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const base = `/t/${teamSlug}`;

  const links = [
    {
      href: `${base}/inbox`,
      label: "Inbox",
      icon: InboxIcon,
      badge: inboxCount,
    },
    {
      href: `${base}/issues?assignee=me`,
      label: "My issues",
      icon: UserIcon,
      match: () =>
        pathname.startsWith(`${base}/issues`) &&
        search.get("assignee") === "me",
    },
    {
      href: `${base}/triage`,
      label: "Triage",
      icon: FunnelIcon,
    },
    {
      href: `${base}/issues`,
      label: "Issues",
      icon: QueueListIcon,
      match: () =>
        pathname.startsWith(`${base}/issues`) &&
        search.get("assignee") !== "me" &&
        search.get("layout") !== "board" &&
        !pathname.includes("/issues/"),
    },
    {
      href: `${base}/issues?layout=board`,
      label: "Board",
      icon: ViewColumnsIcon,
      match: () =>
        pathname.startsWith(`${base}/issues`) &&
        search.get("layout") === "board",
    },
    {
      href: `${base}/projects`,
      label: "Projects",
      icon: FolderIcon,
    },
    {
      href: `${base}/cycles`,
      label: "Cycles",
      icon: CalendarDaysIcon,
    },
    {
      href: `${base}/roadmap`,
      label: "Roadmap",
      icon: CalendarDaysIcon,
    },
    {
      href: `${base}/insights`,
      label: "Insights",
      icon: QueueListIcon,
    },
    {
      href: `${base}/docs`,
      label: "Docs",
      icon: FolderIcon,
    },
    {
      href: `${base}/customers`,
      label: "Customers",
      icon: UserIcon,
    },
    ...(role === "GUEST"
      ? []
      : [
          {
            href: `${base}/settings`,
            label: "Settings",
            icon: Cog6ToothIcon,
          },
        ]),
  ];

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-separator bg-surface p-3 gap-3">
      <NextLink
        className="flex items-center px-1 transition-transform hover:scale-[1.02]"
        href="/"
      >
        <VerkLogo size={24} />
      </NextLink>
      {workspaceSlug ? (
        <NextLink
          className="px-1 text-xs text-muted hover:text-foreground"
          href={`/w/${workspaceSlug}`}
        >
          Workspace
        </NextLink>
      ) : null}

      <label className="flex flex-col gap-1 px-1 text-sm">
        <span className="text-muted text-[10px] uppercase tracking-wide">
          Team
        </span>
        <select
          aria-label="Switch team"
          className="rounded-md border border-separator bg-background px-2 py-1.5 text-sm"
          value={teamSlug}
          onChange={(e) => {
            router.push(`/t/${e.target.value}/issues`);
          }}
        >
          {teams.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <nav className="flex flex-col gap-0.5">
        {links.map((link) => {
          const Icon = link.icon;
          const active = link.match
            ? link.match()
            : pathname.startsWith(link.href.split("?")[0]!);

          return (
            <NextLink
              key={link.href + link.label}
              className={clsx(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                active
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-muted hover:text-foreground hover:bg-default",
              )}
              href={link.href}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{link.label}</span>
              {link.badge ? (
                <span className="rounded bg-accent/20 px-1.5 text-[10px] font-medium text-accent">
                  {link.badge}
                </span>
              ) : null}
            </NextLink>
          );
        })}
      </nav>

      {views.length ? (
        <div className="px-1">
          <p className="text-[10px] uppercase tracking-wide text-muted mb-1">
            Views
          </p>
          <div className="flex flex-col gap-0.5">
            {views.map((v) => (
              <NextLink
                key={v.id}
                className="rounded-md px-2.5 py-1.5 text-[13px] text-muted hover:bg-default hover:text-foreground"
                href={`${base}/issues?view=${v.id}`}
              >
                {v.name}
              </NextLink>
            ))}
          </div>
        </div>
      ) : null}

      <InstallPrompt />
      <div className="mt-auto flex flex-col gap-1.5 px-1 text-[11px] text-muted">
        <span>⌘K command · ? shortcuts</span>
        <span>Role: {role}</span>
        <Button
          size="sm"
          variant="tertiary"
          onPress={() => router.push("/onboarding")}
        >
          New team
        </Button>
        <form action={logoutAction}>
          <Button className="w-full" size="sm" type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}

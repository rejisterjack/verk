"use client";

import {
  CalendarDaysIcon,
  Cog6ToothIcon,
  QueueListIcon,
  ViewColumnsIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import clsx from "clsx";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { logoutAction } from "@/lib/actions/auth";

type TeamOption = { slug: string; name: string };

export function AppSidebar({
  teamSlug,
  teams,
  role,
}: {
  teamSlug: string;
  teams: TeamOption[];
  role: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/t/${teamSlug}`;
  const links = [
    { href: `${base}/issues`, label: "Issues", icon: QueueListIcon },
    { href: `${base}/board`, label: "Board", icon: ViewColumnsIcon },
    { href: `${base}/cycles`, label: "Cycles", icon: CalendarDaysIcon },
    { href: `${base}/settings`, label: "Settings", icon: Cog6ToothIcon },
  ];

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-separator bg-surface p-4 gap-4">
      <NextLink className="flex items-center gap-2 font-bold" href="/">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground text-sm">
          V
        </span>
        Verk
      </NextLink>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted text-xs uppercase tracking-wide">Team</span>
        <select
          aria-label="Switch team"
          className="rounded-lg border border-separator bg-background px-3 py-2"
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

      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname.startsWith(link.href);

          return (
            <NextLink
              key={link.href}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-muted hover:text-foreground hover:bg-default",
              )}
              href={link.href}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </NextLink>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 text-xs text-muted">
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

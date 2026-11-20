"use client";

import type { MessageKey } from "@/lib/i18n";

import {
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  FlagIcon,
  FolderIcon,
  FunnelIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  QueueListIcon,
  RocketLaunchIcon,
  UserGroupIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import clsx from "clsx";
import NextLink from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { useKeyboardShell } from "@/components/app/keyboard-shell";
import { useT } from "@/components/locale-provider";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { logoutAction } from "@/lib/actions/auth";
import {
  moveFavoriteToFolderAction,
  reorderFavoritesAction,
} from "@/lib/actions/favorites";

type TeamOption = { slug: string; name: string };
type ViewOption = { id: string; name: string };

function TeamSwitcher({
  teams,
  teamSlug,
}: {
  teams: TeamOption[];
  teamSlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = teams.find((t) => t.slug === teamSlug) ?? teams[0];
  const initial =
    (current?.name ?? "Team").trim().charAt(0).toUpperCase() || "T";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Switch team"
        className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-1.5 text-left outline-none transition-colors hover:bg-default focus-visible:ring-2 focus-visible:ring-accent/40"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span
          aria-hidden
          className="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-accent text-[10px] font-bold text-accent-foreground"
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight text-foreground">
          {current?.name ?? "Team"}
        </span>
        <ChevronDownIcon
          className={clsx(
            "size-3.5 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <ul
          aria-label="Teams"
          className="absolute inset-x-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg border border-separator bg-background py-1 shadow-lg"
          id={listId}
          role="listbox"
        >
          {teams.map((team) => {
            const selected = team.slug === teamSlug;
            const letter = team.name.trim().charAt(0).toUpperCase() || "T";

            return (
              <li key={team.slug} aria-selected={selected} role="option">
                <button
                  className={clsx(
                    "flex w-full min-w-0 items-center gap-2 px-2 py-1.5 text-left text-[13px] transition-colors",
                    selected
                      ? "bg-accent/10 text-accent"
                      : "text-foreground hover:bg-default",
                  )}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (team.slug !== teamSlug) {
                      router.push(`/t/${team.slug}/issues`);
                    }
                  }}
                >
                  <span
                    aria-hidden
                    className="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-default text-[10px] font-semibold"
                  >
                    {letter}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {team.name}
                  </span>
                  {selected ? (
                    <span className="text-[11px] font-medium text-accent">
                      Current
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

const NAV_LABEL_KEYS: Record<string, MessageKey> = {
  Inbox: "nav.inbox",
  "My issues": "nav.myIssues",
  Issues: "nav.issues",
  Cycles: "nav.cycles",
  Projects: "nav.projects",
  Views: "nav.views",
  Triage: "nav.triage",
  Drafts: "nav.drafts",
  Initiatives: "nav.initiatives",
  Roadmap: "nav.roadmap",
  Timeline: "nav.timeline",
  Calendar: "nav.calendar",
  Dashboards: "nav.dashboards",
  Insights: "nav.insights",
  Releases: "nav.releases",
  Settings: "nav.settings",
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  match?: () => boolean;
};

function NavLink({
  item,
  indent = false,
  nested = false,
}: {
  item: NavItem;
  indent?: boolean;
  nested?: boolean;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const { t } = useT();
  const Icon = item.icon;
  // Known labels are translated; anything else (a saved view's name) is shown as written.
  const labelKey = NAV_LABEL_KEYS[item.label];
  const label = labelKey ? t(labelKey) : item.label;
  const active = item.match
    ? item.match()
    : pathname.startsWith(item.href.split("?")[0]!);

  // silence unused when match uses search externally
  void search;

  return (
    <NextLink
      className={clsx(
        "flex items-center gap-2 rounded-md py-1 text-[13px] transition-colors",
        nested ? "px-2 pl-10" : indent ? "px-2 pl-7" : "px-2",
        active
          ? "bg-accent/15 font-medium text-accent"
          : "text-muted hover:bg-default hover:text-foreground",
      )}
      href={item.href}
    >
      {!nested ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
      <span className="flex-1 truncate">{label}</span>
      {item.badge ? (
        <span className="rounded bg-accent/20 px-1.5 text-[10px] font-medium text-accent">
          {item.badge}
        </span>
      ) : null}
    </NextLink>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <button
        className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted hover:bg-default hover:text-foreground"
        type="button"
        onClick={onToggle}
      >
        <ChevronDownIcon
          className={clsx(
            "h-3 w-3 transition-transform",
            !open && "-rotate-90",
          )}
        />
        {title}
      </button>
      {open ? <div className="space-y-0.5">{children}</div> : null}
    </div>
  );
}

export type FavoriteLink = {
  id: string;
  kind: string;
  label: string;
  href: string;
  folder: string | null;
};

const FAVORITE_KIND_LABEL: Record<string, string> = {
  issue: "Issue",
  project: "Project",
  cycle: "Cycle",
  doc: "Doc",
  view: "View",
  initiative: "Initiative",
};

/** Move the favorite at `from` so it sits where `to` is, returning the new id order. */
function moveId(ids: string[], from: number, to: number): string[] {
  if (from < 0 || to < 0 || from >= ids.length || to >= ids.length) return ids;
  const next = [...ids];
  const [item] = next.splice(from, 1);

  next.splice(to, 0, item!);

  return next;
}

function FavoriteRow({
  link,
  index,
  total,
  onMove,
  onFolder,
}: {
  link: FavoriteLink;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onFolder: (id: string, folder: string | null) => void;
}) {
  const [menu, setMenu] = useState(false);

  return (
    <div className="group relative flex items-center">
      <NextLink
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 pl-7 text-[13px] text-muted hover:bg-default hover:text-foreground"
        href={link.href}
        title={`${FAVORITE_KIND_LABEL[link.kind] ?? link.kind}: ${link.label}`}
      >
        <span className="truncate">{link.label}</span>
      </NextLink>
      <button
        aria-expanded={menu}
        aria-label={`Options for ${link.label}`}
        className="absolute right-1 hidden rounded px-1 text-[12px] text-muted hover:text-foreground group-hover:block focus:block"
        type="button"
        onClick={() => setMenu((open) => !open)}
      >
        ⋯
      </button>
      {menu ? (
        <div
          className="absolute right-1 top-full z-30 w-40 rounded-md border border-separator bg-surface p-1 text-[12px] shadow-lg"
          role="menu"
        >
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-default disabled:opacity-40"
            disabled={index === 0}
            role="menuitem"
            type="button"
            onClick={() => {
              onMove(index, index - 1);
              setMenu(false);
            }}
          >
            Move up
          </button>
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-default disabled:opacity-40"
            disabled={index === total - 1}
            role="menuitem"
            type="button"
            onClick={() => {
              onMove(index, index + 1);
              setMenu(false);
            }}
          >
            Move down
          </button>
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-default"
            role="menuitem"
            type="button"
            onClick={() => {
              const name = window.prompt(
                "Folder name (leave empty for none)",
                link.folder ?? "",
              );

              if (name !== null) onFolder(link.id, name.trim() || null);
              setMenu(false);
            }}
          >
            {link.folder ? "Change folder…" : "Move to folder…"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FavoritesSection({
  teamSlug,
  favorites,
}: {
  teamSlug: string;
  favorites: FavoriteLink[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const [order, setOrder] = useState<string[] | null>(null);

  // The server list is the truth; a local order only lasts until the next refresh.
  const byId = new Map(favorites.map((link) => [link.id, link]));
  const ids = (order ?? favorites.map((link) => link.id)).filter((id) =>
    byId.has(id),
  );
  const ordered = ids.map((id) => byId.get(id)!);
  const folders = [
    ...new Set(ordered.flatMap((link) => (link.folder ? [link.folder] : []))),
  ];
  const loose = ordered.filter((link) => !link.folder);

  async function move(from: number, to: number) {
    const next = moveId(ids, from, to);

    setOrder(next);
    await reorderFavoritesAction(teamSlug, next);
    setOrder(null);
    router.refresh();
  }

  async function setFolder(id: string, folder: string | null) {
    await moveFavoriteToFolderAction(teamSlug, id, folder);
    router.refresh();
  }

  if (!favorites.length) return null;

  return (
    <Section open={open} title="Favorites" onToggle={() => setOpen((v) => !v)}>
      {loose.map((link) => (
        <FavoriteRow
          key={link.id}
          index={ids.indexOf(link.id)}
          link={link}
          total={ids.length}
          onFolder={setFolder}
          onMove={move}
        />
      ))}
      {folders.map((folder) => {
        const items = ordered.filter((link) => link.folder === folder);
        const isClosed = closed.has(folder);

        return (
          <div key={folder} className="space-y-0.5">
            <button
              aria-expanded={!isClosed}
              className="flex w-full items-center gap-1 rounded-md px-2 py-1 pl-5 text-[12px] font-medium text-muted hover:bg-default hover:text-foreground"
              type="button"
              onClick={() =>
                setClosed((prev) => {
                  const next = new Set(prev);

                  if (next.has(folder)) next.delete(folder);
                  else next.add(folder);

                  return next;
                })
              }
            >
              <ChevronDownIcon
                className={clsx("h-3 w-3", isClosed && "-rotate-90")}
              />
              <span className="truncate">{folder}</span>
              <span className="ml-auto text-[10px]">{items.length}</span>
            </button>
            {isClosed
              ? null
              : items.map((link) => (
                  <FavoriteRow
                    key={link.id}
                    index={ids.indexOf(link.id)}
                    link={link}
                    total={ids.length}
                    onFolder={setFolder}
                    onMove={move}
                  />
                ))}
          </div>
        );
      })}
    </Section>
  );
}

export function AppSidebar({
  teamSlug,
  teams,
  role,
  views = [],
  favorites,
  inboxCount = 0,
  workspaceSlug,
  teamName,
}: {
  teamSlug: string;
  teams: TeamOption[];
  role: string;
  views?: ViewOption[];
  /** The user's real favorites. Without it the sidebar falls back to pinned views. */
  favorites?: FavoriteLink[];
  inboxCount?: number;
  workspaceSlug?: string | null;
  teamName?: string;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const shell = useKeyboardShell();
  const base = `/t/${teamSlug}`;
  const isGuest = role === "GUEST";
  const moreActive =
    pathname.startsWith(`${base}/initiatives`) ||
    pathname.startsWith(`${base}/roadmap`) ||
    pathname.startsWith(`${base}/timeline`) ||
    pathname.startsWith(`${base}/calendar`) ||
    pathname.startsWith(`${base}/dashboards`) ||
    pathname.startsWith(`${base}/insights`) ||
    pathname.startsWith(`${base}/docs`) ||
    pathname.startsWith(`${base}/customers`) ||
    pathname.startsWith(`${base}/settings`);
  const [teamOpen, setTeamOpen] = useState(true);
  const [moreManualOpen, setMoreManualOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(true);
  const moreOpen = moreActive || moreManualOpen;
  const useFavorites = favorites !== undefined;

  const topLinks: NavItem[] = [
    ...(!isGuest
      ? [
          {
            href: `${base}/inbox`,
            label: "Inbox",
            icon: InboxIcon,
            badge: inboxCount || undefined,
          } satisfies NavItem,
        ]
      : []),
    {
      href: `${base}/issues?assignee=me`,
      label: "My issues",
      icon: UserIcon,
      match: () =>
        pathname.startsWith(`${base}/issues`) &&
        search.get("assignee") === "me",
    },
  ];

  const teamLinks: NavItem[] = [
    {
      href: `${base}/issues`,
      label: "Issues",
      icon: QueueListIcon,
      match: () =>
        pathname.startsWith(`${base}/issues`) &&
        search.get("assignee") !== "me",
    },
    ...(!isGuest
      ? ([
          {
            href: `${base}/cycles`,
            label: "Cycles",
            icon: CalendarDaysIcon,
            match: () =>
              pathname.startsWith(`${base}/cycles`) && !search.get("scope"),
          },
          {
            href: `${base}/cycles?scope=current`,
            label: "Current",
            icon: CalendarDaysIcon,
            match: () =>
              pathname.startsWith(`${base}/cycles`) &&
              search.get("scope") === "current",
          },
          {
            href: `${base}/cycles?scope=upcoming`,
            label: "Upcoming",
            icon: CalendarDaysIcon,
            match: () =>
              pathname.startsWith(`${base}/cycles`) &&
              search.get("scope") === "upcoming",
          },
          {
            href: `${base}/projects`,
            label: "Projects",
            icon: FolderIcon,
          },
          {
            href: `${base}/settings/views`,
            label: "Views",
            icon: QueueListIcon,
            match: () => pathname.startsWith(`${base}/settings/views`),
          },
          {
            href: `${base}/triage`,
            label: "Triage",
            icon: FunnelIcon,
          },
          {
            href: `${base}/drafts`,
            label: "Drafts",
            icon: DocumentTextIcon,
          },
        ] satisfies NavItem[])
      : []),
  ];

  const moreLinks: NavItem[] = [
    {
      href: `${base}/initiatives`,
      label: "Initiatives",
      icon: FlagIcon,
    },
    {
      href: `${base}/roadmap`,
      label: "Roadmap",
      icon: CalendarDaysIcon,
    },
    {
      href: `${base}/timeline`,
      label: "Timeline",
      icon: CalendarDaysIcon,
    },
    {
      href: `${base}/calendar`,
      label: "Calendar",
      icon: CalendarDaysIcon,
    },
    {
      href: `${base}/dashboards`,
      label: "Dashboards",
      icon: ChartBarIcon,
    },
    {
      href: `${base}/insights`,
      label: "Insights",
      icon: ChartBarIcon,
    },
    {
      href: `${base}/releases`,
      label: "Releases",
      icon: RocketLaunchIcon,
    },
    {
      href: `${base}/intake`,
      label: "Intake",
      icon: InboxIcon,
    },
    {
      href: `${base}/docs`,
      label: "Docs",
      icon: DocumentTextIcon,
    },
    ...(!isGuest
      ? ([
          {
            href: `${base}/customers`,
            label: "Customers",
            icon: UserGroupIcon,
          },
          {
            href: `${base}/settings`,
            label: "Settings",
            icon: Cog6ToothIcon,
          },
          {
            href: `${base}/settings/api`,
            label: "API",
            icon: Cog6ToothIcon,
          },
        ] satisfies NavItem[])
      : []),
  ];

  return (
    <aside className="flex h-full min-h-0 w-[var(--sidebar-w)] shrink-0 flex-col gap-1.5 overflow-hidden border-r border-separator bg-surface px-2 py-2">
      <div className="min-w-0 px-0.5">
        <TeamSwitcher teamSlug={teamSlug} teams={teams} />
      </div>

      <div className="flex items-center gap-1 px-0.5">
        <Button
          className="h-7 min-w-0 flex-1 justify-start px-2 text-[12px] text-muted"
          size="sm"
          variant="secondary"
          onPress={() => shell.openCommand()}
        >
          <MagnifyingGlassIcon className="mr-1.5 size-3.5 shrink-0" />
          <span className="truncate">Search</span>
          <kbd className="ml-auto hidden rounded border border-separator px-1 font-sans text-[10px] text-muted sm:inline">
            ⌘K
          </kbd>
        </Button>
        {!isGuest ? (
          <Button
            isIconOnly
            aria-label="New issue"
            className="size-7 shrink-0"
            size="sm"
            variant="primary"
            onPress={() => shell.openCreate()}
          >
            <PlusIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
      <nav className="flex flex-col gap-0.5">
        {topLinks.map((item) => (
          <NavLink key={item.label + item.href} item={item} />
        ))}
      </nav>

      {useFavorites ? (
        <FavoritesSection favorites={favorites} teamSlug={teamSlug} />
      ) : null}

      {!useFavorites && views.length ? (
        <Section
          open={favOpen}
          title="Favorites"
          onToggle={() => setFavOpen((v) => !v)}
        >
          {views.map((v) => (
            <NextLink
              key={v.id}
              className="flex items-center gap-2 rounded-md px-2 py-1 pl-7 text-[13px] text-muted hover:bg-default hover:text-foreground"
              href={`${base}/issues?view=${v.id}`}
            >
              {v.name}
            </NextLink>
          ))}
        </Section>
      ) : null}

      <Section
        open={teamOpen}
        title={teamName ?? "Team"}
        onToggle={() => setTeamOpen((v) => !v)}
      >
        {teamLinks.map((item) => (
          <NavLink
            key={item.label + item.href}
            indent
            item={item}
            nested={item.label === "Current" || item.label === "Upcoming"}
          />
        ))}
      </Section>

      <Section
        open={moreOpen}
        title="More"
        onToggle={() => setMoreManualOpen((v) => !v)}
      >
        {moreLinks.map((item) => (
          <NavLink key={item.label + item.href} indent item={item} />
        ))}
      </Section>

      <InstallPrompt />
      </div>
      <div className="flex flex-col gap-0.5 px-1 pb-1 text-[11px] text-muted">
        <span className="px-1">⌘K · C · ?</span>
        {workspaceSlug ? (
          <NextLink
            prefetch
            className="rounded-md px-2 py-1 hover:bg-default hover:text-foreground"
            href={`/w/${workspaceSlug}`}
          >
            Workspace
          </NextLink>
        ) : null}
        <button
          className="rounded-md px-2 py-1 text-left hover:bg-default hover:text-foreground"
          type="button"
          onClick={() => router.push("/onboarding")}
        >
          New team
        </button>
        <form action={logoutAction}>
          <button
            className="w-full rounded-md px-2 py-1 text-left hover:bg-default hover:text-foreground"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

"use client";

import type { MessageKey } from "@/lib/i18n";

import clsx from "clsx";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/components/locale-provider";

type SettingsLink = {
  key: string;
  path: string;
  label: MessageKey;
  adminOnly?: boolean;
};

const LINKS: SettingsLink[] = [
  { key: "general", path: "", label: "settings.general" },
  { key: "appearance", path: "/appearance", label: "settings.appearance" },
  {
    key: "notifications",
    path: "/notifications",
    label: "settings.notifications",
  },
  { key: "members", path: "/members", label: "settings.members" },
  { key: "labels", path: "/labels", label: "settings.labels" },
  { key: "templates", path: "/templates", label: "settings.templates" },
  { key: "views", path: "/views", label: "settings.views" },
  {
    key: "workflow",
    path: "/workflow",
    label: "settings.workflow",
    adminOnly: true,
  },
  {
    key: "automations",
    path: "/automations",
    label: "settings.automations",
    adminOnly: true,
  },
  { key: "import", path: "/import", label: "settings.importLinear" },
  { key: "import-csv", path: "/import/csv", label: "settings.importCsv" },
  { key: "export", path: "/export", label: "settings.export" },
  { key: "api-keys", path: "/api-keys", label: "settings.apiKeys" },
  {
    key: "webhooks",
    path: "/webhooks",
    label: "settings.webhooks",
    adminOnly: true,
  },
  { key: "oauth", path: "/oauth", label: "settings.oauth", adminOnly: true },
  { key: "ask", path: "/ask", label: "settings.ask", adminOnly: true },
  { key: "agents", path: "/agents", label: "settings.agents", adminOnly: true },
  { key: "audit", path: "/audit", label: "settings.audit", adminOnly: true },
];

export function SettingsNav({
  teamSlug,
  canAdmin = false,
}: {
  teamSlug: string;
  canAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useT();
  const base = `/t/${teamSlug}/settings`;
  const links = LINKS.filter((link) => !link.adminOnly || canAdmin);

  return (
    <nav
      aria-label="Settings sections"
      className="z-10 flex flex-wrap gap-0.5 border-b border-separator bg-background px-4 py-1.5"
    >
      {links.map((link) => {
        const href = `${base}${link.path}`;
        const active =
          link.path === ""
            ? pathname === base || pathname === `${base}/`
            : pathname.startsWith(`${base}${link.path}`);

        return (
          <NextLink
            key={link.key}
            className={clsx(
              "rounded px-2 py-1 text-[12px] transition-colors",
              active
                ? "bg-accent/15 font-medium text-accent"
                : "text-muted hover:bg-default hover:text-foreground",
            )}
            href={href}
          >
            {t(link.label)}
          </NextLink>
        );
      })}
    </nav>
  );
}

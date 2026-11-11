"use client";

import clsx from "clsx";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

type SettingsLink = {
  key: string;
  path: string;
  label: string;
  adminOnly?: boolean;
};

const LINKS: SettingsLink[] = [
  { key: "general", path: "", label: "General" },
  { key: "members", path: "/members", label: "Members" },
  { key: "labels", path: "/labels", label: "Labels" },
  { key: "templates", path: "/templates", label: "Templates" },
  { key: "views", path: "/views", label: "Views" },
  { key: "workflow", path: "/workflow", label: "Workflow", adminOnly: true },
  { key: "import", path: "/import", label: "Import" },
  { key: "api-keys", path: "/api-keys", label: "API keys" },
  { key: "webhooks", path: "/webhooks", label: "Webhooks", adminOnly: true },
];

export function SettingsNav({
  teamSlug,
  canAdmin = false,
}: {
  teamSlug: string;
  canAdmin?: boolean;
}) {
  const pathname = usePathname();
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
            {link.label}
          </NextLink>
        );
      })}
    </nav>
  );
}

"use client";

import clsx from "clsx";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

type SettingsLink = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const LINKS: SettingsLink[] = [
  { href: "", label: "General" },
  { href: "/members", label: "Members" },
  { href: "/labels", label: "Labels" },
  { href: "/templates", label: "Templates" },
  { href: "/views", label: "Views" },
  { href: "/workflow", label: "Workflow" },
  { href: "/import", label: "Import" },
  { href: "/api-keys", label: "API keys" },
  { href: "/webhooks", label: "Webhooks", adminOnly: true },
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

  return (
    <nav className="flex flex-wrap gap-3 text-sm">
      {LINKS.filter((link) => !link.adminOnly || canAdmin).map((link) => {
        const href = `${base}${link.href}`;
        const active =
          link.href === ""
            ? pathname === base || pathname === `${base}/`
            : pathname.startsWith(href);

        return (
          <NextLink
            key={href}
            className={clsx(
              active ? "text-accent" : "text-muted hover:text-foreground",
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

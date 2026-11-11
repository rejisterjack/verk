"use client";

import { Tabs } from "@heroui/react";
import { usePathname, useRouter } from "next/navigation";

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
  { key: "workflow", path: "/workflow", label: "Workflow" },
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
  const router = useRouter();
  const base = `/t/${teamSlug}/settings`;
  const links = LINKS.filter((link) => !link.adminOnly || canAdmin);

  const selected =
    links.find((link) =>
      link.path === ""
        ? pathname === base || pathname === `${base}/`
        : pathname.startsWith(`${base}${link.path}`),
    )?.key ?? "general";

  return (
    <Tabs
      selectedKey={selected}
      onSelectionChange={(key) => {
        const link = links.find((item) => item.key === String(key));

        if (link) router.push(`${base}${link.path}`);
      }}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label="Settings sections">
          {links.map((link) => (
            <Tabs.Tab key={link.key} id={link.key}>
              {link.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}

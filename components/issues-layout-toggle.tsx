"use client";

import clsx from "clsx";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";

function hrefWith(
  teamSlug: string,
  current: URLSearchParams,
  patch: Record<string, string | null>,
) {
  const next = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") next.delete(key);
    else next.set(key, value);
  }

  const query = next.toString();

  return `/t/${teamSlug}/issues${query ? `?${query}` : ""}`;
}

export function IssuesLayoutToggle({
  teamSlug,
  mine,
  layout,
  group,
}: {
  teamSlug: string;
  mine: boolean;
  layout: "list" | "board";
  group?: string;
}) {
  const searchParams = useSearchParams();

  const listHref = hrefWith(teamSlug, searchParams, {
    layout: null,
    group: null,
    ...(mine ? { assignee: "me" } : {}),
  });
  const boardHref = hrefWith(teamSlug, searchParams, {
    layout: "board",
    group: null,
    ...(mine ? { assignee: "me" } : {}),
  });
  const priorityHref = hrefWith(teamSlug, searchParams, {
    layout: "board",
    group: "priority",
    ...(mine ? { assignee: "me" } : {}),
  });
  const projectHref = hrefWith(teamSlug, searchParams, {
    layout: "board",
    group: "project",
    ...(mine ? { assignee: "me" } : {}),
  });

  const items = [
    { href: listHref, label: "List", active: layout === "list" },
    {
      href: boardHref,
      label: "Board",
      active: layout === "board" && !group,
    },
    {
      href: priorityHref,
      label: "Priority",
      active: group === "priority",
    },
    {
      href: projectHref,
      label: "Project",
      active: group === "project",
    },
  ] as const;

  return (
    <div className="inline-flex h-7 items-center rounded-md border border-separator p-0.5">
      {items.map((item) => (
        <NextLink
          key={item.label}
          prefetch
          className={clsx(
            "rounded px-2 py-0.5 text-[12px] transition-colors",
            item.active
              ? "bg-accent/15 font-medium text-accent"
              : "text-muted hover:text-foreground",
          )}
          href={item.href}
        >
          {item.label}
        </NextLink>
      ))}
    </div>
  );
}

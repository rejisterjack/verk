"use client";

import NextLink from "next/link";
import { useEffect, useState } from "react";

import { issueKey } from "@/lib/utils";

type Similar = { id: string; number: number; title: string; status: string };

/**
 * Shows existing issues that look like `title` while someone types a new one, so they can
 * open the existing issue instead of filing a duplicate. Stays silent when offline or empty.
 */
export function SimilarIssuesHint({
  teamId,
  teamSlug,
  title,
  excludeId,
}: {
  teamId: string;
  teamSlug: string;
  title: string;
  excludeId?: string;
}) {
  const [items, setItems] = useState<Similar[]>([]);

  useEffect(() => {
    const clean = title.trim();

    if (clean.length < 4) {
      setItems([]);

      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ title: clean });

      if (excludeId) params.set("exclude", excludeId);
      fetch(`/api/teams/${teamId}/issues/similar?${params}`, {
        credentials: "same-origin",
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : { similar: [] }))
        .then((data) => setItems((data.similar ?? []) as Similar[]))
        .catch(() => setItems([]));
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [teamId, title, excludeId]);

  if (!items.length) return null;

  return (
    <div
      aria-live="polite"
      className="rounded-md border border-separator bg-default/40 px-3 py-2 text-[12px]"
    >
      <p className="font-medium text-foreground">Similar issues</p>
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={item.id} className="truncate">
            <NextLink
              className="text-accent hover:underline"
              href={`/t/${teamSlug}/issues/${item.number}`}
              rel="noreferrer"
              target="_blank"
            >
              {issueKey(teamSlug, item.number)}
            </NextLink>{" "}
            <span className="text-muted">{item.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

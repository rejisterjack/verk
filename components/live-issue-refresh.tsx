"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const MIN_GAP_MS = 1500;

/**
 * Refreshes the page when the team's data changes. Bursts are coalesced (at most one refresh
 * per 1.5 seconds), nothing happens while the tab is hidden (it catches up when you return), and
 * the stream is only open while the page is visible.
 */
export function LiveIssueRefresh({ teamId }: { teamId: string }) {
  const router = useRouter();
  const lastRun = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stale = useRef(false);

  useEffect(() => {
    let source: EventSource | null = null;

    function refresh() {
      lastRun.current = Date.now();
      stale.current = false;
      router.refresh();
    }

    function schedule() {
      if (document.visibilityState !== "visible") {
        stale.current = true; // refresh once when the tab comes back

        return;
      }
      if (pending.current) return;
      const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastRun.current));

      pending.current = setTimeout(() => {
        pending.current = null;
        refresh();
      }, wait);
    }

    function open() {
      if (source) return;
      source = new EventSource(`/api/teams/${teamId}/events`);
      source.onmessage = schedule;
    }

    function close() {
      source?.close();
      source = null;
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        open();
        if (stale.current) schedule();
      } else {
        close();
      }
    }

    if (document.visibilityState === "visible") open();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (pending.current) clearTimeout(pending.current);
      pending.current = null;
      close();
    };
  }, [router, teamId]);

  return null;
}

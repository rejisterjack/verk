"use client";

import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  WifiIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

import { getSyncState, subscribeSyncState } from "@/lib/offline/sync-engine";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(0);
  const [failed, setFailed] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);

    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    const unsub = subscribeSyncState((state) => {
      setSyncing(state.queued + state.inflight);
      setFailed(state.failed);
      setSessionExpired(state.sessionExpired);
    });

    const initial = getSyncState();

    setSyncing(initial.queued + initial.inflight);
    setFailed(initial.failed);
    setSessionExpired(initial.sessionExpired);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      unsub();
    };
  }, []);

  if (sessionExpired) {
    return (
      <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-900 dark:text-amber-100">
        <ExclamationTriangleIcon className="size-4 shrink-0" />
        Session expired — sign in to sync your offline changes.
      </div>
    );
  }

  if (!online) {
    return (
      <div className="flex items-center gap-2 border-b border-separator bg-surface px-4 py-2 text-xs text-muted">
        <WifiIcon className="size-4 shrink-0 opacity-60" />
        Offline — edits queue until you reconnect.
        {syncing > 0 ? ` ${syncing} pending.` : null}
      </div>
    );
  }

  if (failed > 0) {
    return (
      <div className="flex items-center gap-2 border-b border-danger/30 bg-danger/10 px-4 py-2 text-xs">
        <ExclamationTriangleIcon className="size-4 shrink-0" />
        Sync failed for {failed} change{failed === 1 ? "" : "s"}. Retry from the
        conflict panel or reload.
      </div>
    );
  }

  if (syncing > 0) {
    return (
      <div className="flex items-center gap-2 border-b border-accent/20 bg-accent/5 px-4 py-2 text-xs text-muted">
        <ArrowPathIcon className="size-4 shrink-0 animate-spin" />
        Syncing {syncing} change{syncing === 1 ? "" : "s"}…
      </div>
    );
  }

  return null;
}

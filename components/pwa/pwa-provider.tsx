"use client";

import { useEffect } from "react";

import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { isOfflineEnabled } from "@/lib/offline/feature";
import { startSyncEngine, flushOutbox } from "@/lib/offline/sync-engine";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isOfflineEnabled()) return;

    startSyncEngine();

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "verk-sync-outbox") {
        void flushOutbox();
      }
    };

    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <>
      <OfflineBanner />
      {children}
      <InstallPrompt />
    </>
  );
}

"use client";

import { Button } from "@heroui/react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "verk-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    Boolean(window.navigator.standalone)
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIosTip, setShowIosTip] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (isStandalone()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBip);

    if (isIos()) {
      setShowIosTip(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setDeferred(null);
    setShowIosTip(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-separator bg-background p-4 shadow-lg sm:left-auto">
      <p className="text-sm font-medium">Install Verk</p>
      <p className="mt-1 text-xs text-muted">
        {showIosTip && !deferred
          ? "On iOS: Share → Add to Home Screen for the full-screen app experience."
          : "Add Verk to your home screen for faster access and offline boards."}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onPress={dismiss}>
          Not now
        </Button>
        {deferred ? (
          <Button size="sm" onPress={install}>
            Install
          </Button>
        ) : null}
      </div>
    </div>
  );
}

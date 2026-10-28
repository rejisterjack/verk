"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!event) return null;

  return (
    <button
      className="mx-3 mb-3 rounded-lg border border-separator px-2 py-1.5 text-left text-xs text-muted hover:text-foreground"
      type="button"
      onClick={() => {
        void event.prompt();
        setEvent(null);
      }}
    >
      Install Verk
    </button>
  );
}

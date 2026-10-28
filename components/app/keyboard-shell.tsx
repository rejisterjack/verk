"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { CommandPalette } from "@/components/app/command-palette";
import { ShortcutHelp } from "@/components/app/shortcut-help";
import { isTypingTarget } from "@/lib/shortcuts/registry";

type ShellCtx = {
  openCreate: () => void;
  openCommand: () => void;
};

const Ctx = createContext<ShellCtx>({
  openCreate: () => undefined,
  openCommand: () => undefined,
});

export function useKeyboardShell() {
  return useContext(Ctx);
}

export function KeyboardShell({
  teamSlug,
  teamId,
  children,
  onRequestCreate,
}: {
  teamSlug: string;
  teamId: string;
  children: React.ReactNode;
  onRequestCreate?: () => void;
}) {
  const router = useRouter();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [goArmed, setGoArmed] = useState(false);
  const base = `/t/${teamSlug}`;

  const openCreate = useCallback(() => {
    onRequestCreate?.();
    window.dispatchEvent(new CustomEvent("verk:create-issue"));
  }, [onRequestCreate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target) && !(e.metaKey || e.ctrlKey)) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);

        return;
      }

      if (e.key === "Escape") {
        setCmdOpen(false);
        setHelpOpen(false);
        setGoArmed(false);

        return;
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setHelpOpen(true);

        return;
      }

      if (goArmed) {
        e.preventDefault();
        const map: Record<string, string> = {
          i: `${base}/inbox`,
          e: `${base}/issues`,
          b: `${base}/issues?layout=board`,
          c: `${base}/cycles`,
          p: `${base}/projects`,
          m: `${base}/issues?assignee=me`,
          t: `${base}/triage`,
        };
        const path = map[e.key.toLowerCase()];

        setGoArmed(false);
        if (path) router.push(path);

        return;
      }

      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey) {
        setGoArmed(true);
        window.setTimeout(() => setGoArmed(false), 1500);

        return;
      }

      if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openCreate();
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [base, openCreate, router]);

  return (
    <Ctx.Provider value={{ openCreate, openCommand: () => setCmdOpen(true) }}>
      {children}
      <CommandPalette
        open={cmdOpen}
        teamId={teamId}
        teamSlug={teamSlug}
        onCreateIssue={openCreate}
        onOpenChange={setCmdOpen}
      />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Ctx.Provider>
  );
}

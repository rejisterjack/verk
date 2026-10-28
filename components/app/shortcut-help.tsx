"use client";

import { SHORTCUTS } from "@/lib/shortcuts/registry";

export function ShortcutHelp({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const groups = ["global", "navigation", "issue"] as const;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <button
        aria-label="Close"
        className="absolute inset-0"
        type="button"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-separator bg-background p-5 shadow-xl">
        <h2 className="font-display text-lg font-semibold">
          Keyboard shortcuts
        </h2>
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <div key={group}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {group}
              </p>
              <ul className="mt-2 space-y-1.5">
                {SHORTCUTS.filter((s) => s.group === group).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{s.description}</span>
                    <kbd className="rounded border border-separator bg-surface px-1.5 py-0.5 font-mono text-xs">
                      {s.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

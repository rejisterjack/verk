"use client";

import { useEffect, useState } from "react";

import {
  groupReactions,
  isValidEmoji,
  PICKER_EMOJIS,
  QUICK_REACTIONS,
  type ReactionRow,
} from "@/lib/reactions";

/**
 * The reactions on one comment: a pill per emoji already used (click to add or remove yours),
 * and a "+" button that opens a picker with common emoji and a field for any other emoji.
 */
export function ReactionBar({
  reactions,
  currentUserId,
  onToggle,
  disabled = false,
}: {
  reactions: ReactionRow[];
  currentUserId?: string;
  onToggle: (emoji: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const groups = groupReactions(reactions, currentUserId);
  const customValid = isValidEmoji(custom.trim());

  // Escape closes the picker from anywhere on the page.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function pick(emoji: string) {
    onToggle(emoji);
    setOpen(false);
    setCustom("");
  }

  // With no reactions yet, offer the five common ones inline so reacting is one click.
  const quick = groups.length
    ? []
    : QUICK_REACTIONS.map((emoji) => ({ emoji, count: 0, mine: false }));

  return (
    <div className="relative mt-2 flex flex-wrap items-center gap-1">
      {[...groups, ...quick].map(({ emoji, count, mine }) => (
        <button
          key={emoji}
          aria-label={`${emoji}${count ? ` ${count}` : ""}${mine ? ", you reacted" : ""}`}
          aria-pressed={mine}
          className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
            mine
              ? "border-accent bg-accent/10"
              : "border-separator hover:bg-default"
          }`}
          disabled={disabled}
          type="button"
          onClick={() => onToggle(emoji)}
        >
          {emoji}
          {count > 0 ? <span className="ml-1 text-muted">{count}</span> : null}
        </button>
      ))}
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Add reaction"
        className="rounded-full border border-dashed border-separator px-2 py-0.5 text-xs text-muted hover:text-foreground"
        disabled={disabled}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        +
      </button>
      {open ? (
        <div
          aria-label="Pick an emoji"
          className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-separator bg-surface p-2 shadow-lg"
          role="dialog"
        >
          <div className="grid grid-cols-8 gap-1">
            {PICKER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                aria-label={emoji}
                className="rounded p-1 text-base hover:bg-default"
                type="button"
                onClick={() => pick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          <form
            className="mt-2 flex gap-1 border-t border-separator pt-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (customValid) pick(custom.trim());
            }}
          >
            <input
              aria-label="Any emoji"
              className="min-w-0 flex-1 rounded border border-separator bg-transparent px-2 py-1 text-sm"
              maxLength={16}
              placeholder="Paste any emoji"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
            />
            <button
              className="rounded border border-separator px-2 text-xs disabled:opacity-40"
              disabled={!customValid}
              type="submit"
            >
              Add
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

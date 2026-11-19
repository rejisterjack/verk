"use client";

import { Command } from "cmdk";

export type QuickPickerOption = {
  value: string;
  label: string;
  hint?: string;
};

/**
 * A small type-to-filter list opened by a single key (S, P, A, ...). Arrow keys move, Enter picks,
 * Esc closes. Pure presentation: the caller decides what picking does.
 */
export function QuickPicker({
  title,
  options,
  onPick,
  onClose,
}: {
  title: string;
  options: QuickPickerOption[];
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[85] flex items-start justify-center bg-black/30 px-4 pt-[18vh]">
      <button
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        type="button"
        onClick={onClose}
      />
      <Command
        className="relative z-10 w-full max-w-xs overflow-hidden rounded-xl border border-separator bg-background shadow-2xl"
        label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <Command.Input
          ref={(el) => {
            el?.focus();
          }}
          className="w-full border-b border-separator bg-transparent px-3 py-2.5 text-sm outline-none"
          placeholder={title}
        />
        <Command.List className="max-h-64 overflow-auto p-1.5 text-sm">
          <Command.Empty className="px-3 py-4 text-center text-muted">
            No matches
          </Command.Empty>
          {options.map((option) => (
            <Command.Item
              key={option.value}
              className="flex cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-[13px] aria-selected:bg-accent/15"
              value={`${option.label} ${option.hint ?? ""}`}
              onSelect={() => onPick(option.value)}
            >
              <span className="truncate">{option.label}</span>
              {option.hint ? (
                <span className="ml-2 shrink-0 text-[11px] text-muted">
                  {option.hint}
                </span>
              ) : null}
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}

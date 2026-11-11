"use client";

import type { ChangeEvent } from "react";

import { groupLabels } from "@/lib/labels";

type LabelOpt = {
  id: string;
  name: string;
  color: string;
  group?: string | null;
};

export function LabelChecklist({
  labels,
  name,
  selected,
  onToggle,
}: {
  labels: LabelOpt[];
  name?: string;
  selected?: ReadonlySet<string>;
  onToggle?: (id: string, checked: boolean) => void;
}) {
  const groups = groupLabels(labels);

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.name || "all"}>
          {group.name ? (
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
              {group.name}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {group.labels.map((label) => (
              <label
                key={label.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-separator px-2 py-1"
              >
                <input
                  name={name}
                  type="checkbox"
                  value={label.id}
                  {...(onToggle
                    ? {
                        checked: selected?.has(label.id) ?? false,
                        onChange: (event: ChangeEvent<HTMLInputElement>) =>
                          onToggle(label.id, event.target.checked),
                      }
                    : {})}
                />
                <span
                  className="size-2 rounded-full"
                  style={{ background: label.color }}
                />
                {label.name}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

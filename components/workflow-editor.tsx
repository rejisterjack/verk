"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  addStatusAction,
  deleteStatusAction,
  reorderStatusesAction,
  updateStatusAction,
} from "@/lib/actions/workflow";
import { TYPE_LABELS, WORKFLOW_TYPES } from "@/lib/workflow";

type Row = {
  id: string;
  name: string;
  key: string;
  type: (typeof WORKFLOW_TYPES)[number];
  color: string;
  count: number;
};

const inputClass =
  "h-8 rounded-md border border-separator bg-surface px-2 text-sm text-foreground";

/** Move `id` one step within the list (swap with its neighbour), keeping types grouped. */
function moved(rows: Row[], id: string, dir: -1 | 1): string[] | null {
  const from = rows.findIndex((row) => row.id === id);
  const to = from + dir;

  if (from < 0 || to < 0 || to >= rows.length) return null;
  // Grouped by type: a status can only swap with a neighbour of the same type.
  if (rows[to]!.type !== rows[from]!.type) return null;
  const next = rows.map((row) => row.id);

  [next[from], next[to]] = [next[to]!, next[from]!];

  return next;
}

export function WorkflowEditor({
  teamSlug,
  statuses,
}: {
  teamSlug: string;
  statuses: Row[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<Row["type"]>("started");
  const [color, setColor] = useState("#6366f1");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState<string>("");

  function act(work: () => Promise<{ ok: true } | { error: string }>) {
    setError(null);
    start(async () => {
      const result = await work();

      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  const sameTypeTargets = (row: Row) =>
    statuses.filter((s) => s.type === row.type && s.id !== row.id);

  return (
    <div className="space-y-6">
      {error ? (
        <p
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          act(async () => {
            const result = await addStatusAction(teamSlug, {
              name,
              type,
              color,
            });

            if ("ok" in result) setName("");

            return result;
          });
        }}
      >
        <label className="flex flex-col gap-1 text-xs text-muted">
          Name
          <input
            className={`${inputClass} w-44`}
            maxLength={40}
            placeholder="In review"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Type
          <select
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as Row["type"])}
          >
            {WORKFLOW_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Color
          <input
            aria-label="Color"
            className="h-8 w-10 cursor-pointer rounded-md border border-separator bg-surface p-0.5"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <button
          className="h-8 rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-50"
          disabled={pending || !name.trim()}
          type="submit"
        >
          Add status
        </button>
      </form>

      <ul className="space-y-2">
        {statuses.map((row, index) => {
          const up = moved(statuses, row.id, -1);
          const down = moved(statuses, row.id, 1);
          const isDeleting = deleting === row.id;
          const targets = sameTypeTargets(row);

          return (
            <li
              key={row.id}
              className="rounded-xl border border-separator p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label={`Color of ${row.name}`}
                  className="h-7 w-8 cursor-pointer rounded border border-separator bg-surface p-0.5"
                  defaultValue={row.color}
                  type="color"
                  onBlur={(e) => {
                    if (e.target.value !== row.color) {
                      act(() =>
                        updateStatusAction(teamSlug, row.id, {
                          color: e.target.value,
                        }),
                      );
                    }
                  }}
                />
                <input
                  aria-label={`Name of ${row.name}`}
                  className={`${inputClass} min-w-0 flex-1`}
                  defaultValue={row.name}
                  maxLength={40}
                  onBlur={(e) => {
                    const next = e.target.value.trim();

                    if (next && next !== row.name) {
                      act(() =>
                        updateStatusAction(teamSlug, row.id, { name: next }),
                      );
                    } else {
                      e.target.value = row.name;
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
                <span className="rounded bg-default px-1.5 py-0.5 text-[11px] text-muted">
                  {TYPE_LABELS[row.type]}
                </span>
                <span className="w-16 text-right text-[11px] text-muted">
                  {row.count} issue{row.count === 1 ? "" : "s"}
                </span>
                <button
                  aria-label={`Move ${row.name} up`}
                  className="rounded px-1.5 py-1 text-muted hover:bg-default disabled:opacity-30"
                  disabled={pending || !up}
                  type="button"
                  onClick={() =>
                    up && act(() => reorderStatusesAction(teamSlug, up))
                  }
                >
                  ↑
                </button>
                <button
                  aria-label={`Move ${row.name} down`}
                  className="rounded px-1.5 py-1 text-muted hover:bg-default disabled:opacity-30"
                  disabled={pending || !down}
                  type="button"
                  onClick={() =>
                    down && act(() => reorderStatusesAction(teamSlug, down))
                  }
                >
                  ↓
                </button>
                <button
                  className="rounded px-2 py-1 text-danger hover:bg-danger/10 disabled:opacity-30"
                  disabled={pending || targets.length === 0}
                  title={
                    targets.length === 0
                      ? `Keep at least one ${TYPE_LABELS[row.type].toLowerCase()} status`
                      : "Delete"
                  }
                  type="button"
                  onClick={() => {
                    setDeleting(isDeleting ? null : row.id);
                    setMoveTo(targets[0]?.id ?? "");
                  }}
                >
                  Delete
                </button>
              </div>
              {isDeleting ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-separator pt-3">
                  <span className="text-muted">
                    {row.count > 0
                      ? `Move its ${row.count} issue${row.count === 1 ? "" : "s"} to`
                      : "Delete it. Any issues would move to"}
                  </span>
                  <select
                    aria-label="Move issues to"
                    className={inputClass}
                    value={moveTo}
                    onChange={(e) => setMoveTo(e.target.value)}
                  >
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="h-8 rounded-md bg-danger px-3 text-sm font-medium text-white disabled:opacity-50"
                    disabled={pending || !moveTo}
                    type="button"
                    onClick={() =>
                      act(async () => {
                        const result = await deleteStatusAction(
                          teamSlug,
                          row.id,
                          moveTo,
                        );

                        setDeleting(null);

                        return result;
                      })
                    }
                  >
                    Delete status
                  </button>
                  <button
                    className="text-muted hover:text-foreground"
                    type="button"
                    onClick={() => setDeleting(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
              <p className="sr-only">
                Position {index + 1} of {statuses.length}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

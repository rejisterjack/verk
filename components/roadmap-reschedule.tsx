"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  setProjectDatesAction,
  shiftProjectAction,
} from "@/lib/actions/roadmap";

const buttonClass =
  "rounded border border-separator px-1.5 py-0.5 text-[11px] text-muted hover:bg-default hover:text-foreground disabled:opacity-50";
const dateClass =
  "h-6 rounded border border-separator bg-surface px-1 text-[11px] text-foreground";

/** Move a project on the roadmap: nudge both dates by a week, or edit them. Hidden for guests. */
export function RoadmapReschedule({
  teamSlug,
  projectId,
  start,
  target,
}: {
  teamSlug: string;
  projectId: string;
  /** `YYYY-MM-DD` or empty. */
  start: string;
  target: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(target);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string; ok?: true }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();

      if (result.error) setError(result.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {editing ? (
        <>
          <input
            aria-label="Start date"
            className={dateClass}
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <input
            aria-label="Target date"
            className={dateClass}
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <button
            className={buttonClass}
            disabled={pending}
            type="button"
            onClick={() =>
              run(() => setProjectDatesAction(teamSlug, projectId, from, to))
            }
          >
            Save
          </button>
          <button
            className={buttonClass}
            type="button"
            onClick={() => {
              setEditing(false);
              setFrom(start);
              setTo(target);
              setError(null);
            }}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            aria-label="Move a week earlier"
            className={buttonClass}
            disabled={pending}
            type="button"
            onClick={() =>
              run(() => shiftProjectAction(teamSlug, projectId, -7))
            }
          >
            −1w
          </button>
          <button
            aria-label="Move a week later"
            className={buttonClass}
            disabled={pending}
            type="button"
            onClick={() =>
              run(() => shiftProjectAction(teamSlug, projectId, 7))
            }
          >
            +1w
          </button>
          <button
            className={buttonClass}
            type="button"
            onClick={() => setEditing(true)}
          >
            Edit dates
          </button>
        </>
      )}
      {error ? (
        <span className="text-[11px] text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}

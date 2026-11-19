"use client";

import { Button, Input, Label, TextField } from "@heroui/react";
import { useCallback, useEffect, useState } from "react";

import { StatusChip } from "@/components/status-chip";
import { issueKey } from "@/lib/utils";

type SubIssue = {
  id: string;
  number: number;
  title: string;
  status: string;
  assignee?: { name: string | null; email: string } | null;
};
type Payload = {
  parent: { id: string; number: number; title: string; status: string } | null;
  children: SubIssue[];
  progress: { total: number; done: number; percent: number };
};

/** Parent link, sub-issue list with progress, and a quick "add sub-issue" field. */
export function IssueSubIssues({
  teamId,
  teamSlug,
  issueId,
  readOnly = false,
}: {
  teamId: string;
  teamSlug: string;
  issueId: string;
  readOnly?: boolean;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const base = `/api/teams/${teamId}/issues/${issueId}/sub-issues`;

  const load = useCallback(async () => {
    const res = await fetch(base, { credentials: "same-origin" });

    if (res.ok) setData((await res.json()) as Payload);
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    const clean = title.trim();

    if (!clean || pending) return;
    setPending(true);
    setError(null);
    const res = await fetch(base, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: clean, status: "TODO" }),
    });

    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));

      setError(body.error ?? "Could not create sub-issue");

      return;
    }
    setTitle("");
    await load();
  }

  async function detach() {
    setError(null);
    const res = await fetch(base, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: null }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));

      setError(body.error ?? "Could not remove the parent");

      return;
    }
    await load();
  }

  if (!data) return null;
  const { parent, children, progress } = data;

  return (
    <section className="mt-10 space-y-3 border-t border-separator pt-6">
      {parent ? (
        <p className="text-sm text-muted">
          Sub-issue of{" "}
          <a
            className="text-accent hover:underline"
            href={`/t/${teamSlug}/issues/${parent.number}`}
          >
            {issueKey(teamSlug, parent.number)} {parent.title}
          </a>
          {readOnly ? null : (
            <button
              className="ml-2 text-[12px] text-muted hover:text-foreground"
              type="button"
              onClick={() => void detach()}
            >
              Remove parent
            </button>
          )}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold">Sub-issues</h2>
        {progress.total > 0 ? (
          <>
            <div
              aria-label={`${progress.done} of ${progress.total} done`}
              aria-valuemax={progress.total}
              aria-valuemin={0}
              aria-valuenow={progress.done}
              className="h-1.5 w-28 overflow-hidden rounded-full bg-default"
              role="progressbar"
            >
              <div
                className="h-full bg-accent"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span className="text-[12px] text-muted">
              {progress.done}/{progress.total} done
            </span>
          </>
        ) : null}
      </div>

      <ul className="divide-y divide-separator rounded-lg border border-separator text-sm">
        {children.map((child) => (
          <li key={child.id} className="flex items-center gap-3 px-3 py-2">
            <span className="w-14 shrink-0 font-mono text-[11px] text-muted">
              {issueKey(teamSlug, child.number)}
            </span>
            <a
              className="min-w-0 flex-1 truncate hover:text-accent"
              href={`/t/${teamSlug}/issues/${child.number}`}
            >
              {child.title}
            </a>
            <StatusChip quiet status={child.status as never} />
          </li>
        ))}
        {children.length === 0 ? (
          <li className="px-3 py-2 text-muted">No sub-issues yet.</li>
        ) : null}
      </ul>

      {readOnly ? null : (
        <div className="flex items-end gap-2">
          <TextField
            className="min-w-0 flex-1"
            name="subTitle"
            value={title}
            onChange={setTitle}
          >
            <Label>New sub-issue</Label>
            <Input placeholder="Title" />
          </TextField>
          <Button
            isDisabled={pending}
            size="sm"
            type="button"
            variant="tertiary"
            onPress={() => void add()}
          >
            Add
          </Button>
        </div>
      )}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </section>
  );
}

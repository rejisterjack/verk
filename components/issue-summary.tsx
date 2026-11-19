"use client";

import { useState } from "react";

/** A "Summarize" button for the issue page. The result is shown, never saved or applied. */
export function IssueSummary({
  teamId,
  issueId,
}: {
  teamId: string;
  issueId: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const [source, setSource] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/teams/${teamId}/issues/${issueId}/summary`,
        {
          credentials: "same-origin",
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error ?? "Could not summarize");
      setText(data.summary);
      setSource(data.source === "ai" ? "AI summary" : "Quick summary");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not summarize");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 text-sm">
      <button
        className="h-7 rounded-md border border-separator px-2 text-[12px] hover:bg-default disabled:opacity-50"
        disabled={pending}
        type="button"
        onClick={() => void run()}
      >
        {pending ? "Summarizing…" : "Summarize"}
      </button>
      {text ? (
        <div className="mt-2 rounded-lg border border-separator bg-surface/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
            {source}
          </p>
          <p className="mt-1">{text}</p>
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

"use client";

import type { DraftFields } from "@/lib/drafts";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteDraftAction, publishDraftAction } from "@/lib/actions/drafts";

type DraftRow = {
  id: string;
  title: string;
  fields: DraftFields;
  updatedAt: string;
};

const buttonClass =
  "h-7 rounded-md border border-separator px-2 text-[12px] hover:bg-default disabled:opacity-50";

export function DraftsList({
  teamSlug,
  drafts,
}: {
  teamSlug: string;
  drafts: DraftRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function publish(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await publishDraftAction(teamSlug, id);

      if ("error" in result) {
        setError(result.error ?? "Could not publish the draft");

        return;
      }
      router.push(`/t/${teamSlug}/issues/${result.number}`);
    });
  }

  function remove(id: string) {
    if (!window.confirm("Delete this draft?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteDraftAction(teamSlug, id);

      if ("error" in result) setError(result.error ?? "Could not delete");
      else router.refresh();
    });
  }

  if (!drafts.length) {
    return (
      <p className="px-4 py-8 text-[13px] text-muted">
        No drafts. Open New issue and choose Save draft to keep one for later.
      </p>
    );
  }

  return (
    <div>
      {error ? <p className="px-4 pt-3 text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-separator">
        {drafts.map((draft) => (
          <li
            key={draft.id}
            className="flex items-center gap-3 px-4 py-2.5 text-[13px]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{draft.title}</p>
              <p className="truncate text-[12px] text-muted">
                Saved {draft.updatedAt.slice(0, 16).replace("T", " ")}
                {draft.fields.description
                  ? ` · ${draft.fields.description.replace(/\s+/g, " ").slice(0, 80)}`
                  : ""}
              </p>
            </div>
            <button
              className={buttonClass}
              disabled={pending}
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("verk:resume-draft", {
                    detail: { id: draft.id, fields: draft.fields },
                  }),
                )
              }
            >
              Resume
            </button>
            <button
              className={buttonClass}
              disabled={pending}
              type="button"
              onClick={() => publish(draft.id)}
            >
              Create issue
            </button>
            <button
              className={`${buttonClass} text-danger`}
              disabled={pending}
              type="button"
              onClick={() => remove(draft.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

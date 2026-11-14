"use client";

import { useEffect, useState } from "react";

import { issueKey, slugify } from "@/lib/utils";

export function IssueBranch({
  githubRepo,
  teamSlug,
  number,
  title,
  teamId,
}: {
  githubRepo: string;
  teamSlug: string;
  number: number | null;
  title: string;
  teamId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [pulls, setPulls] = useState<
    { number: number; title: string; url: string; draft?: boolean }[]
  >([]);
  const slug = slugify(title).slice(0, 40);
  const name = slug
    ? `${issueKey(teamSlug, number).toLowerCase()}-${slug}`
    : issueKey(teamSlug, number).toLowerCase();

  useEffect(() => {
    if (!teamId) return;
    void fetch(
      `/api/teams/${teamId}/pulls?branch=${encodeURIComponent(name)}`,
      { credentials: "same-origin" },
    )
      .then((res) => (res.ok ? res.json() : { pulls: [] }))
      .then((data) => setPulls(data.pulls ?? []));
  }, [teamId, name]);

  return (
    <div className="rounded-lg border border-separator px-2 py-2">
      <p className="text-[11px] text-muted">Branch for {githubRepo}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <code className="truncate font-mono text-[12px]">{name}</code>
        <button
          className="shrink-0 text-[11px] text-accent"
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(name).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {pulls.length ? (
        <ul className="mt-2 space-y-1 text-[12px]">
          {pulls.map((pull) => (
            <li key={pull.number}>
              <a
                className="text-accent hover:underline"
                href={pull.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                #{pull.number} {pull.title}
              </a>
              {pull.draft ? (
                <span className="ml-1 text-muted">(draft)</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

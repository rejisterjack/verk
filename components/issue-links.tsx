"use client";

import { useEffect, useState } from "react";

type Link = { id: string; kind: string; url: string };

export function IssueLinks({
  teamId,
  issueId,
}: {
  teamId: string;
  issueId: string;
}) {
  const [links, setLinks] = useState<Link[]>([]);
  const [kind, setKind] = useState("figma");
  const [url, setUrl] = useState("");

  async function load() {
    const res = await fetch(`/api/teams/${teamId}/issues/${issueId}/links`, {
      credentials: "same-origin",
    });

    if (!res.ok) return;
    const data = await res.json();

    setLinks(data.links ?? []);
  }

  useEffect(() => {
    void load();
  }, [teamId, issueId]);

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold">Links</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {links.map((link) => (
          <li key={link.id} className="flex items-center gap-2">
            <span className="text-muted">{link.kind}</span>{" "}
            <a className="text-accent" href={link.url} rel="noreferrer" target="_blank">
              {link.url}
            </a>
            <button
              className="text-xs text-danger"
              type="button"
              onClick={() => {
                void fetch(`/api/teams/${teamId}/issues/${issueId}/links`, {
                  method: "DELETE",
                  credentials: "same-origin",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: link.id }),
                }).then(() => load());
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void fetch(`/api/teams/${teamId}/issues/${issueId}/links`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, url }),
          }).then(() => {
            setUrl("");
            void load();
          });
        }}
      >
        <select className="rounded-lg border border-separator px-2 py-1 text-sm" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="figma">Figma</option>
          <option value="sentry">Sentry</option>
          <option value="link">Link</option>
        </select>
        <input className="min-w-48 flex-1 rounded-lg border border-separator px-2 py-1 text-sm" placeholder="https://" value={url} onChange={(event) => setUrl(event.target.value)} />
        <button className="rounded-lg border border-separator px-2 py-1 text-sm" type="submit">Add</button>
      </form>
    </section>
  );
}

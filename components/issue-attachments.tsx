"use client";

import { Button } from "@heroui/react";
import { useEffect, useState } from "react";

type Attachment = {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
};

export function IssueAttachments({
  teamId,
  issueId,
}: {
  teamId: string;
  issueId: string;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(
      `/api/teams/${teamId}/issues/${issueId}/attachments`,
      { credentials: "same-origin" },
    );

    if (!res.ok) return;
    const data = await res.json();

    setItems(data.attachments ?? []);
  }

  useEffect(() => {
    void load();
  }, [teamId, issueId]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;
    setPending(true);
    setError(null);
    const body = new FormData();

    body.append("file", file);
    const res = await fetch(
      `/api/teams/${teamId}/issues/${issueId}/attachments`,
      { method: "POST", credentials: "same-origin", body },
    );

    setPending(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));

      setError(err.error ?? "Upload failed (is BLOB_READ_WRITE_TOKEN set?)");

      return;
    }
    e.target.value = "";
    await load();
  }

  return (
    <section className="mt-10 border-t border-separator pt-6">
      <h2 className="text-sm font-semibold">Attachments</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((a) => (
          <li key={a.id}>
            <a
              className="text-accent hover:underline"
              href={a.url}
              rel="noreferrer"
              target="_blank"
            >
              {a.name}
            </a>{" "}
            <span className="text-xs text-muted">
              ({Math.round(a.size / 1024)} KB)
            </span>
            <button
              className="ml-2 text-xs text-danger"
              type="button"
              onClick={() => {
                void fetch(
                  `/api/teams/${teamId}/issues/${issueId}/attachments`,
                  {
                    method: "DELETE",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ attachmentId: a.id }),
                  },
                ).then(async (res) => {
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));

                    setError(err.error ?? "Could not delete attachment");

                    return;
                  }
                  await load();
                });
              }}
            >
              Delete
            </button>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="text-muted">No attachments.</li>
        ) : null}
      </ul>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm">
        <Button isDisabled={pending} size="sm" variant="tertiary">
          {pending ? "Uploading…" : "Upload file"}
        </Button>
        <input className="hidden" type="file" onChange={onUpload} />
      </label>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </section>
  );
}

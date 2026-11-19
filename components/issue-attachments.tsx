"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  formatBytes,
  isImageType,
  MAX_ATTACHMENTS_PER_ISSUE,
} from "@/lib/attachment-files";

type Attachment = {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
};

const ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/markdown,application/zip";
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Attachments for an issue: pick several files at once or drag them onto the box, images show a
 * thumbnail, and each file reports its own success or error. The server still enforces the type,
 * size, count and content checks; the browser checks here only save a round trip.
 */
export function IssueAttachments({
  teamId,
  issueId,
  readOnly = false,
}: {
  teamId: string;
  issueId: string;
  /** Guests can see attachments but not add them. */
  readOnly?: boolean;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const base = `/api/teams/${teamId}/issues/${issueId}/attachments`;

  const load = useCallback(async () => {
    const res = await fetch(base, { credentials: "same-origin" });

    if (!res.ok) return;
    const data = await res.json();

    setItems(data.attachments ?? []);
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(files: File[]) {
    if (!files.length) return;
    const problems: string[] = [];
    const room = MAX_ATTACHMENTS_PER_ISSUE - items.length;
    const accepted = files.slice(0, Math.max(0, room));

    if (files.length > accepted.length) {
      problems.push(
        `Only ${MAX_ATTACHMENTS_PER_ISSUE} attachments fit on one issue; ${files.length - accepted.length} skipped.`,
      );
    }
    setErrors([]);
    setBusy((n) => n + accepted.length);

    // One at a time keeps the per-issue count check honest and the failures easy to attribute.
    for (const file of accepted) {
      if (file.size > MAX_BYTES) {
        problems.push(`${file.name}: larger than 10 MB`);
        setBusy((n) => n - 1);
        continue;
      }
      const body = new FormData();

      body.append("file", file);
      try {
        const res = await fetch(base, {
          method: "POST",
          credentials: "same-origin",
          body,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));

          problems.push(
            `${file.name}: ${typeof err.error === "string" ? err.error : "upload failed"}`,
          );
        }
      } catch {
        problems.push(`${file.name}: network error`);
      }
      setBusy((n) => n - 1);
    }
    setErrors(problems);
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(base, {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachmentId: id }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));

      setErrors([err.error ?? "Could not delete attachment"]);

      return;
    }
    await load();
  }

  return (
    <section
      className="mt-10 border-t border-separator pt-6"
      onDragLeave={() => setDragging(false)}
      onDragOver={(e) => {
        if (readOnly) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDrop={(e) => {
        if (readOnly) return;
        e.preventDefault();
        setDragging(false);
        void upload([...e.dataTransfer.files]);
      }}
    >
      <h2 className="text-sm font-semibold">
        Attachments{" "}
        <span className="font-normal text-muted">({items.length})</span>
      </h2>
      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {items.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-lg border border-separator p-2"
          >
            {isImageType(a.contentType) ? (
              <a href={a.url} rel="noreferrer" target="_blank">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote blob URL, thumbnail only */}
                <img
                  alt={a.name}
                  className="h-12 w-12 rounded object-cover"
                  height={48}
                  loading="lazy"
                  src={a.url}
                  width={48}
                />
              </a>
            ) : (
              <span
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded bg-default text-[11px] font-medium uppercase text-muted"
              >
                {a.name.split(".").pop()?.slice(0, 4) ?? "file"}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <a
                className="block truncate text-accent hover:underline"
                href={a.url}
                rel="noreferrer"
                target="_blank"
                title={a.name}
              >
                {a.name}
              </a>
              <span className="text-xs text-muted">{formatBytes(a.size)}</span>
            </div>
            {readOnly ? null : (
              <button
                className="text-xs text-danger"
                type="button"
                onClick={() => void remove(a.id)}
              >
                Delete
              </button>
            )}
          </li>
        ))}
        {items.length === 0 ? (
          <li className="text-muted">No attachments.</li>
        ) : null}
      </ul>
      {readOnly ? null : (
        <div
          className={`mt-3 flex items-center gap-3 rounded-lg border border-dashed px-3 py-3 text-sm ${
            dragging ? "border-accent bg-accent/10" : "border-separator"
          }`}
        >
          <button
            className="h-8 rounded-md border border-separator px-3 text-[13px] hover:bg-default disabled:opacity-50"
            disabled={busy > 0}
            type="button"
            onClick={() => input.current?.click()}
          >
            {busy > 0 ? `Uploading ${busy}…` : "Upload files"}
          </button>
          <span className="text-[12px] text-muted">
            or drop files here · images, PDF, text, zip · up to 10 MB each
          </span>
          <input
            ref={input}
            multiple
            accept={ACCEPT}
            className="hidden"
            type="file"
            onChange={(e) => {
              void upload([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </div>
      )}
      {errors.length ? (
        <ul aria-live="polite" className="mt-2 space-y-0.5 text-xs text-danger">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

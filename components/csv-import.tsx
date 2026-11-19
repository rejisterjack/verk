"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { importCsvAction, previewCsvAction } from "@/lib/actions/import";
import { FIELDS, type ImportRow, type Mapping } from "@/lib/import/generic-csv";

type Preview = {
  headers: string[];
  mapping: Mapping;
  source: string;
  sample: ImportRow[];
  count: number;
  problems: { line: number; message: string }[];
  truncated: boolean;
};

const selectClass =
  "h-8 rounded-md border border-separator bg-transparent px-2 text-[13px]";

/**
 * Upload a CSV, check the column mapping against a preview of the first rows, then import.
 * Nothing is written until "Import" is pressed.
 */
export function CsvImport({ teamSlug }: { teamSlug: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    created: number;
    total: number;
    errors: string[];
  } | null>(null);

  function refresh(nextText: string, nextMapping?: Mapping) {
    setError(null);
    startTransition(async () => {
      const result = await previewCsvAction(nextText, nextMapping);

      if ("error" in result) {
        setError(result.error ?? "Could not read the file");

        return;
      }
      setPreview(result);
      setMapping(result.mapping);
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setDone(null);
    const content = await file.text();

    setText(content);
    refresh(content);
  }

  function setField(field: string, value: string) {
    const next: Mapping = { ...mapping };

    if (value === "") delete next[field as keyof Mapping];
    else next[field as keyof Mapping] = Number(value);
    setMapping(next);
    if (text) refresh(text, next);
  }

  function run() {
    if (!text) return;
    setError(null);
    startTransition(async () => {
      const result = await importCsvAction(teamSlug, text, mapping);

      if ("error" in result) {
        setError(result.error ?? "Import failed");

        return;
      }
      setDone(result);
      setPreview(null);
      setText(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 text-sm">
      <input
        accept=".csv,text/csv"
        aria-label="CSV file"
        className="block w-full text-sm"
        type="file"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {error ? <p className="text-danger">{error}</p> : null}

      {done ? (
        <div className="rounded-lg border border-separator p-3">
          <p className="font-medium">
            Imported {done.created} of {done.total} issues
          </p>
          {done.errors.length ? (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-danger">
              {done.errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-3">
          <p className="text-muted">
            Looks like a {preview.source} export. Check which column feeds each
            field.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <label
                key={field.id}
                className="flex flex-col gap-1 text-[12px] text-muted"
              >
                {field.label}
                {"required" in field ? " *" : ""}
                <select
                  className={selectClass}
                  value={mapping[field.id] ?? ""}
                  onChange={(e) => setField(field.id, e.target.value)}
                >
                  <option value="">Not imported</option>
                  {preview.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `Column ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="rounded-lg border border-separator">
            <p className="border-b border-separator px-3 py-1.5 text-[12px] text-muted">
              {preview.count} issue{preview.count === 1 ? "" : "s"} will be
              created
              {preview.truncated ? " (the first 2,000 rows only)" : ""}. First
              rows:
            </p>
            <ul className="divide-y divide-separator">
              {preview.sample.map((row) => (
                <li key={row.line} className="px-3 py-1.5">
                  <span className="font-medium">{row.title}</span>
                  <span className="text-[12px] text-muted">
                    {" "}
                    · {row.status.toLowerCase().replace("_", " ")} ·{" "}
                    {row.priority.toLowerCase()}
                    {row.assigneeEmail ? ` · ${row.assigneeEmail}` : ""}
                    {row.labels.length ? ` · ${row.labels.join(", ")}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {preview.problems.length ? (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted">
              {preview.problems.slice(0, 8).map((problem) => (
                <li key={`${problem.line}-${problem.message}`}>
                  Line {problem.line}: {problem.message}
                </li>
              ))}
            </ul>
          ) : null}

          <button
            className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-50"
            disabled={
              pending || mapping.title === undefined || preview.count === 0
            }
            type="button"
            onClick={run}
          >
            {pending ? "Working…" : `Import ${preview.count} issues`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

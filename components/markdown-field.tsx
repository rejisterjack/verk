"use client";

import { useRef } from "react";

export function MarkdownField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function insert(before: string, after = before) {
    const el = ref.current;

    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end);

    el.value =
      el.value.slice(0, start) + before + selected + after + el.value.slice(end);
    el.focus();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1 text-xs">
        <button className="rounded border border-separator px-2 py-1" type="button" onClick={() => insert("**")}>
          Bold
        </button>
        <button className="rounded border border-separator px-2 py-1" type="button" onClick={() => insert("\n- ", "")}>
          List
        </button>
        <button className="rounded border border-separator px-2 py-1" type="button" onClick={() => insert("[", "](https://)")}>
          Link
        </button>
        <button className="rounded border border-separator px-2 py-1" type="button" onClick={() => insert("`")}>
          Code
        </button>
      </div>
      <textarea
        ref={ref}
        className="min-h-40 rounded-lg border border-separator bg-background px-3 py-2"
        defaultValue={defaultValue}
        name={name}
      />
    </div>
  );
}

"use client";

import { Button, ButtonGroup, Label, TextArea, TextField } from "@heroui/react";
import { useRef } from "react";

export function MarkdownField({
  name,
  defaultValue,
  readOnly = false,
}: {
  name: string;
  defaultValue?: string;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function insert(before: string, after = before) {
    if (readOnly) return;
    const el = ref.current;

    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end);

    el.value =
      el.value.slice(0, start) +
      before +
      selected +
      after +
      el.value.slice(end);
    el.focus();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label id={`${name}-label`}>Description</Label>
        {!readOnly ? (
          <ButtonGroup size="sm" variant="tertiary">
            <Button type="button" onPress={() => insert("**")}>
              Bold
            </Button>
            <Button type="button" onPress={() => insert("\n- ", "")}>
              List
            </Button>
            <Button type="button" onPress={() => insert("[", "](https://)")}>
              Link
            </Button>
            <Button type="button" onPress={() => insert("`")}>
              Code
            </Button>
          </ButtonGroup>
        ) : null}
      </div>
      <TextField
        fullWidth
        aria-labelledby={`${name}-label`}
        defaultValue={defaultValue}
        isReadOnly={readOnly}
        name={name}
      >
        <TextArea ref={ref} fullWidth rows={6} />
      </TextField>
    </div>
  );
}

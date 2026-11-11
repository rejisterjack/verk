"use client";

import { Button, ButtonGroup, Label, TextArea, TextField } from "@heroui/react";
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
      el.value.slice(0, start) +
      before +
      selected +
      after +
      el.value.slice(end);
    el.focus();
  }

  return (
    <TextField defaultValue={defaultValue} name={name}>
      <Label>Description</Label>
      <ButtonGroup>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onPress={() => insert("**")}
        >
          Bold
        </Button>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onPress={() => insert("\n- ", "")}
        >
          List
        </Button>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onPress={() => insert("[", "](https://)")}
        >
          Link
        </Button>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onPress={() => insert("`")}
        >
          Code
        </Button>
      </ButtonGroup>
      <TextArea ref={ref} rows={8} />
    </TextField>
  );
}

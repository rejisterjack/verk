"use client";

import { Button } from "@heroui/react";
import { useState } from "react";

export function TriageSuggest({
  suggest,
  apply,
}: {
  suggest: () => Promise<{ priority: string; labels: string[] }>;
  apply: (priority: string, labels: string[]) => Promise<void>;
}) {
  const [preview, setPreview] = useState<{
    priority: string;
    labels: string[];
  } | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button
        isDisabled={pending}
        size="sm"
        variant="tertiary"
        onPress={() => {
          setPending(true);
          void suggest()
            .then(setPreview)
            .finally(() => setPending(false));
        }}
      >
        Suggest
      </Button>
      {preview ? (
        <>
          <span className="text-[12px] text-muted">
            {preview.priority}
            {preview.labels.length ? ` · ${preview.labels.join(", ")}` : ""}
          </span>
          <Button
            size="sm"
            onPress={() => {
              void apply(preview.priority, preview.labels);
            }}
          >
            Accept
          </Button>
        </>
      ) : null}
    </div>
  );
}

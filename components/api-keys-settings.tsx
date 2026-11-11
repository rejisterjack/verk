"use client";

import { Button, Form, Input, Label, TextField } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createApiKeyAction, revokeApiKeyAction } from "@/lib/actions/api-keys";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date | string;
  lastUsedAt: Date | string | null;
};

/** Stable across SSR/CSR — avoids toLocaleString hydration mismatch. */
function formatUtcStamp(value: Date | string) {
  const iso = new Date(value).toISOString();

  return `${iso.slice(0, 16).replace("T", " ")} UTC`;
}

export function ApiKeysSettings({
  teamSlug,
  keys,
  canAdmin,
}: {
  teamSlug: string;
  keys: KeyRow[];
  canAdmin: boolean;
}) {
  const router = useRouter();
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canAdmin) {
    return (
      <p className="text-muted text-sm">Only admins can manage API keys.</p>
    );
  }

  return (
    <div className="space-y-6">
      <Form
        className="flex flex-wrap items-end gap-2 rounded-xl border border-separator p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setPlaintext(null);
          const formData = new FormData(e.currentTarget);
          const result = await createApiKeyAction(teamSlug, formData);

          if (result.error) {
            setError(result.error);

            return;
          }
          setPlaintext(result.plaintext ?? null);
          e.currentTarget.reset();
          router.refresh();
        }}
      >
        <TextField isRequired className="min-w-56 flex-1" name="name">
          <Label>Name</Label>
          <Input placeholder="Cursor agent" />
        </TextField>
        <Button type="submit">Create key</Button>
        {error ? <p className="w-full text-sm text-danger">{error}</p> : null}
        {plaintext ? (
          <div className="w-full space-y-2">
            <p className="text-sm text-warning">
              Copy this key now — it will not be shown again.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 break-all rounded-lg border border-separator bg-surface px-3 py-2 text-xs">
                {plaintext}
              </code>
              <Button
                size="sm"
                variant="secondary"
                onPress={async () => {
                  await navigator.clipboard.writeText(plaintext);
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        ) : null}
      </Form>

      <div className="overflow-x-auto rounded-xl border border-separator">
        <table className="w-full text-sm">
          <thead className="border-b border-separator bg-surface text-left text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Prefix</th>
              <th className="px-4 py-3">Last used</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr
                key={key.id}
                className="border-b border-separator last:border-0"
              >
                <td className="px-4 py-3">{key.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{key.prefix}…</td>
                <td className="px-4 py-3 text-muted">
                  {key.lastUsedAt ? formatUtcStamp(key.lastUsedAt) : "Never"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="danger"
                    onPress={async () => {
                      await revokeApiKeyAction(teamSlug, key.id);
                      setPlaintext(null);
                      router.refresh();
                    }}
                  >
                    Revoke
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

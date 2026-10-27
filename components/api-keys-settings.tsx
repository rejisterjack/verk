"use client";

import { Button } from "@heroui/react";
import { useState } from "react";

import { createApiKeyAction, revokeApiKeyAction } from "@/lib/actions/api-keys";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date | string;
  lastUsedAt: Date | string | null;
};

export function ApiKeysSettings({
  teamSlug,
  keys,
  canAdmin,
}: {
  teamSlug: string;
  keys: KeyRow[];
  canAdmin: boolean;
}) {
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canAdmin) {
    return (
      <p className="text-muted text-sm">Only admins can manage API keys.</p>
    );
  }

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap gap-2 rounded-xl border border-separator p-4"
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
        }}
      >
        <input
          required
          className="min-w-56 flex-1 rounded-lg border border-separator bg-background px-3 py-2 text-sm"
          name="name"
          placeholder="Cursor agent"
        />
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
      </form>

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
                  {key.lastUsedAt
                    ? new Date(key.lastUsedAt).toLocaleString()
                    : "Never"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="danger"
                    onPress={async () => {
                      await revokeApiKeyAction(teamSlug, key.id);
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

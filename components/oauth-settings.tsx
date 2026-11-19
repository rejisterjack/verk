"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createOAuthAppAction,
  deleteOAuthAppAction,
} from "@/lib/actions/oauth";

type AppRow = {
  id: string;
  name: string;
  clientId: string;
  redirectUris: string[];
  confidential: boolean;
};

const inputClass =
  "h-8 w-full rounded-md border border-separator bg-transparent px-2 text-[13px]";

export function OAuthSettings({
  teamSlug,
  apps,
  origin,
}: {
  teamSlug: string;
  apps: AppRow[];
  origin: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [uris, setUris] = useState("");
  const [confidential, setConfidential] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    clientId: string;
    clientSecret: string | null;
  } | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createOAuthAppAction(teamSlug, {
        name,
        redirectUris: uris,
        confidential,
      });

      if ("error" in result) {
        setError(result.error ?? "Could not register");

        return;
      }
      setCreated({
        clientId: result.clientId,
        clientSecret: result.clientSecret,
      });
      setName("");
      setUris("");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (
      !window.confirm("Delete this app? Every token it issued stops working.")
    )
      return;
    startTransition(async () => {
      const result = await deleteOAuthAppAction(teamSlug, id);

      if ("error" in result) setError(result.error ?? "Could not delete");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6 text-sm">
      {created ? (
        <div className="rounded-lg border border-separator p-3">
          <p className="font-medium">App registered</p>
          <p className="mt-1">
            Client ID: <code className="font-mono">{created.clientId}</code>
          </p>
          {created.clientSecret ? (
            <p>
              Client secret:{" "}
              <code className="break-all font-mono" data-clarity-mask="true">
                {created.clientSecret}
              </code>
              <span className="block text-[12px] text-muted">
                Copy it now. It is never shown again.
              </span>
            </p>
          ) : (
            <p className="text-[12px] text-muted">
              Public client: it must use PKCE and has no secret.
            </p>
          )}
        </div>
      ) : null}

      <section>
        {apps.length === 0 ? (
          <p className="text-muted">No apps registered.</p>
        ) : (
          <ul className="divide-y divide-separator rounded-lg border border-separator">
            {apps.map((app) => (
              <li key={app.id} className="flex items-start gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{app.name}</p>
                  <p className="font-mono text-[12px] text-muted">
                    {app.clientId}
                  </p>
                  <p className="break-all text-[12px] text-muted">
                    {app.confidential ? "Confidential" : "Public (PKCE only)"} ·{" "}
                    {app.redirectUris.join(", ")}
                  </p>
                </div>
                <button
                  className="text-xs text-danger"
                  disabled={pending}
                  type="button"
                  onClick={() => remove(app.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 rounded-lg border border-separator p-3">
        <h2 className="font-medium">Register an app</h2>
        <input
          aria-label="App name"
          className={inputClass}
          placeholder="App name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          aria-label="Redirect URIs"
          className={`${inputClass} h-20 py-1`}
          placeholder={
            "Redirect URIs, one per line\nhttps://example.com/callback"
          }
          value={uris}
          onChange={(e) => setUris(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <input
            checked={confidential}
            className="h-4 w-4 accent-[var(--accent)]"
            id="oauth-confidential"
            type="checkbox"
            onChange={(e) => setConfidential(e.target.checked)}
          />
          <label htmlFor="oauth-confidential">
            Server-side app (gets a client secret)
          </label>
        </div>
        {error ? <p className="text-danger">{error}</p> : null}
        <button
          className="h-8 rounded-md bg-accent px-3 text-[13px] font-medium text-accent-foreground disabled:opacity-50"
          disabled={pending || !name.trim() || !uris.trim()}
          type="button"
          onClick={create}
        >
          Register app
        </button>
      </section>

      <section className="text-[12px] text-muted">
        <p className="font-medium text-foreground">How apps connect</p>
        <p>
          Send people to{" "}
          <code className="break-all font-mono">
            {origin}
            /oauth/authorize?response_type=code&amp;client_id=…&amp;redirect_uri=…&amp;scope=read|write&amp;state=…&amp;code_challenge=…&amp;code_challenge_method=S256
          </code>
          , then POST the returned code with your <code>
            code_verifier
          </code> to <code className="font-mono">{origin}/api/oauth/token</code>
          . The access token is a bearer token for the REST, GraphQL and MCP
          APIs.
        </p>
      </section>
    </div>
  );
}

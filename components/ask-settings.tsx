"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { rotateAskLinkAction, setAskLinkAction } from "@/lib/actions/asks";

export function AskSettings({
  teamSlug,
  origin,
  link,
}: {
  teamSlug: string;
  origin: string;
  link: { enabled: boolean; heading: string; prefix: string } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState<string | null>(null);
  const [heading, setHeading] = useState(link?.heading ?? "");
  const [error, setError] = useState<string | null>(null);

  function rotate() {
    if (
      link &&
      !window.confirm("Make a new link? The old one stops working immediately.")
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rotateAskLinkAction(teamSlug);

      if ("error" in result)
        setError(result.error ?? "Could not create the link");
      else {
        setToken(result.token);
        router.refresh();
      }
    });
  }

  function save(enabled: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setAskLinkAction(teamSlug, enabled, heading);

      if ("error" in result) setError(result.error ?? "Could not save");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4 text-sm">
      {token ? (
        <div className="rounded-lg border border-separator p-3">
          <p className="font-medium">Your public link</p>
          <p
            className="mt-1 break-all font-mono text-[13px]"
            data-clarity-mask="true"
          >
            {origin}/ask/{token}
          </p>
          <p className="mt-1 text-[12px] text-muted">
            Copy it now. For safety it is stored hashed and cannot be shown
            again; make a new one if you lose it.
          </p>
        </div>
      ) : null}
      {link ? (
        <p className="text-muted">
          A link starting with <code className="font-mono">{link.prefix}…</code>{" "}
          is {link.enabled ? "on" : "off"}.
        </p>
      ) : (
        <p className="text-muted">No public link yet.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          className="h-8 rounded-md border border-separator px-3 text-[13px] hover:bg-default disabled:opacity-50"
          disabled={pending}
          type="button"
          onClick={rotate}
        >
          {link ? "Make a new link" : "Create a link"}
        </button>
        {link ? (
          <button
            className="h-8 rounded-md border border-separator px-3 text-[13px] hover:bg-default disabled:opacity-50"
            disabled={pending}
            type="button"
            onClick={() => save(!link.enabled)}
          >
            {link.enabled ? "Turn off" : "Turn on"}
          </button>
        ) : null}
      </div>
      {link ? (
        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-[12px] text-muted">
            Heading on the form
            <input
              className="h-8 rounded-md border border-separator bg-transparent px-2 text-[13px] text-foreground"
              maxLength={120}
              placeholder="For example: Report a problem"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
            />
          </label>
          <button
            className="h-8 rounded-md border border-separator px-3 text-[13px] hover:bg-default disabled:opacity-50"
            disabled={pending}
            type="button"
            onClick={() => save(link.enabled)}
          >
            Save
          </button>
        </div>
      ) : null}
      {error ? <p className="text-danger">{error}</p> : null}
    </div>
  );
}

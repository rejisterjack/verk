"use client";

import { useState, useTransition } from "react";

import { eraseAccountAction } from "@/lib/actions/privacy";

const buttonClass =
  "h-9 rounded-md border border-separator px-3 text-sm hover:bg-default disabled:opacity-50";

/** Account page: download your data, or erase the account. */
export function PrivacySettings({ hasPassword }: { hasPassword: boolean }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted">
        Download a copy of everything Verk holds about you, or erase your
        account. Erasing removes your name, email, sign-in methods and keys;
        issues and comments you wrote stay for your team and show as
        &ldquo;Deleted user&rdquo;.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          className={`${buttonClass} inline-flex items-center`}
          href="/api/account/export"
        >
          Download my data
        </a>
        <button
          className={`${buttonClass} text-danger`}
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          Erase my account…
        </button>
      </div>
      {open ? (
        <div className="space-y-2 rounded-lg border border-danger/40 p-3">
          <p>
            This cannot be undone.{" "}
            {hasPassword
              ? "Enter your password to confirm."
              : "Type your email address to confirm."}
          </p>
          <input
            autoComplete={hasPassword ? "current-password" : "off"}
            className="h-9 w-full rounded-md border border-separator bg-transparent px-2 text-sm"
            type={hasPassword ? "password" : "text"}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <button
            className={`${buttonClass} text-danger`}
            disabled={pending || !confirmation}
            type="button"
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await eraseAccountAction(confirmation);

                if (result && "error" in result) setError(result.error ?? null);
              });
            }}
          >
            {pending ? "Erasing…" : "Erase permanently"}
          </button>
          {error ? (
            <p className="text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

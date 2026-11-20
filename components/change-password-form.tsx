"use client";

import { useState } from "react";

import { changePasswordAction } from "@/lib/actions/password";

const fieldClass =
  "h-10 w-full rounded-md border border-separator bg-background px-3 text-sm";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (!hasPassword) {
    return (
      <p className="text-muted text-sm">
        This account has no password. Use the provider it was created with.
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setDone(false);

        try {
          const result = await changePasswordAction(
            new FormData(event.currentTarget),
          );

          if (result && "error" in result && result.error)
            setError(result.error);
          if (result && "ok" in result && result.ok) setDone(true);
        } catch {
          setError("Could not change the password. Try again.");
        }

        setPending(false);
      }}
    >
      <label className="block text-sm">
        <span className="text-muted">Current password</span>
        <input
          required
          autoComplete="current-password"
          className={`${fieldClass} mt-1`}
          name="current"
          type="password"
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted">New password</span>
        <input
          required
          autoComplete="new-password"
          className={`${fieldClass} mt-1`}
          minLength={8}
          name="next"
          type="password"
        />
      </label>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      {done ? (
        <p className="text-sm">
          Password updated. Sign in again with the new password.
        </p>
      ) : null}
      <button
        className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}

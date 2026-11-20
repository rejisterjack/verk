"use client";

import { useState } from "react";

import { updateProfileAction } from "@/lib/actions/profile";

const fieldClass =
  "h-10 w-full rounded-md border border-separator bg-background px-3 text-sm";

export function ProfileForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setMessage(null);

        try {
          const result = await updateProfileAction(
            new FormData(event.currentTarget),
          );

          if (result && "error" in result && result.error) setError(result.error);
          if (result && "message" in result && result.message) {
            setMessage(result.message);
          }
        } catch {
          setError("Could not update the profile. Try again.");
        }

        setPending(false);
      }}
    >
      <label className="block text-sm">
        <span className="text-muted">Name</span>
        <input
          required
          className={`${fieldClass} mt-1`}
          defaultValue={name}
          maxLength={100}
          name="name"
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted">Email</span>
        <input
          required
          className={`${fieldClass} mt-1`}
          defaultValue={email}
          name="email"
          type="email"
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted">Current password</span>
        <input
          autoComplete="current-password"
          className={`${fieldClass} mt-1`}
          name="password"
          placeholder="Required only when the email changes"
          type="password"
        />
      </label>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      {message ? <p className="text-sm">{message}</p> : null}
      <button
        className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

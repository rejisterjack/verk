"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useState } from "react";

import { beginPasskeySignInAction } from "@/lib/actions/passkeys";
import { passkeySignInAction } from "@/lib/actions/auth";

/** "Sign in with a passkey": no email or password, the device and its unlock do the work. */
export function PasskeySignIn({ callbackUrl }: { callbackUrl: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    setPending(true);
    try {
      const begun = await beginPasskeySignInAction();

      if ("error" in begun) {
        setError(begun.error ?? "Could not start");

        return;
      }
      const assertion = await startAuthentication(begun.options);
      const result = await passkeySignInAction(
        JSON.stringify(assertion),
        callbackUrl,
      );

      if (result && "error" in result) setError(result.error ?? null);
    } catch (e) {
      // Cancelling the browser prompt is not an error worth showing.
      if (!(e instanceof Error && e.name === "NotAllowedError")) {
        setError("Passkey sign-in failed. Try again or use your password.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-separator bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-default/40 disabled:opacity-50"
        disabled={pending}
        type="button"
        onClick={() => void signIn()}
      >
        {pending ? "Waiting for your device…" : "Sign in with a passkey"}
      </button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

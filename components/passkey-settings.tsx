"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  beginPasskeyAction,
  finishPasskeyAction,
  removePasskeyAction,
} from "@/lib/actions/passkeys";

type Passkey = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
};

const buttonClass =
  "h-9 rounded-md border border-separator px-3 text-sm hover:bg-default disabled:opacity-50";

/** Passkeys on the account page: add one for this device, see them, remove one. */
export function PasskeySettings({ passkeys }: { passkeys: Passkey[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const supported =
    typeof window === "undefined" || typeof PublicKeyCredential !== "undefined";

  function add() {
    setError(null);
    startTransition(async () => {
      const begun = await beginPasskeyAction();

      if ("error" in begun) {
        setError(begun.error ?? "Could not start");

        return;
      }
      try {
        const created = await startRegistration(begun.options);
        const result = await finishPasskeyAction(created, name);

        if ("error" in result) setError(result.error ?? null);
        else {
          setName("");
          router.refresh();
        }
      } catch (e) {
        if (!(e instanceof Error && e.name === "NotAllowedError")) {
          setError("Could not create the passkey on this device.");
        }
      }
    });
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted">
        A passkey signs you in with your fingerprint, face or device PIN. No
        password and no code to type.
      </p>
      {passkeys.length ? (
        <ul className="space-y-2">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-separator px-3 py-2"
            >
              <span>
                {passkey.name}
                <span className="block text-[12px] text-muted">
                  Added {passkey.createdAt.slice(0, 10)}
                  {passkey.lastUsedAt
                    ? ` · used ${passkey.lastUsedAt.slice(0, 10)}`
                    : " · never used"}
                  {passkey.backedUp ? " · synced" : ""}
                </span>
              </span>
              <button
                className={buttonClass}
                disabled={pending}
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    const result = await removePasskeyAction(passkey.id);

                    if ("error" in result) setError(result.error ?? null);
                    else router.refresh();
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {supported ? (
        <div className="flex flex-wrap gap-2">
          <input
            className="h-9 rounded-md border border-separator bg-transparent px-2 text-sm"
            maxLength={60}
            placeholder="Name (for example, Work laptop)"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            className={buttonClass}
            disabled={pending}
            type="button"
            onClick={add}
          >
            {pending ? "Waiting for your device…" : "Add a passkey"}
          </button>
        </div>
      ) : (
        <p className="text-muted">This browser does not support passkeys.</p>
      )}
      {error ? (
        <p className="text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";

import {
  beginTwoFactorAction,
  confirmTwoFactorAction,
  disableTwoFactorAction,
  regenerateRecoveryCodesAction,
} from "@/lib/actions/two-factor";

const inputClass =
  "h-9 rounded-md border border-separator bg-transparent px-2 text-sm";
const buttonClass =
  "h-9 rounded-md border border-separator px-3 text-sm hover:bg-default disabled:opacity-50";

/**
 * Two-factor sign-in for password accounts. Setup is two steps (scan or type the secret, then
 * prove it with a code); recovery codes are shown exactly once.
 */
export function TwoFactorSettings({
  enabled,
  recoveryLeft,
  hasPassword,
}: {
  enabled: boolean;
  recoveryLeft: number;
  hasPassword: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [on, setOn] = useState(enabled);
  const [left, setLeft] = useState(recoveryLeft);
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(
    null,
  );
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!hasPassword && !on) {
    return (
      <p className="text-sm text-muted">
        You sign in through GitHub, Google, SSO or SAML, so your identity
        provider handles two-factor authentication. Set it up there.
      </p>
    );
  }

  function begin() {
    setError(null);
    startTransition(async () => {
      const result = await beginTwoFactorAction();

      if ("error" in result) setError(result.error ?? "Could not start");
      else setSetup({ secret: result.secret, uri: result.uri });
    });
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmTwoFactorAction(code);

      if ("error" in result) {
        setError(result.error ?? "That code is not right");

        return;
      }
      setOn(true);
      setLeft(result.recoveryCodes.length);
      setCodes(result.recoveryCodes);
      setSetup(null);
      setCode("");
    });
  }

  function disable() {
    setError(null);
    startTransition(async () => {
      const result = await disableTwoFactorAction(password, code);

      if ("error" in result) {
        setError(result.error ?? "Could not turn off");

        return;
      }
      setOn(false);
      setCodes(null);
      setPassword("");
      setCode("");
    });
  }

  function regenerate() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateRecoveryCodesAction();

      if ("error" in result)
        setError(result.error ?? "Could not make new codes");
      else {
        setCodes(result.recoveryCodes);
        setLeft(result.recoveryCodes.length);
      }
    });
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted">
        {on
          ? "Sign-in asks for a code from your authenticator app after your password."
          : "Add a second step to password sign-in with an authenticator app (Google Authenticator, 1Password, Authy)."}
      </p>

      {codes ? (
        <div className="rounded-lg border border-separator p-3">
          <p className="font-medium">Save these recovery codes now</p>
          <p className="text-[12px] text-muted">
            Each works once if you lose your phone. They will not be shown
            again.
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-[13px]">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <button
            className={`${buttonClass} mt-3`}
            type="button"
            onClick={() => setCodes(null)}
          >
            I saved them
          </button>
        </div>
      ) : null}

      {!on && !setup ? (
        <button
          className={buttonClass}
          disabled={pending}
          type="button"
          onClick={begin}
        >
          Set up two-factor sign-in
        </button>
      ) : null}

      {setup ? (
        <div className="space-y-2 rounded-lg border border-separator p-3">
          <p>
            In your authenticator app choose “Enter a setup key” and type this
            secret (or open the link on your phone):
          </p>
          <p className="break-all font-mono text-[13px]" data-clarity-mask="true">
            {setup.secret}
          </p>
          <a
            className="text-[12px] text-accent hover:underline"
            data-clarity-mask="true"
            href={setup.uri}
          >
            Open in authenticator app
          </a>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              aria-label="6-digit code"
              autoComplete="one-time-code"
              className={inputClass}
              inputMode="numeric"
              maxLength={7}
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              className={buttonClass}
              disabled={pending || code.replace(/\s/g, "").length < 6}
              type="button"
              onClick={confirm}
            >
              Turn on
            </button>
          </div>
        </div>
      ) : null}

      {on && !codes ? (
        <div className="space-y-3">
          <p className="text-[12px] text-muted">
            {left} recovery code{left === 1 ? "" : "s"} left.
          </p>
          <button
            className={buttonClass}
            disabled={pending}
            type="button"
            onClick={regenerate}
          >
            Make new recovery codes
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {hasPassword ? (
              <input
                aria-label="Password"
                autoComplete="current-password"
                className={inputClass}
                placeholder="Password to turn off"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            ) : (
              <input
                aria-label="Code"
                className={inputClass}
                placeholder="Code to turn off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            )}
            <button
              className={`${buttonClass} text-danger`}
              disabled={pending || (hasPassword ? !password : !code)}
              type="button"
              onClick={disable}
            >
              Turn off
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-danger">{error}</p> : null}
    </div>
  );
}

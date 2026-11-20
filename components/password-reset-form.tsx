"use client";

import { Button, FieldError, Input, Label, TextField } from "@heroui/react";
import NextLink from "next/link";
import { useState } from "react";

import {
  completePasswordResetAction,
  requestPasswordResetAction,
} from "@/lib/actions/password-reset";
import { VerkIcon } from "@/components/verk-logo";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="rounded-2xl border border-separator/80 bg-surface/90 p-8 shadow-xl shadow-black/5 backdrop-blur-md">
        <VerkIcon glow={false} size={44} />
        <div className="mt-5">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Reset your password
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Remembered it?{" "}
            <NextLink className="text-accent underline" href="/login">
              Log in
            </NextLink>
          </p>
        </div>
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            setMessage(null);

            try {
              const result = await requestPasswordResetAction(
                new FormData(event.currentTarget),
              );

              if (result && "error" in result && result.error) {
                setError(result.error);
              }
              if (result && "message" in result && result.message) {
                setMessage(result.message);
              }
            } catch {
              setError(
                "We could not send email right now. Try again once email is configured.",
              );
            }

            setPending(false);
          }}
        >
          <TextField isRequired name="email" type="email">
            <Label>Email</Label>
            <Input placeholder="you@company.com" />
            <FieldError />
          </TextField>
          {error ? <p className="text-danger text-sm">{error}</p> : null}
          {message ? (
            <p className="text-sm text-foreground">{message}</p>
          ) : null}
          <Button className="h-11 w-full" isDisabled={pending} type="submit">
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function SetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="rounded-2xl border border-separator/80 bg-surface/90 p-8 shadow-xl shadow-black/5 backdrop-blur-md">
        <VerkIcon glow={false} size={44} />
        <div className="mt-5">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Choose a new password
          </h1>
        </div>
        {done ? (
          <p className="mt-6 text-sm text-foreground">
            Password updated.{" "}
            <NextLink className="text-accent underline" href="/login">
              Log in
            </NextLink>
          </p>
        ) : (
          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              setError(null);
              const data = new FormData(event.currentTarget);

              data.set("token", token);
              const result = await completePasswordResetAction(data);

              if (result && "error" in result && result.error)
                setError(result.error);
              if (result && "ok" in result && result.ok) setDone(true);
              setPending(false);
            }}
          >
            <TextField isRequired minLength={8} name="password" type="password">
              <Label>New password</Label>
              <Input placeholder="At least 8 characters" />
              <FieldError />
            </TextField>
            {error ? <p className="text-danger text-sm">{error}</p> : null}
            <Button className="h-11 w-full" isDisabled={pending} type="submit">
              {pending ? "Saving…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

"use client";

import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import NextLink from "next/link";
import { useState } from "react";

import {
  githubSignInAction,
  googleSignInAction,
  loginAction,
  oidcSignInAction,
  registerAction,
} from "@/lib/actions/auth";

export function LoginForm({
  callbackUrl = "/onboarding",
  demoMode = false,
  privateHost = false,
  accessDenied = false,
  githubEnabled,
  googleEnabled,
  oidcEnabled,
}: {
  callbackUrl?: string;
  demoMode?: boolean;
  privateHost?: boolean;
  accessDenied?: boolean;
  githubEnabled: boolean;
  googleEnabled?: boolean;
  oidcEnabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Log in to Verk</h1>
        {privateHost ? (
          <p className="text-muted text-sm mt-1">
            This hosted Verk is private. Sign in with GitHub, or{" "}
            <a
              className="text-accent underline"
              href="https://github.com/rejisterjack/verk"
              rel="noopener noreferrer"
              target="_blank"
            >
              deploy your own
            </a>
            .
          </p>
        ) : demoMode ? (
          <p className="text-muted text-sm mt-1">
            Public demo credentials:{" "}
            <code className="font-mono text-foreground">demo@verk.dev</code> /{" "}
            <code className="font-mono text-foreground">demo1234</code>. Open
            registration is off on this host.
          </p>
        ) : (
          <p className="text-muted text-sm mt-1">
            No account?{" "}
            <NextLink className="text-accent underline" href="/register">
              Register
            </NextLink>
          </p>
        )}
      </div>

      {accessDenied ? (
        <p className="text-danger text-sm">
          That GitHub account cannot use this host.
        </p>
      ) : null}
      {githubEnabled ? (
        <form action={githubSignInAction}>
          <input name="callbackUrl" type="hidden" value={callbackUrl} />
          <Button className="w-full" type="submit" variant="secondary">
            Continue with GitHub
          </Button>
        </form>
      ) : null}
      {!privateHost && googleEnabled ? (
        <form action={googleSignInAction}>
          <input name="callbackUrl" type="hidden" value={callbackUrl} />
          <Button className="w-full" type="submit" variant="secondary">
            Continue with Google
          </Button>
        </form>
      ) : null}
      {!privateHost && oidcEnabled ? (
        <form action={oidcSignInAction}>
          <input name="callbackUrl" type="hidden" value={callbackUrl} />
          <Button className="w-full" type="submit" variant="secondary">
            Continue with SSO
          </Button>
        </form>
      ) : null}

      {privateHost ? null : (
        <Form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError(null);
            const formData = new FormData(e.currentTarget);

            formData.set("callbackUrl", callbackUrl);
            const result = await loginAction(formData);

            if (result?.error) setError(result.error);
            setPending(false);
          }}
        >
          <TextField isRequired name="email" type="email">
            <Label>Email</Label>
            <Input placeholder="you@company.com" />
            <FieldError />
          </TextField>
          <TextField isRequired name="password" type="password">
            <Label>Password</Label>
            <Input placeholder="••••••••" />
            <FieldError />
          </TextField>
          {error ? <p className="text-danger text-sm">{error}</p> : null}
          <Button className="w-full" isDisabled={pending} type="submit">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </Form>
      )}
    </div>
  );
}

export function RegisterForm({ githubEnabled }: { githubEnabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create your Verk account</h1>
        <p className="text-muted text-sm mt-1">
          Already have an account?{" "}
          <NextLink className="text-accent underline" href="/login">
            Log in
          </NextLink>
        </p>
      </div>

      {githubEnabled ? (
        <form action={githubSignInAction}>
          <input name="callbackUrl" type="hidden" value="/onboarding" />
          <Button className="w-full" type="submit" variant="secondary">
            Continue with GitHub
          </Button>
        </form>
      ) : null}

      <Form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          const formData = new FormData(e.currentTarget);
          const result = await registerAction(formData);

          if (result?.error) setError(result.error);
          setPending(false);
        }}
      >
        <TextField isRequired name="name">
          <Label>Name</Label>
          <Input placeholder="Ada Lovelace" />
          <FieldError />
        </TextField>
        <TextField isRequired name="email" type="email">
          <Label>Email</Label>
          <Input placeholder="you@company.com" />
          <FieldError />
        </TextField>
        <TextField isRequired minLength={8} name="password" type="password">
          <Label>Password</Label>
          <Input placeholder="At least 8 characters" />
          <FieldError />
        </TextField>
        {error ? <p className="text-danger text-sm">{error}</p> : null}
        <Button className="w-full" isDisabled={pending} type="submit">
          {pending ? "Creating…" : "Create account"}
        </Button>
      </Form>
    </div>
  );
}

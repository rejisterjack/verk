"use client";

import {
  Button,
  FieldError,
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
import { siteConfig } from "@/config/site";
import { PasskeySignIn } from "@/components/passkey-sign-in";
import { SubmitButton } from "@/components/submit-button";
import { VerkIcon } from "@/components/verk-logo";

const SAML_ERROR_TEXT: Record<string, string> = {
  SamlInvalid:
    "We couldn't verify that sign-in with your identity provider. Try again.",
  SamlNoEmail: "Your identity provider didn't send an email address.",
  SamlDomain: "That email domain isn't allowed to sign in to this host.",
  SamlDisabled: "This account has been deactivated.",
  SamlPrivateHost: "This host is private. SAML sign-in is not available.",
};

export function LoginForm({
  callbackUrl = "/onboarding",
  demoMode = false,
  privateHost = false,
  accessDenied = false,
  githubEnabled,
  googleEnabled,
  oidcEnabled,
  samlEnabled,
  samlError,
  askForCode = false,
  initialEmail = "",
  credentialsError = false,
  throttled = false,
}: {
  callbackUrl?: string;
  demoMode?: boolean;
  privateHost?: boolean;
  accessDenied?: boolean;
  githubEnabled: boolean;
  googleEnabled?: boolean;
  oidcEnabled?: boolean;
  samlEnabled?: boolean;
  samlError?: string;
  askForCode?: boolean;
  initialEmail?: string;
  credentialsError?: boolean;
  throttled?: boolean;
}) {
  const [error, setError] = useState<string | null>(
    throttled
      ? "Too many attempts. Try again shortly."
      : credentialsError
        ? "Invalid email or password"
        : null,
  );
  const [pending, setPending] = useState(false);
  const [needsCode, setNeedsCode] = useState(askForCode);

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="rounded-2xl border border-separator/80 bg-surface/90 p-8 shadow-xl shadow-black/5 backdrop-blur-md">
        <VerkIcon glow={false} size={44} />
        <div className="mt-5">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Log in to Verk
          </h1>
          {privateHost ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              This host is private. Only its GitHub account can open the app.
            </p>
          ) : demoMode ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Public demo credentials:{" "}
              <code className="font-mono text-foreground">demo@verk.dev</code> /{" "}
              <code className="font-mono text-foreground">demo1234</code>. Open
              registration is off on this host.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              No account?{" "}
              <NextLink className="text-accent underline" href="/register">
                Register
              </NextLink>
            </p>
          )}
        </div>

        {accessDenied ? (
          <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            That GitHub account cannot use this host.
          </p>
        ) : null}
        {samlError ? (
          <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {SAML_ERROR_TEXT[samlError] ?? SAML_ERROR_TEXT.SamlInvalid}
          </p>
        ) : null}
        {privateHost && githubEnabled ? (
          <form action={githubSignInAction} className="mt-6">
            <input name="callbackUrl" type="hidden" value={callbackUrl} />
            <SubmitButton
              className="h-11 w-full bg-accent text-accent-foreground shadow-lg shadow-accent/20"
              pendingLabel="Redirecting to GitHub…"
            >
              <GitHubMark />
              Continue with GitHub
            </SubmitButton>
          </form>
        ) : null}

        {privateHost ? null : (
          <form
            action="/api/auth/password"
            className="mt-6 flex flex-col gap-4"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              setPending(true);
              setError(null);
              const formData = new FormData(event.currentTarget);

              formData.set("callbackUrl", callbackUrl);
              void loginAction(formData).then((result) => {
                if (result && "needsCode" in result && result.needsCode) {
                  setNeedsCode(true);
                }
                if (result && "error" in result && result.error) {
                  setError(result.error);
                }
                setPending(false);
              });
            }}
          >
            <input name="callbackUrl" type="hidden" value={callbackUrl} />
            {/* Email and password stay in the form (hidden) while the code is asked for. */}
            <div className={needsCode ? "hidden" : "contents"}>
              <TextField
                defaultValue={initialEmail}
                isRequired
                name="email"
                type="email"
              >
                <Label>Email</Label>
                <Input placeholder="you@company.com" />
                <FieldError />
              </TextField>
              <TextField isRequired name="password" type="password">
                <Label>Password</Label>
                <Input placeholder="••••••••" />
                <FieldError />
              </TextField>
            </div>
            {needsCode ? (
              <TextField isRequired name="code">
                <Label>Authentication code</Label>
                <Input
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- the code is the only thing left to enter
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="text"
                  placeholder="6-digit code or a recovery code"
                />
                <FieldError />
              </TextField>
            ) : null}
            {error ? <p className="text-danger text-sm">{error}</p> : null}
            <button
              className="h-11 w-full rounded-xl bg-accent text-sm font-medium text-accent-foreground disabled:opacity-60"
              disabled={pending}
              type="submit"
            >
              {pending ? "Signing in…" : needsCode ? "Verify" : "Sign in"}
            </button>
          </form>
        )}

        {!privateHost && githubEnabled ? (
          <>
            <AuthDivider />
            <form action={githubSignInAction}>
              <input name="callbackUrl" type="hidden" value={callbackUrl} />
              <SubmitButton
                className="h-11 w-full bg-accent text-accent-foreground shadow-lg shadow-accent/20"
                pendingLabel="Redirecting to GitHub…"
              >
                <GitHubMark />
                Continue with GitHub
              </SubmitButton>
            </form>
          </>
        ) : null}
        {!privateHost && googleEnabled ? (
          <form action={googleSignInAction} className="mt-3">
            <input name="callbackUrl" type="hidden" value={callbackUrl} />
            <SubmitButton
              className="w-full"
              pendingLabel="Redirecting to Google…"
              variant="secondary"
            >
              Continue with Google
            </SubmitButton>
          </form>
        ) : null}
        {!privateHost && oidcEnabled ? (
          <form action={oidcSignInAction} className="mt-3">
            <input name="callbackUrl" type="hidden" value={callbackUrl} />
            <SubmitButton
              className="w-full"
              pendingLabel="Redirecting to your identity provider…"
              variant="secondary"
            >
              Continue with SSO
            </SubmitButton>
          </form>
        ) : null}
        {!privateHost && samlEnabled ? (
          <a
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-separator bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-default/40"
            href={`/api/auth/saml/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Continue with SAML
          </a>
        ) : null}

        {privateHost || demoMode ? null : (
          <PasskeySignIn callbackUrl={callbackUrl} />
        )}
        {privateHost ? (
          <a
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
            href={siteConfig.links.deploy}
            rel="noopener noreferrer"
            target="_blank"
          >
            Deploy your own
            <span aria-hidden>→</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

function AuthDivider() {
  return (
    <div className="relative my-6" role="separator">
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-full border-t border-separator/80" />
      </div>
      <p className="relative mx-auto w-fit bg-surface/90 px-3 text-xs font-medium uppercase tracking-wide text-muted">
        or
      </p>
    </div>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden className="h-4 w-4 fill-current" viewBox="0 0 16 16">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function RegisterForm({ githubEnabled }: { githubEnabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="rounded-2xl border border-separator/80 bg-surface/90 p-8 shadow-xl shadow-black/5 backdrop-blur-md">
        <VerkIcon glow={false} size={44} />
        <div className="mt-5">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Create your Verk account
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Already have an account?{" "}
            <NextLink className="text-accent underline" href="/login">
              Log in
            </NextLink>
          </p>
        </div>

        <form
          className="mt-6 flex flex-col gap-4"
          method="post"
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
          <Button className="h-11 w-full" isDisabled={pending} type="submit">
            {pending ? "Creating…" : "Create account"}
          </Button>
        </form>

        {githubEnabled ? (
          <>
            <AuthDivider />
            <form action={githubSignInAction}>
              <input name="callbackUrl" type="hidden" value="/onboarding" />
              <SubmitButton
                className="h-11 w-full bg-accent text-accent-foreground shadow-lg shadow-accent/20"
                pendingLabel="Redirecting to GitHub…"
              >
                <GitHubMark />
                Continue with GitHub
              </SubmitButton>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}

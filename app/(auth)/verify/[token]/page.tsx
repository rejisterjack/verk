import NextLink from "next/link";

import { completeEmailVerification } from "@/lib/services/email-verification";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const confirmed = token ? await completeEmailVerification(token) : false;

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-separator/80 bg-surface/90 p-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        {confirmed ? "Email confirmed" : "This link is invalid or was already used"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {confirmed
          ? "You can sign in with this address."
          : "Ask for a new confirmation link if you still need to confirm the address."}
      </p>
      <NextLink className="mt-6 inline-block text-sm text-accent underline" href="/login">
        Log in
      </NextLink>
    </div>
  );
}

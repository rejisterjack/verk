import NextLink from "next/link";

import { VerkIcon } from "@/components/verk-logo";
import { auth } from "@/lib/auth";

export const metadata = {
  title: "Page Not Found",
};

export default async function NotFound() {
  let signedIn = false;

  try {
    const session = await auth();

    signedIn = Boolean(session?.user);
  } catch {
    signedIn = false;
  }

  return (
    <main className="verk-grain verk-grid relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="relative z-10 w-full max-w-[420px] rounded-2xl border border-separator/80 bg-surface/90 px-8 py-10 text-center shadow-xl shadow-black/5 backdrop-blur-md">
        <VerkIcon className="mx-auto" glow={false} size={48} />
        <p className="mt-6 font-mono text-xs font-medium tracking-[0.18em] text-accent uppercase">
          404
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
          This page isn&apos;t here
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          That address doesn&apos;t match a Verk page. It may have been renamed,
          or the link is incomplete.
        </p>
        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <NextLink
            className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-opacity hover:opacity-95"
            href={signedIn ? "/t" : "/login"}
          >
            {signedIn ? "Go to your teams" : "Log in"}
          </NextLink>
          <NextLink
            className="inline-flex h-11 items-center justify-center rounded-xl border border-separator bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-default"
            href="/"
          >
            Home
          </NextLink>
        </div>
      </div>
    </main>
  );
}

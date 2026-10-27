import NextLink from "next/link";

export const metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(15,118,110,0.14), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 75%, rgba(180,83,9,0.08), transparent 50%), linear-gradient(165deg, #faf9f6 0%, #f0ebe3 100%)",
        }}
      />
      <div className="relative z-10 max-w-md text-center">
        <p className="font-display text-4xl font-bold tracking-tight text-accent">
          Verk
        </p>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">
          You&apos;re offline
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          This page isn&apos;t cached yet. Reconnect, or open a board
          you&apos;ve already visited — cached issues stay available offline.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <NextLink
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            href="/t"
          >
            Go to teams
          </NextLink>
          <NextLink
            className="rounded-lg border border-separator bg-background px-4 py-2 text-sm"
            href="/t"
          >
            Retry
          </NextLink>
        </div>
      </div>
    </main>
  );
}

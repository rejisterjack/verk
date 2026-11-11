import NextLink from "next/link";

export const metadata = {
  title: "Page Not Found - Verk",
};

export default function NotFound() {
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
          404
        </p>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The page or resource you are looking for doesn&apos;t exist or may
          have been moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <NextLink
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
            href="/t"
          >
            Go to teams
          </NextLink>
          <NextLink
            className="rounded-lg border border-separator bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-default"
            href="/"
          >
            Home
          </NextLink>
        </div>
      </div>
    </main>
  );
}

import { Metadata } from "next";
import NextLink from "next/link";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "About" };

const points = [
  {
    eyebrow: "Why it exists",
    title: "Linear polish, without the bill or the ops",
    body: "Linear is excellent but expensive for small teams, and open-source alternatives often demand Docker and ongoing ops. Verk runs as a single Next.js app on Vercel with Neon Postgres — clone, connect, deploy.",
  },
  {
    eyebrow: "What it covers",
    title: "The core 80% of project tracking",
    body: "Issues, statuses, priorities, cycles, teams with roles, board and list views, plus a first-class MCP server for AI agents. It is infrastructure for developers, not a consumer product chasing every feature.",
  },
  {
    eyebrow: "How you run it",
    title: "Your database. Your deploy.",
    body: "Clone the repo, connect Neon, and deploy to Vercel. The source is on GitHub. Follow the docs to run it locally, then sign in with an account you create.",
  },
];

export default function AboutPage() {
  return (
    <div className="relative overflow-hidden verk-grain verk-grid">
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <header className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-accent">
            About
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
            About Verk
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            A keyboard-driven tracker you host yourself. Same vocabulary as
            Linear, on the serverless stack you already use.
          </p>
        </header>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {points.map((point) => (
            <section
              key={point.title}
              className="rounded-2xl border border-separator/80 bg-surface/80 p-6 backdrop-blur-sm"
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-accent">
                {point.eyebrow}
              </p>
              <h2 className="mt-3 font-display text-xl font-semibold tracking-tight text-foreground">
                {point.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {point.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 hover:opacity-95"
            href={siteConfig.links.github}
            rel="noopener noreferrer"
            target="_blank"
          >
            github.com/rejisterjack/verk
          </a>
          <NextLink
            className="inline-flex items-center gap-2 rounded-xl border border-separator/80 bg-surface/80 px-6 py-3 text-sm font-medium text-foreground backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-foreground/30"
            href="/"
          >
            Back home
          </NextLink>
        </div>
      </div>
    </div>
  );
}

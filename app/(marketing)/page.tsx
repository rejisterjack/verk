import { ArrowRightIcon, StarIcon } from "@heroicons/react/24/outline";
import NextLink from "next/link";

import { siteConfig } from "@/config/site";
import { HeroShowcase } from "@/components/landing/hero-showcase";
import { ComparisonMatrix } from "@/components/landing/comparison-matrix";
import { DeployWalkthrough } from "@/components/landing/deploy-walkthrough";
import { McpShowcase } from "@/components/landing/mcp-showcase";
import { FeatureTabs } from "@/components/landing/feature-tabs";
import { TradeoffsCard } from "@/components/landing/tradeoffs-card";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 verk-grain verk-grid">
        <div className="relative z-20 mx-auto max-w-6xl px-6 text-center">
          {/* Eyebrow Badge */}
          <div className="animate-verk-rise inline-flex items-center gap-2 rounded-full border border-separator/80 bg-surface/90 px-3.5 py-1 text-xs font-medium text-foreground backdrop-blur-md shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span>Next.js 16 + Neon Serverless Postgres</span>
            <span className="text-muted/60">|</span>
            <a
              className="flex items-center gap-1 font-mono text-[11px] text-accent hover:underline"
              href={siteConfig.links.github}
              rel="noopener noreferrer"
              target="_blank"
            >
              <StarIcon className="h-3 w-3" />
              <span>Open Source on GitHub</span>
            </a>
          </div>

          {/* Primary Headline */}
          <h1 className="animate-verk-rise-delay-1 mx-auto mt-6 max-w-4xl font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-[4rem] md:leading-[1.1]">
            Linear UX. Vercel deploy.
            <br />
            <span className="bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text">
              Neon database. Free forever.
            </span>
          </h1>

          {/* Subheading */}
          <p className="animate-verk-rise-delay-2 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            A minimal, keyboard-driven project management tracker you can ship
            in under five minutes. No Docker, no VPS maintenance, and native
            Model Context Protocol (MCP) built in for AI coding agents.
          </p>

          {/* Action CTAs */}
          <div className="animate-verk-rise-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <a
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:opacity-95 hover:shadow-xl hover:-translate-y-0.5"
              href={siteConfig.links.deploy}
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 1L24 22H0L12 1Z" />
              </svg>
              Deploy to Vercel
              <ArrowRightIcon className="h-4 w-4" />
            </a>

            <a
              className="inline-flex items-center gap-2 rounded-xl border border-separator/80 bg-surface/80 px-6 py-3.5 text-sm font-medium text-foreground backdrop-blur-md transition-all hover:border-foreground/30 hover:bg-surface hover:-translate-y-0.5"
              href={siteConfig.links.demo}
              rel="noopener noreferrer"
              target="_blank"
            >
              Test Live Demo
            </a>

            <NextLink
              className="inline-flex items-center gap-2 rounded-xl border border-separator/60 px-4 py-3.5 text-xs font-mono text-muted transition-colors hover:text-foreground"
              href="/register"
            >
              Self-Host Locally
            </NextLink>
          </div>

          {/* High-Fidelity Product Window Showcase */}
          <HeroShowcase />
        </div>
      </section>

      {/* 2. THE THIRD PATH / COMPARISON MATRIX */}
      <ComparisonMatrix />

      {/* 3. ZERO-DEVOPS DEPLOY STORY */}
      <DeployWalkthrough />

      {/* 4. THE AGENTIC MCP DIFFERENTIATOR */}
      <McpShowcase />

      {/* 5. THE 80% LINEAR CORE EXPERIENCE */}
      <FeatureTabs />

      {/* 6. ARCHITECTURAL GUARANTEES & TRADEOFFS */}
      <TradeoffsCard />

      {/* 7. HIGH-CONVERTING CLOSING CTA */}
      <section className="relative border-t border-separator/80 py-28 verk-grain overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-accent/10 to-transparent blur-3xl"
        />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
            Ready in 300 Seconds
          </p>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Ship your private tracker tonight
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Open source under MIT. Runs free on Vercel Hobby and Neon serverless
            tiers. Built for the modern stack you already love.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-4 text-base font-semibold text-accent-foreground shadow-xl shadow-accent/25 transition-all hover:opacity-95 hover:-translate-y-0.5"
              href={siteConfig.links.deploy}
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 1L24 22H0L12 1Z" />
              </svg>
              Deploy to Vercel Free
              <ArrowRightIcon className="h-4 w-4" />
            </a>

            <a
              className="inline-flex items-center gap-2 rounded-xl border border-separator/90 bg-surface/80 px-6 py-4 text-base font-medium text-foreground transition-all hover:border-foreground/30 hover:-translate-y-0.5"
              href={siteConfig.links.github}
              rel="noopener noreferrer"
              target="_blank"
            >
              View on GitHub
            </a>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs font-mono text-muted">
            <span>✓ No credit card required</span>
            <span>✓ Serverless Postgres</span>
            <span>✓ MCP for Claude &amp; Cursor</span>
          </div>
        </div>
      </section>
    </div>
  );
}

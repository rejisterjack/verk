"use client";

import { useState } from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  BoltIcon,
  CloudIcon,
  CubeTransparentIcon,
} from "@heroicons/react/24/outline";

import { siteConfig } from "@/config/site";

export function DeployWalkthrough() {
  const [copied, setCopied] = useState(false);
  const sampleConnectionString =
    'DATABASE_URL="postgresql://neondb_owner:npg_x@ep-sparkling-wave.neon.tech/verk?sslmode=require"';

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleConnectionString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      step: "01",
      badge: "60 Seconds",
      icon: CloudIcon,
      title: "Provision Serverless Neon",
      description:
        "Create a free database in Neon with one click. Copy the connection string. Neon auto-scales to zero when idle so you never pay for dormant servers.",
      callout: (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-separator/70 bg-background/80 px-3 py-2 text-xs font-mono">
          <span className="truncate text-muted mr-2">
            DATABASE_URL=&quot;postgresql://...&quot;
          </span>
          <button
            className="flex items-center gap-1 text-accent hover:underline shrink-0 cursor-pointer"
            type="button"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <CheckIcon className="h-3.5 w-3.5 text-success" />
                <span className="text-success">Copied</span>
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      ),
    },
    {
      step: "02",
      badge: "120 Seconds",
      icon: BoltIcon,
      title: "1-Click Deploy to Vercel",
      description:
        "Click the Vercel Deploy button. Paste your Neon URL and an AUTH_SECRET. Vercel provisions the full Next.js App Router project and sets up edge caching.",
      callout: (
        <div className="mt-4">
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90 transition-opacity"
            href={siteConfig.links.deploy}
            rel="noopener noreferrer"
            target="_blank"
          >
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 1L24 22H0L12 1Z" />
            </svg>
            <span>Deploy to Vercel Template</span>
            <ArrowRightIcon className="h-3 w-3" />
          </a>
        </div>
      ),
    },
    {
      step: "03",
      badge: "Instant Live",
      icon: CubeTransparentIcon,
      title: "Auto-Migration & Live",
      description:
        "Prisma executes schema migrations automatically during the build phase. Invite team members by email or connect Cursor via MCP immediately.",
      callout: (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success font-mono">
          <CheckIcon className="h-4 w-4 shrink-0" />
          <span>Prisma migrations complete: 0 errors</span>
        </div>
      ),
    },
  ];

  return (
    <section className="border-t border-separator/80 bg-surface/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
            Zero DevOps Headache
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From zero to a live board in 5 minutes
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">
            The Deploy button is the entire installation story. No Docker
            daemon, no Linux VPS, no recurring cloud bill.
          </p>
        </div>

        {/* 3 Step Flow */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.step}
                className="relative flex flex-col justify-between rounded-2xl border border-separator/80 bg-surface/90 p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-background/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-muted border border-separator/50">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="mt-5 font-display text-xl font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {item.description}
                  </p>
                </div>

                {item.callout}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

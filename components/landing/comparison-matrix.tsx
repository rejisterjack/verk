"use client";

import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

export function ComparisonMatrix() {
  return (
    <section className="border-t border-separator/80 bg-surface/30 py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
            The Third Path
          </p>
          <h2
            className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            id="comparison-heading"
          >
            Why engineering teams choose Verk
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">
            Linear charges $14/month per user. Plane requires Docker, Redis, and
            continuous server babysitting. Verk gives you the same
            keyboard-driven polish on serverless infrastructure you control.
          </p>
        </div>

        {/* Responsive Table Container adhering to modern-web-guidance */}
        <div
          aria-labelledby="comparison-heading"
          className="table-responsive-wrapper mt-12 rounded-2xl border border-separator/80 bg-surface/80 p-1 backdrop-blur-md shadow-lg"
          role="region"
        >
          <table className="comparison-table w-full text-left">
            <thead>
              <tr className="border-b border-separator/70 bg-surface/90 text-xs font-mono uppercase tracking-wider text-muted">
                <th className="py-4 px-6 font-semibold">Dimension</th>
                <th className="py-4 px-6 font-semibold">Linear</th>
                <th className="py-4 px-6 font-semibold">Plane (OSS)</th>
                <th className="py-4 px-6 font-bold text-accent bg-accent/10 border-l border-r border-accent/20">
                  Verk (OSS)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-separator/50 text-sm">
              <tr>
                <th className="py-4 px-6 font-medium text-foreground">
                  Annual Cost (10 devs)
                </th>
                <td
                  className="py-4 px-6 font-mono font-semibold text-danger"
                  data-label="Linear"
                >
                  $1,440 / yr
                </td>
                <td
                  className="py-4 px-6 font-mono text-muted"
                  data-label="Plane (OSS)"
                >
                  ~$120/yr (VPS compute)
                </td>
                <td
                  className="py-4 px-6 font-mono font-bold text-success bg-accent/10 border-l border-r border-accent/20"
                  data-label="Verk"
                >
                  $0 (Vercel & Neon free tier)
                </td>
              </tr>

              <tr>
                <th className="py-4 px-6 font-medium text-foreground">
                  Infrastructure Required
                </th>
                <td className="py-4 px-6 text-muted" data-label="Linear">
                  Proprietary closed cloud
                </td>
                <td className="py-4 px-6 text-danger" data-label="Plane (OSS)">
                  Docker, Redis, VPS, storage
                </td>
                <td
                  className="py-4 px-6 font-semibold text-foreground bg-accent/10 border-l border-r border-accent/20"
                  data-label="Verk"
                >
                  Serverless (Zero server upkeep)
                </td>
              </tr>

              <tr>
                <th className="py-4 px-6 font-medium text-foreground">
                  Time to First Deploy
                </th>
                <td className="py-4 px-6 text-muted" data-label="Linear">
                  Instant (Hosted)
                </td>
                <td className="py-4 px-6 text-muted" data-label="Plane (OSS)">
                  30–60 mins DevOps scripting
                </td>
                <td
                  className="py-4 px-6 font-bold text-accent bg-accent/10 border-l border-r border-accent/20"
                  data-label="Verk"
                >
                  &lt; 5 minutes (1-Click button)
                </td>
              </tr>

              <tr>
                <th className="py-4 px-6 font-medium text-foreground">
                  Native Agent MCP Server
                </th>
                <td className="py-4 px-6" data-label="Linear">
                  <div className="flex items-center gap-1.5 text-muted">
                    <XMarkIcon className="h-4 w-4 text-danger" />
                    <span className="text-xs">Third-party wrapper</span>
                  </div>
                </td>
                <td className="py-4 px-6" data-label="Plane (OSS)">
                  <div className="flex items-center gap-1.5 text-muted">
                    <XMarkIcon className="h-4 w-4 text-danger" />
                    <span className="text-xs">Not supported</span>
                  </div>
                </td>
                <td
                  className="py-4 px-6 bg-accent/10 border-l border-r border-accent/20"
                  data-label="Verk"
                >
                  <div className="flex items-center gap-1.5 text-success font-semibold">
                    <CheckIcon className="h-5 w-5 text-success" />
                    <span className="text-xs">Built into Next.js API</span>
                  </div>
                </td>
              </tr>

              <tr>
                <th className="py-4 px-6 font-medium text-foreground">
                  Database & Data Ownership
                </th>
                <td className="py-4 px-6 text-muted" data-label="Linear">
                  Proprietary lock-in
                </td>
                <td className="py-4 px-6 text-muted" data-label="Plane (OSS)">
                  Self-managed Postgres
                </td>
                <td
                  className="py-4 px-6 font-medium text-foreground bg-accent/10 border-l border-r border-accent/20"
                  data-label="Verk"
                >
                  100% Owned Neon Postgres
                </td>
              </tr>

              <tr>
                <th className="py-4 px-6 font-medium text-foreground">
                  Customization & Stack
                </th>
                <td className="py-4 px-6 text-muted" data-label="Linear">
                  None (Closed source)
                </td>
                <td className="py-4 px-6 text-muted" data-label="Plane (OSS)">
                  Complex multi-service Django/TS
                </td>
                <td
                  className="py-4 px-6 font-semibold text-accent bg-accent/10 border-l border-r border-accent/20"
                  data-label="Verk"
                >
                  Standard Next.js App Router + Prisma
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footnote callout */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>
            * Neon Postgres free tier provides 0.5 GiB storage and serverless
            scale-to-zero.
          </span>
          <span className="font-mono text-accent">
            No credit card needed to deploy
          </span>
        </div>
      </div>
    </section>
  );
}

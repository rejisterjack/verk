"use client";

import {
  ShieldCheckIcon,
  CpuChipIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

export function TradeoffsCard() {
  const tradeoffs = [
    {
      title: "Neon Free Tier Scale-to-Zero",
      tag: "Cold Start Tradeoff",
      body: "Neon Postgres sleeps compute when idle to guarantee a $0 monthly invoice. The very first database query after prolonged inactivity takes ~1.5s to wake. For active teams, it stays hot and responds in under 15ms.",
      icon: CpuChipIcon,
    },
    {
      title: "Vercel Hobby License Boundaries",
      tag: "Licensing Transparency",
      body: "Verk runs flawlessly on Vercel's free Hobby plan for personal, internal, and open-source teams. If you plan to charge your own clients or operate commercially, Vercel's terms require upgrading to their Pro tier.",
      icon: ShieldCheckIcon,
    },
    {
      title: "Ruthless Core Scope",
      tag: "Engineering Philosophy",
      body: "Verk delivers the core 80% of project management: drag-and-drop boards, high-density lists, sprint cycles, and MCP for AI agents. We intentionally do not build 100-page Gantt charts or enterprise timesheets.",
      icon: SparklesIcon,
    },
  ];

  return (
    <section className="border-t border-separator/80 bg-surface/30 py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
            Radical Engineering Honesty
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            Architectural guarantees &amp; tradeoffs
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">
            Trust is earned through transparency. Here is exactly how Verk runs,
            where the limits lie, and why we made these choices.
          </p>
        </div>

        {/* 3 Tradeoff Cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {tradeoffs.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-2xl border border-separator/80 bg-surface/80 p-6 backdrop-blur-sm transition-all hover:border-accent/40"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-background/80 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-muted border border-separator/50">
                    {item.tag}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

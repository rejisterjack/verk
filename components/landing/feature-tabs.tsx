"use client";

import { useState } from "react";
import {
  ViewColumnsIcon,
  QueueListIcon,
  ArrowPathIcon,
  UserGroupIcon,
  CheckCircleIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";

export function FeatureTabs() {
  const [activeTab, setActiveTab] = useState<
    "board" | "list" | "cycles" | "rbac"
  >("board");

  const tabs = [
    { id: "board", label: "Board View", icon: ViewColumnsIcon },
    { id: "list", label: "High-Density List", icon: QueueListIcon },
    { id: "cycles", label: "Sprint Cycles", icon: ArrowPathIcon },
    { id: "rbac", label: "Teams & RBAC", icon: UserGroupIcon },
  ] as const;

  return (
    <section className="border-t border-separator/80 py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
            Uncompromising Focus
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            The 80% of Linear you actually use
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">
            No enterprise bloatware. No convoluted Jira configuration menus.
            Just lightning-fast project tracking engineered for software
            builders.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-accent text-accent-foreground shadow-md font-semibold"
                    : "border border-separator/70 bg-surface/80 text-muted hover:border-foreground/30 hover:text-foreground"
                }`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Feature Display Window */}
        <div className="mt-8 rounded-2xl border border-separator/80 bg-surface/80 p-6 shadow-xl backdrop-blur-xl">
          {/* TAB 1: BOARD VIEW */}
          {activeTab === "board" && (
            <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5 space-y-4">
                <h3 className="font-display text-2xl font-bold text-foreground">
                  Fluid Kanban with zero lag
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Drag issues seamlessly between Backlog, Todo, In Progress, and
                  Done. Built with `@dnd-kit` for 60fps micro-interactions and
                  instant optimistic UI updates.
                </p>
                <ul className="space-y-2 text-xs font-mono text-muted">
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-accent" />
                    <span>Instant column counts and status badges</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-accent" />
                    <span>Per-column sorting and cycle scoping</span>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-7 rounded-xl border border-separator/60 bg-background/90 p-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-surface/50 p-2.5 border border-separator/50">
                    <div className="text-[11px] font-mono text-muted uppercase font-bold mb-2">
                      Todo (2)
                    </div>
                    <div className="rounded bg-background p-2 border border-separator/60 text-xs shadow-xs mb-2">
                      <span className="font-mono text-[9px] text-danger font-semibold">
                        URGENT
                      </span>
                      <p className="text-xs font-medium text-foreground mt-0.5">
                        Fix CORS on /api/mcp
                      </p>
                    </div>
                    <div className="rounded bg-background p-2 border border-separator/60 text-xs shadow-xs">
                      <span className="font-mono text-[9px] text-accent font-semibold">
                        HIGH
                      </span>
                      <p className="text-xs font-medium text-foreground mt-0.5">
                        Write Vercel guide
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface/50 p-2.5 border border-separator/50">
                    <div className="text-[11px] font-mono text-muted uppercase font-bold mb-2">
                      In Progress (1)
                    </div>
                    <div className="rounded bg-background p-2 border border-accent/40 bg-accent/5 text-xs shadow-xs">
                      <span className="font-mono text-[9px] text-accent font-semibold">
                        HIGH
                      </span>
                      <p className="text-xs font-medium text-foreground mt-0.5">
                        List view keyboard shortcuts
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface/50 p-2.5 border border-separator/50">
                    <div className="text-[11px] font-mono text-muted uppercase font-bold mb-2">
                      Done (4)
                    </div>
                    <div className="rounded bg-background p-2 border border-separator/60 text-xs shadow-xs opacity-75">
                      <span className="font-mono text-[9px] text-success font-semibold">
                        DONE
                      </span>
                      <p className="text-xs font-medium text-foreground mt-0.5 line-through">
                        Neon DB connection
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HIGH-DENSITY LIST */}
          {activeTab === "list" && (
            <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5 space-y-4">
                <h3 className="font-display text-2xl font-bold text-foreground">
                  High-density list for rapid triage
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  When you need to scan dozens of issues at high speed. Full
                  keyboard navigation lets you arrow through issues, update
                  priorities with numbers 1–4, and change status instantly.
                </p>
                <div className="rounded-lg bg-background/80 p-3 border border-separator/60 font-mono text-xs text-muted">
                  <span>
                    Protip: Press{" "}
                    <kbd className="rounded bg-surface px-1 border border-separator">
                      j
                    </kbd>{" "}
                    and{" "}
                    <kbd className="rounded bg-surface px-1 border border-separator">
                      k
                    </kbd>{" "}
                    to move selection
                  </span>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-xl border border-separator/60 bg-background/90 divide-y divide-separator/40 font-mono text-xs">
                {[
                  {
                    id: "VRK-01",
                    title: "Setup Next.js 16 App Router",
                    status: "Done",
                    prio: "High",
                  },
                  {
                    id: "VRK-02",
                    title: "Add Auth.js session cookies",
                    status: "Done",
                    prio: "High",
                  },
                  {
                    id: "VRK-03",
                    title: "Implement keyboard navigation",
                    status: "In Progress",
                    prio: "Urgent",
                  },
                  {
                    id: "VRK-04",
                    title: "Connect Claude Code to /api/mcp",
                    status: "Todo",
                    prio: "Urgent",
                  },
                  {
                    id: "VRK-05",
                    title: "Automate Prisma migration in postinstall",
                    status: "Todo",
                    prio: "Med",
                  },
                ].map((row, idx) => (
                  <div
                    key={row.id}
                    className={`flex items-center justify-between p-3 ${idx === 2 ? "bg-accent/10 border-l-2 border-accent" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted text-[11px]">{row.id}</span>
                      <span className="text-foreground font-sans font-medium">
                        {row.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-surface px-2 py-0.5 text-[10px] text-muted border border-separator/50">
                        {row.status}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${row.prio === "Urgent" ? "text-danger" : "text-accent"}`}
                      >
                        {row.prio}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SPRINT CYCLES */}
          {activeTab === "cycles" && (
            <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5 space-y-4">
                <h3 className="font-display text-2xl font-bold text-foreground">
                  Sprint cycles with automated rollover
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Keep your team aligned on 2-week sprint windows. Define start
                  and end dates. Filter the board to the active cycle with one
                  click; uncompleted work gracefully rolls over into the next
                  cycle.
                </p>
                <div className="flex items-center gap-2 text-xs font-mono text-accent">
                  <ArrowPathIcon className="h-4 w-4" />
                  <span>Automatic Cycle Rollover Engine</span>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-xl border border-separator/60 bg-background/90 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-separator/60 pb-3">
                  <div>
                    <h4 className="font-sans font-bold text-sm text-foreground">
                      Cycle 04 (Current Sprint)
                    </h4>
                    <p className="font-mono text-xs text-muted">
                      Oct 20 — Nov 03 (6 days remaining)
                    </p>
                  </div>
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-accent border border-accent/30">
                    Active
                  </span>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-mono text-muted">
                    <span>Sprint Completion</span>
                    <span className="text-foreground font-semibold">68%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface overflow-hidden border border-separator/50">
                    <div
                      className="h-full bg-accent transition-all duration-500"
                      style={{ width: "68%" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="rounded-lg bg-surface/60 p-2 border border-separator/40">
                    <span className="block font-mono text-xs font-bold text-foreground">
                      12
                    </span>
                    <span className="text-[10px] text-muted">Completed</span>
                  </div>
                  <div className="rounded-lg bg-surface/60 p-2 border border-separator/40">
                    <span className="block font-mono text-xs font-bold text-accent">
                      4
                    </span>
                    <span className="text-[10px] text-muted">In Progress</span>
                  </div>
                  <div className="rounded-lg bg-surface/60 p-2 border border-separator/40">
                    <span className="block font-mono text-xs font-bold text-muted">
                      2
                    </span>
                    <span className="text-[10px] text-muted">Remaining</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEAMS & RBAC */}
          {activeTab === "rbac" && (
            <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5 space-y-4">
                <h3 className="font-display text-2xl font-bold text-foreground">
                  Team collaboration with scoped API keys
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Invite teammates by email with Owner, Admin, or Member
                  privileges. Generate team-scoped API tokens with fine-grained
                  permissions for CI/CD pipelines and AI coding agents.
                </p>
                <div className="flex items-center gap-2 text-xs font-mono text-muted">
                  <KeyIcon className="h-4 w-4 text-accent" />
                  <span>Scoped SHA-256 API Key Authorization</span>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-xl border border-separator/60 bg-background/90 p-4 space-y-2">
                <div className="text-xs font-mono font-semibold text-muted mb-2 uppercase">
                  Team Members & Permissions
                </div>
                {[
                  {
                    name: "Rupam (You)",
                    email: "rupam@acme.dev",
                    role: "Owner",
                    color: "bg-accent/20 text-accent",
                  },
                  {
                    name: "Sarah Chen",
                    email: "sarah@acme.dev",
                    role: "Admin",
                    color: "bg-surface text-foreground",
                  },
                  {
                    name: "Claude Coding Agent",
                    email: "claude-agent@mcp",
                    role: "Agent API Key",
                    color: "bg-warning/20 text-warning",
                  },
                ].map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface/40 border border-separator/50 text-xs"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {member.name}
                      </p>
                      <p className="font-mono text-[10px] text-muted">
                        {member.email}
                      </p>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${member.color}`}
                    >
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

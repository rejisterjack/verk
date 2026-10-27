"use client";

import { useState } from "react";
import {
  SparklesIcon,
  CommandLineIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

interface Issue {
  id: string;
  title: string;
  priority: "Urgent" | "High" | "Med" | "Low";
  assignee: string;
  isAgent?: boolean;
  cycle?: string;
}

const initialIssues: Record<string, Issue[]> = {
  Backlog: [
    {
      id: "VRK-18",
      title: "Role-based access & team invitation tokens",
      priority: "Med",
      assignee: "Rupam",
      cycle: "Cycle 4",
    },
    {
      id: "VRK-19",
      title: "Automated Neon database scale-to-zero alerts",
      priority: "Low",
      assignee: "Claude",
      isAgent: true,
      cycle: "Cycle 4",
    },
  ],
  Todo: [
    {
      id: "VRK-06",
      title: "Expose MCP endpoint for Claude Code & Cursor",
      priority: "Urgent",
      assignee: "Claude",
      isAgent: true,
      cycle: "Cycle 4",
    },
    {
      id: "VRK-07",
      title: "One-click Vercel Deploy template with Neon ORM",
      priority: "High",
      assignee: "Rupam",
      cycle: "Cycle 4",
    },
  ],
  "In Progress": [
    {
      id: "VRK-03",
      title: "Keyboard navigation router (G then B, ⌘K)",
      priority: "High",
      assignee: "Rupam",
      cycle: "Cycle 4",
    },
    {
      id: "VRK-12",
      title: "High-density list view with status filter",
      priority: "Med",
      assignee: "Claude",
      isAgent: true,
      cycle: "Cycle 4",
    },
  ],
  Done: [
    {
      id: "VRK-01",
      title: "Next.js App Router full-stack architecture",
      priority: "High",
      assignee: "Rupam",
      cycle: "Cycle 3",
    },
    {
      id: "VRK-02",
      title: "Auth.js v5 credential & session cookies",
      priority: "High",
      assignee: "Rupam",
      cycle: "Cycle 3",
    },
    {
      id: "VRK-05",
      title: "Serverless Prisma schema auto-migrations",
      priority: "Urgent",
      assignee: "Rupam",
      cycle: "Cycle 3",
    },
  ],
};

export function HeroShowcase() {
  const [issues, setIssues] = useState(initialIssues);
  const [activeCycle, setActiveCycle] = useState("Active: Cycle 04 (Sprint)");

  const handleSimulateAgentAdd = () => {
    const newIssue: Issue = {
      id: `VRK-${Math.floor(20 + Math.random() * 80)}`,
      title: "Auto-triaged regression in /api/mcp endpoint",
      priority: "Urgent",
      assignee: "Claude",
      isAgent: true,
      cycle: "Cycle 4",
    };

    setIssues((prev) => ({
      ...prev,
      Todo: [newIssue, ...prev.Todo],
    }));
  };

  return (
    <div className="relative mx-auto mt-10 w-full max-w-5xl">
      {/* Ambient lighting glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-[340px] w-[88%] -translate-x-1/2 rounded-full bg-gradient-to-tr from-accent/25 via-accent/10 to-transparent blur-3xl"
      />

      {/* Main framed container */}
      <div className="relative overflow-hidden rounded-2xl border border-separator/80 bg-surface/90 shadow-2xl backdrop-blur-xl transition-all duration-300">
        {/* App Title Bar / Chrome */}
        <div className="flex h-12 items-center justify-between border-b border-separator/60 px-4 bg-surface/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-danger/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-warning/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-success/80 inline-block" />
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-separator/60 text-xs text-muted">
              <span className="font-semibold text-foreground font-display">
                Verk Workspace
              </span>
              <span className="text-muted/60">/</span>
              <button
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-foreground bg-background/70 border border-separator/50 hover:border-foreground/30 transition-colors cursor-pointer"
                type="button"
                onClick={() =>
                  setActiveCycle((prev) =>
                    prev.includes("04")
                      ? "Active: Cycle 05 (Next Sprint)"
                      : "Active: Cycle 04 (Sprint)",
                  )
                }
              >
                <span>{activeCycle}</span>
                <ChevronDownIcon className="h-3 w-3 text-muted" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-1.5 rounded-md border border-separator/60 bg-background/70 px-2.5 py-1 text-[11px] font-mono text-muted">
              <CommandLineIcon className="h-3.5 w-3.5 text-accent" />
              <span>⌘K Command Menu</span>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-accent border border-accent/25">
              <SparklesIcon className="h-3 w-3 text-accent animate-pulse" />
              <span>MCP Native</span>
            </span>

            <button
              className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
              type="button"
              onClick={handleSimulateAgentAdd}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Agent Issue</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Board Header Utilities */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator/40 bg-background/40 px-5 py-2.5 text-xs text-muted">
          <div className="flex items-center gap-4">
            <span className="font-medium text-foreground">Board View</span>
            <span className="cursor-pointer hover:text-foreground transition-colors">
              List View
            </span>
            <span className="cursor-pointer hover:text-foreground transition-colors hidden sm:inline">
              Cycle Roadmaps
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" /> Filter by:
              Active Sprint
            </span>
            <span className="font-mono text-accent">9 issues</span>
          </div>
        </div>

        {/* Columns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-background/50">
          {Object.entries(issues).map(([colName, colIssues]) => (
            <div
              key={colName}
              className="flex flex-col gap-2 rounded-xl bg-surface/50 border border-separator/60 p-2.5"
            >
              <div className="flex items-center justify-between px-1.5 py-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      colName === "Done"
                        ? "bg-success"
                        : colName === "In Progress"
                          ? "bg-accent"
                          : colName === "Todo"
                            ? "bg-warning"
                            : "bg-muted"
                    }`}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted font-mono">
                    {colName}
                  </span>
                </div>
                <span className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted border border-separator/40">
                  {colIssues.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {colIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="group rounded-lg border border-separator/80 bg-background/90 p-3 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md cursor-default"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-medium text-muted">
                        {issue.id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {issue.isAgent && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-accent">
                            🤖 Agent
                          </span>
                        )}
                        <span
                          className={`font-mono font-semibold text-[10px] ${
                            issue.priority === "Urgent"
                              ? "text-danger"
                              : issue.priority === "High"
                                ? "text-accent"
                                : "text-muted"
                          }`}
                        >
                          {issue.priority}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs font-medium leading-snug text-foreground">
                      {issue.title}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between border-t border-separator/40 pt-2 text-[10px] text-muted">
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <span className="inline-block h-4 w-4 rounded-full bg-surface border border-separator text-center leading-4 font-semibold text-foreground text-[9px]">
                          {issue.assignee[0]}
                        </span>
                        {issue.assignee}
                      </span>
                      {issue.cycle && (
                        <span className="rounded bg-surface px-1.5 py-0.2 font-mono text-[9px] text-muted border border-separator/40">
                          {issue.cycle}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between border-t border-separator/50 bg-surface/70 px-4 py-2 text-[11px] text-muted">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-success animate-ping" />
            <span className="font-mono text-foreground font-medium">
              Neon Postgres Connected
            </span>
            <span className="text-muted/60">|</span>
            <span className="font-mono text-[10px]">
              Latency: 14ms (eu-west-1)
            </span>
          </div>
          <div className="font-mono text-[10px] hidden sm:block text-muted">
            Tip: Press{" "}
            <kbd className="rounded bg-background px-1 py-0.5 border border-separator">
              C
            </kbd>{" "}
            to create issue
          </div>
        </div>
      </div>
    </div>
  );
}

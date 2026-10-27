"use client";

import { useState } from "react";
import {
  SparklesIcon,
  CommandLineIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  ArrowRightIcon,
  PlayIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import NextLink from "next/link";

const configSnippets = {
  cursor: `{
  "mcpServers": {
    "verk": {
      "url": "https://your-verk.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer verk_live_..."
      }
    }
  }
}`,
  claude: `# Add Verk to Claude Code CLI
claude mcp add verk \\
  https://your-verk.vercel.app/api/mcp \\
  --header "Authorization: Bearer verk_live_..."`,
  windsurf: `{
  "mcpServers": {
    "verk": {
      "serverUrl": "https://your-verk.vercel.app/api/mcp",
      "apiKey": "verk_live_..."
    }
  }
}`,
};

export function McpShowcase() {
  const [activeTab, setActiveTab] = useState<"cursor" | "claude" | "windsurf">(
    "cursor",
  );
  const [copied, setCopied] = useState(false);
  const [simStep, setSimStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(configSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimStep(1);

    setTimeout(() => {
      setSimStep(2);
      setTimeout(() => {
        setSimStep(3);
        setIsSimulating(false);
      }, 1200);
    }, 1000);
  };

  return (
    <section className="relative border-t border-separator/80 py-24 overflow-hidden">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Context & Copy */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-mono font-semibold text-accent">
              <SparklesIcon className="h-4 w-4" />
              <span>Native Model Context Protocol (MCP)</span>
            </div>

            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for AI agents.
              <br />
              <span className="text-muted">Not an afterthought.</span>
            </h2>

            <p className="text-base leading-relaxed text-muted sm:text-lg">
              Verk includes a built-in MCP server exposed as a standard Next.js
              API route. Point{" "}
              <span className="text-foreground font-medium">Claude Code</span>,{" "}
              <span className="text-foreground font-medium">Cursor</span>, or{" "}
              <span className="text-foreground font-medium">Windsurf</span> at
              your deployment URL. Your agents can inspect backlogs, assign
              sprint tickets, and mark bugs done without custom plugins.
            </p>

            {/* Config Snippet Switcher */}
            <div className="rounded-xl border border-separator/80 bg-surface/70 p-4">
              <div className="flex items-center justify-between border-b border-separator/50 pb-3">
                <div className="flex gap-2">
                  {(["cursor", "claude", "windsurf"] as const).map((tab) => (
                    <button
                      key={tab}
                      className={`rounded-md px-3 py-1 font-mono text-xs font-medium capitalize transition-colors ${
                        activeTab === tab
                          ? "bg-foreground text-background font-semibold"
                          : "text-muted hover:text-foreground"
                      }`}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button
                  className="flex items-center gap-1 font-mono text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
                  type="button"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <ClipboardDocumentCheckIcon className="h-4 w-4 text-success" />
                      <span className="text-success">Copied</span>
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="h-4 w-4" />
                      <span>Copy Config</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-foreground/90 p-1">
                {configSnippets[activeTab]}
              </pre>
            </div>

            <div>
              <NextLink
                className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
                href="/docs#mcp"
              >
                Read MCP integration specification
                <ArrowRightIcon className="h-4 w-4" />
              </NextLink>
            </div>
          </div>

          {/* Right Column: Live Terminal Simulation */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-separator/80 bg-surface/90 shadow-2xl backdrop-blur-xl overflow-hidden">
              {/* Terminal Titlebar */}
              <div className="flex items-center justify-between border-b border-separator/60 bg-surface px-4 py-3">
                <div className="flex items-center gap-2">
                  <CommandLineIcon className="h-4 w-4 text-accent" />
                  <span className="font-mono text-xs font-semibold text-foreground">
                    agent-session: claude-code
                  </span>
                </div>
                <button
                  className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1 font-mono text-xs font-semibold text-accent-foreground shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  disabled={isSimulating}
                  type="button"
                  onClick={runSimulation}
                >
                  <PlayIcon className="h-3.5 w-3.5" />
                  <span>
                    {isSimulating ? "Executing..." : "Run Agent Simulation"}
                  </span>
                </button>
              </div>

              {/* Console log area */}
              <div className="min-h-[290px] p-5 font-mono text-xs space-y-3 bg-background/80">
                <div className="text-muted">
                  <span className="text-accent font-semibold">$</span> claude
                  &quot;Inspect failing auth test and file an urgent issue in
                  Verk&quot;
                </div>

                <div className="text-muted/80">
                  ⚡ Connected to MCP server at{" "}
                  <span className="text-foreground">/api/mcp</span>
                </div>

                {simStep >= 1 && (
                  <div className="text-foreground transition-all duration-300">
                    &gt; Agent parsed test runner:{" "}
                    <span className="text-danger font-medium">
                      1 failure in auth-session.test.ts
                    </span>
                  </div>
                )}

                {simStep >= 2 && (
                  <div className="rounded-md border border-accent/30 bg-accent/10 p-3 text-accent transition-all duration-300">
                    <div className="font-semibold flex items-center justify-between">
                      <span>🔧 Calling MCP Tool: `verk_create_issue`</span>
                      <span className="text-[10px] uppercase tracking-wider">
                        JSON-RPC 2.0
                      </span>
                    </div>
                    <pre className="mt-2 text-[11px] leading-tight text-foreground/80 overflow-x-auto">
                      {`{
  "title": "Fix Auth.js token expiry clock drift",
  "priority": "Urgent",
  "cycle": "Cycle 4",
  "label": "auth"
}`}
                    </pre>
                  </div>
                )}

                {simStep >= 3 && (
                  <div className="rounded-md border border-success/40 bg-success/10 p-3 text-success transition-all duration-300">
                    <div className="flex items-center justify-between font-semibold">
                      <div className="flex items-center gap-1.5">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>MCP 200 OK — Issue #VRK-44 Created</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted">
                        18ms
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-foreground/80">
                      Issue placed on the Verk Kanban board in &quot;Todo&quot;
                      and assigned to current sprint cycle.
                    </p>
                  </div>
                )}

                {simStep === 0 && (
                  <div className="rounded-lg border border-dashed border-separator/70 p-6 text-center text-muted">
                    Click{" "}
                    <span className="text-accent font-semibold">
                      &quot;Run Agent Simulation&quot;
                    </span>{" "}
                    above to watch Claude interact with the Verk MCP server
                    live.
                  </div>
                )}
              </div>

              {/* Terminal Footer */}
              <div className="border-t border-separator/40 bg-surface px-4 py-2 text-[11px] font-mono text-muted flex items-center justify-between">
                <span>Protocol: Model Context Protocol v1.0</span>
                <span className="text-accent font-semibold">
                  Zero middleware required
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Metadata } from "next";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-12 px-6 py-20">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Getting started
        </h1>
        <p className="mt-3 text-muted">
          From Neon connection string to a live board in under five minutes.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Deploy to Vercel
        </h2>
        <ol className="list-decimal space-y-3 pl-5 text-muted leading-relaxed">
          <li>
            Create a Neon project and copy the pooled{" "}
            <code className="font-mono text-foreground text-sm">
              DATABASE_URL
            </code>{" "}
            and non-pooler{" "}
            <code className="font-mono text-foreground text-sm">
              DIRECT_URL
            </code>
            .
          </li>
          <li>
            Click{" "}
            <a
              className="text-accent font-medium"
              href={siteConfig.links.deploy}
            >
              Deploy to Vercel
            </a>{" "}
            and paste the env vars plus an{" "}
            <code className="font-mono text-foreground text-sm">
              AUTH_SECRET
            </code>
            .
          </li>
          <li>
            Set{" "}
            <code className="font-mono text-foreground text-sm">AUTH_URL</code>{" "}
            to your production URL. Prisma runs{" "}
            <code className="font-mono text-foreground text-sm">
              migrate deploy
            </code>{" "}
            during the build.
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Local development
        </h2>
        <pre className="overflow-x-auto rounded-lg border border-separator bg-surface p-4 font-mono text-sm">{`cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev`}</pre>
        <p className="text-sm text-muted">
          Demo login after seed:{" "}
          <code className="font-mono text-foreground">demo@verk.dev</code> /{" "}
          <code className="font-mono text-foreground">demo1234</code>
        </p>
      </section>

      <section className="space-y-4" id="mcp">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          MCP for AI agents
        </h2>
        <p className="text-muted leading-relaxed">
          Create an API key in Team Settings → API keys, then point your agent
          at{" "}
          <code className="font-mono text-foreground text-sm">
            {"{AUTH_URL}/api/mcp"}
          </code>{" "}
          with{" "}
          <code className="font-mono text-foreground text-sm">
            Authorization: Bearer verk_…
          </code>
          .
        </p>
        <pre className="overflow-x-auto rounded-lg border border-separator bg-surface p-4 font-mono text-sm">{`{
  "mcpServers": {
    "verk": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer verk_your_key"
      }
    }
  }
}`}</pre>
        <p className="text-sm text-muted">
          Tools: <code className="font-mono text-foreground">list_issues</code>,{" "}
          <code className="font-mono text-foreground">get_issue</code>,{" "}
          <code className="font-mono text-foreground">create_issue</code>,{" "}
          <code className="font-mono text-foreground">update_issue</code>,{" "}
          <code className="font-mono text-foreground">list_cycles</code>,{" "}
          <code className="font-mono text-foreground">list_members</code>.
        </p>
      </section>

      <section className="space-y-4" id="offline">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Install &amp; offline
        </h2>
        <p className="text-muted leading-relaxed">
          Verk is a Progressive Web App. After you sign in and open a board once
          online, you can install it (browser install prompt, or iOS Share → Add
          to Home Screen) and keep working on issues without a network.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-muted leading-relaxed">
          <li>
            <strong className="text-foreground">Works offline:</strong> board
            &amp; list reads, create / update / reorder / delete issues (queued
            locally, synced when you reconnect).
          </li>
          <li>
            <strong className="text-foreground">Online only:</strong> auth,
            onboarding, team settings, members, API keys, cycles mutations, MCP.
          </li>
          <li>
            Conflicts use server{" "}
            <code className="font-mono text-foreground text-sm">revision</code>{" "}
            — you choose keep mine or keep server; no silent last-write-wins on
            title/description.
          </li>
          <li>
            Set{" "}
            <code className="font-mono text-foreground text-sm">
              NEXT_PUBLIC_PWA_OFFLINE=false
            </code>{" "}
            to disable the outbox (e.g. public demo). Service worker still
            builds for installability.
          </li>
          <li>
            Neon cold starts still apply when the outbox flushes after idle.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Honest caveats
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-muted leading-relaxed">
          <li>
            Neon free tier sleeps after inactivity — the first request after
            idle can be slow.
          </li>
          <li>
            Vercel Hobby does not allow commercial use; upgrade if you charge
            customers.
          </li>
        </ul>
      </section>
    </article>
  );
}

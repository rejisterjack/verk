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
          Set DATABASE_URL, DIRECT_URL, AUTH_SECRET, and AUTH_URL. A live board in under five minutes.
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
            and set the four required variables:{" "}
            <code className="font-mono text-foreground text-sm">
              DATABASE_URL
            </code>
            ,{" "}
            <code className="font-mono text-foreground text-sm">
              DIRECT_URL
            </code>
            ,{" "}
            <code className="font-mono text-foreground text-sm">
              AUTH_SECRET
            </code>
            , and{" "}
            <code className="font-mono text-foreground text-sm">AUTH_URL</code>
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
          Tools: list_issues, get_issue, create_issue, update_issue,
          list_cycles, list_members, list_projects, create_project,
          update_project, list_labels, add_comment, list_comments,
          delete_comment, add_relation. REST lives under /api/teams.
        </p>
      </section>

      <section className="space-y-4" id="migrate-from-linear">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Moving from Linear
        </h2>
        <p className="text-muted leading-relaxed">
          Verk uses Linear vocabulary (Issues, Cycles, Projects, Triage, Inbox)
          and keyboard habits (⌘K, C to create, G then I for Inbox).
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-muted leading-relaxed">
          <li>
            Open <strong className="text-foreground">Settings → Import</strong>{" "}
            on your team.
          </li>
          <li>
            Export a CSV from Linear (Issues → Export) and upload it, or paste a
            Linear personal API key for a one-shot GraphQL pull.
          </li>
          <li>
            Continue planning in Triage → Cycles → Board. Use Projects to group
            outcomes; pin Saved Views in the sidebar.
          </li>
        </ol>
        <p className="text-sm text-muted">
          CSV import surfaces created/total/errors and maps Labels and Project
          columns. Linear API import pages through results, stops at 2,000
          issues, and maps label and project names. Initiatives and SLA hour
          targets are included. A merged pull request can mark the linked issue
          Done. When GITHUB_TOKEN is set, a status change posts a comment on
          each linked pull request. Verk does not merge pull requests.
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
            &amp; list reads; create / update / reorder / delete issues
            (including estimate, due date, project, and labels); queue comments
            and label assignments (synced when you reconnect).
          </li>
          <li>
            <strong className="text-foreground">Online only:</strong> auth,
            onboarding, team settings, members, API keys, cycles mutations,
            attachments (Blob), webhooks, import, MCP.
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
          <li>
            Settings → Workflow can rename, reorder, and add statuses. The
            five built-in keys still map onto Issue.status; extra keys keep
            their own workflow row.
          </li>
          <li>
            Issue attachments require{" "}
            <code className="font-mono text-foreground text-sm">
              BLOB_READ_WRITE_TOKEN
            </code>
            .
          </li>
        </ul>
      </section>
    </article>
  );
}

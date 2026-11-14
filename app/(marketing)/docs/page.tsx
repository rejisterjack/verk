import { Metadata } from "next";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Docs" };

function DocCard({
  id,
  eyebrow,
  title,
  children,
  className = "",
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-separator/80 bg-surface/80 p-6 backdrop-blur-sm sm:p-8 ${className}`}
      id={id}
    >
      <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <div className="relative overflow-hidden verk-grain verk-grid">
      <article className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <header className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-accent">
            Self-host
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
            Getting started
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Set DATABASE_URL, DIRECT_URL, AUTH_SECRET, and AUTH_URL. A live
            board in under five minutes.
          </p>
        </header>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <DocCard eyebrow="01" title="Deploy to Vercel">
            <ol className="list-decimal space-y-3 pl-5 text-muted leading-relaxed">
              <li>
                Create a Neon project and copy the pooled{" "}
                <code className="font-mono text-sm text-foreground">
                  DATABASE_URL
                </code>{" "}
                and non-pooler{" "}
                <code className="font-mono text-sm text-foreground">
                  DIRECT_URL
                </code>
                .
              </li>
              <li>
                Click{" "}
                <a
                  className="font-medium text-accent"
                  href={siteConfig.links.deploy}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Deploy to Vercel
                </a>{" "}
                and set the four required variables:{" "}
                <code className="font-mono text-sm text-foreground">
                  DATABASE_URL
                </code>
                ,{" "}
                <code className="font-mono text-sm text-foreground">
                  DIRECT_URL
                </code>
                ,{" "}
                <code className="font-mono text-sm text-foreground">
                  AUTH_SECRET
                </code>
                , and{" "}
                <code className="font-mono text-sm text-foreground">
                  AUTH_URL
                </code>
                .
              </li>
              <li>
                Set{" "}
                <code className="font-mono text-sm text-foreground">
                  AUTH_URL
                </code>{" "}
                to your production URL. Prisma runs{" "}
                <code className="font-mono text-sm text-foreground">
                  migrate deploy
                </code>{" "}
                during the build.
              </li>
            </ol>
          </DocCard>

          <DocCard eyebrow="02" title="Local development">
            <pre className="overflow-x-auto rounded-xl border border-separator/70 bg-background/80 p-4 font-mono text-sm text-foreground">{`cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev`}</pre>
            <p className="text-sm leading-relaxed text-muted">
              The seed script loads sample issues into your own database. Sign
              in with an account you create, or with GitHub if you set{" "}
              <code className="font-mono text-foreground">AUTH_GITHUB_ID</code>{" "}
              and{" "}
              <code className="font-mono text-foreground">
                AUTH_GITHUB_SECRET
              </code>
              . The OAuth callback is{" "}
              <code className="font-mono text-foreground">
                {"{AUTH_URL}/api/auth/callback/github"}
              </code>
              . On a private host,{" "}
              <code className="font-mono text-foreground">
                AUTH_ALLOWED_GITHUB
              </code>{" "}
              limits which GitHub accounts can sign in. This site does not
              publish a shared password.
            </p>
          </DocCard>

          <DocCard
            className="lg:col-span-2"
            eyebrow="03"
            id="mcp"
            title="MCP for AI agents"
          >
            <p className="leading-relaxed text-muted">
              Create an API key in Team Settings → API keys, then point your
              agent at{" "}
              <code className="font-mono text-sm text-foreground">
                {"{AUTH_URL}/api/mcp"}
              </code>{" "}
              with{" "}
              <code className="font-mono text-sm text-foreground">
                Authorization: Bearer verk_…
              </code>
              .
            </p>
            <pre className="overflow-x-auto rounded-xl border border-separator/70 bg-background/80 p-4 font-mono text-sm text-foreground">{`{
  "mcpServers": {
    "verk": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer verk_your_key"
      }
    }
  }
}`}</pre>
            <p className="text-sm leading-relaxed text-muted">
              Tools: list_issues, get_issue, create_issue, update_issue,
              list_cycles, list_members, list_projects, create_project,
              update_project, list_labels, add_comment, list_comments,
              delete_comment, add_relation. REST lives under /api/teams.
            </p>
          </DocCard>

          <DocCard
            className="lg:col-span-2"
            eyebrow="04"
            id="migrate-from-linear"
            title="Moving from Linear"
          >
            <p className="leading-relaxed text-muted">
              Verk uses Linear vocabulary (Issues, Cycles, Projects, Triage,
              Inbox) and keyboard habits (⌘K, C to create, G then I for Inbox).
            </p>
            <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-muted">
              <li>
                Open{" "}
                <strong className="text-foreground">Settings → Import</strong>{" "}
                on your team.
              </li>
              <li>
                Export a CSV from Linear (Issues → Export) and upload it, or
                paste a Linear personal API key for a one-shot GraphQL pull.
              </li>
              <li>
                Continue planning in Triage → Cycles → Board. Use Projects to
                group outcomes; pin Saved Views in the sidebar.
              </li>
            </ol>
            <p className="text-sm leading-relaxed text-muted">
              CSV import surfaces created/total/errors and maps Labels and
              Project columns. Linear API import pages through results, stops at
              2,000 issues, and maps label and project names. Initiatives and
              SLA hour targets are included. A merged pull request can mark the
              linked issue Done. When GITHUB_TOKEN is set, a status change posts
              a comment on each linked pull request. Verk does not merge pull
              requests.
            </p>
          </DocCard>

          <DocCard eyebrow="05" id="offline" title="Install & offline">
            <p className="leading-relaxed text-muted">
              Verk is a Progressive Web App. After you sign in and open a board
              once online, you can install it (browser install prompt, or iOS
              Share → Add to Home Screen) and keep working on issues without a
              network.
            </p>
            <ul className="list-disc space-y-2 pl-5 leading-relaxed text-muted">
              <li>
                <strong className="text-foreground">Works offline:</strong>{" "}
                board &amp; list reads; create / update / reorder / delete
                issues (including estimate, due date, project, and labels);
                queue comments and label assignments (synced when you
                reconnect).
              </li>
              <li>
                <strong className="text-foreground">Online only:</strong> auth,
                onboarding, team settings, members, API keys, cycles mutations,
                attachments (Blob), webhooks, import, MCP.
              </li>
              <li>
                Conflicts use server{" "}
                <code className="font-mono text-sm text-foreground">
                  revision
                </code>{" "}
                — you choose keep mine or keep server; no silent last-write-wins
                on title/description.
              </li>
              <li>
                Set{" "}
                <code className="font-mono text-sm text-foreground">
                  NEXT_PUBLIC_PWA_OFFLINE=false
                </code>{" "}
                to disable the outbox. The service worker still builds for
                installability.
              </li>
              <li>
                Neon cold starts still apply when the outbox flushes after idle.
              </li>
            </ul>
          </DocCard>

          <DocCard eyebrow="06" title="Honest caveats">
            <ul className="list-disc space-y-2 pl-5 leading-relaxed text-muted">
              <li>
                Neon free tier sleeps after inactivity — the first request after
                idle can be slow.
              </li>
              <li>
                Vercel Hobby does not allow commercial use; upgrade if you
                charge customers.
              </li>
              <li>
                Settings → Workflow can rename, reorder, and add statuses. The
                five built-in keys still map onto Issue.status; extra keys keep
                their own workflow row.
              </li>
              <li>
                Issue attachments require{" "}
                <code className="font-mono text-sm text-foreground">
                  BLOB_READ_WRITE_TOKEN
                </code>
                .
              </li>
            </ul>
          </DocCard>
        </div>
      </article>
    </div>
  );
}

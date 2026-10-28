# Verk

**Linear UX, Vercel deploy, Neon database, free forever.**

Minimal project management for solo developers and small teams — issues, cycles, board & list views, team RBAC, and a built-in MCP server so AI agents can work your backlog natively.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frejisterjack%2Fverk&env=DATABASE_URL,DIRECT_URL,AUTH_SECRET,AUTH_URL&envDescription=Neon%20Postgres%20URLs%20and%20Auth.js%20secret&project-name=verk&repository-name=verk)

Demo (fake data): [verk.rejisterjack.com](https://verk.rejisterjack.com)

## Features

- Issues with status, priority, assignee, cycle, project, labels, estimate, and due date
- Cycles with configurable duration; board columns from workflow statuses
- Teams, members, and role-based access (`OWNER` / `ADMIN` / `MEMBER`)
- Board (drag-and-drop) and list views with J/K focus, Space peek, Enter open
- ⌘K command menu with issue search and status/priority/assignee actions
- Inbox (read + snooze), Triage, Projects, milestones, comments, relations, attachments
- Saved views (create/edit/delete/pin) and webhooks (secret shown once)
- Installable PWA with offline issue CRUD plus queued comments and label updates
- Import from Linear (CSV or first-100 API) under Settings → Import
- Built-in MCP server at `/api/mcp`
- One-click Vercel + Neon deploy — **no Docker**

## Demo video (coming soon)

Recording pending — replace this section with a Loom/YouTube link after capture.

Until then: screenshot at [`public/icons/icon-512.png`](public/icons/icon-512.png).

What to record: ⌘K issue search, create with labels/estimate, board DnD, inbox snooze, Settings → Import.

## Quick start (local)

```bash
cp .env.example .env
# Fill DATABASE_URL + DIRECT_URL from Neon, and AUTH_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Seeded demo login: `demo@verk.dev` / `demo1234` · team slug `acme-engineering`

## Deploy checklist

1. Create a Neon project; copy pooled `DATABASE_URL` and direct `DIRECT_URL`.
2. Deploy to Vercel. Set env vars from `.env.example` (at least the Neon + Auth block; add GitHub / Resend / Blob for those features).
3. `vercel-build` runs `prisma migrate deploy` then `next build --webpack`.
4. Sign in (or seed), confirm issues/board, point your domain.

## Environment variables

Copy [`.env.example`](.env.example). Core + integrations for full product surface:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon pooled (app runtime) |
| `DIRECT_URL` | Neon direct (Prisma migrate) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | App origin; OAuth callback base + invite links |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth sign-in (callback: `{AUTH_URL}/api/auth/callback/github`) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Send team invite emails |
| `BLOB_READ_WRITE_TOKEN` | Issue attachments via Vercel Blob |
| `NEXT_PUBLIC_PWA_OFFLINE` | Offline outbox (`true` default; set `false` to disable) |

Prisma runs `migrate deploy` during `npm run build` / Vercel builds.

There is no GitHub PR/commit sync — GitHub env vars are sign-in only. Outbound webhooks are configured in Settings → Webhooks (no extra env).

### Offline / PWA

See [Docs → Offline](/docs#offline). Production builds register a Serwist service worker (`public/sw.js`). Core issue workflows sync via REST with revision-based conflict handling. Comments and label assignments also queue in the outbox when offline.

## MCP

1. Open **Settings → API keys** and create a key (`verk_…`).
2. Point your agent at `{AUTH_URL}/api/mcp` with header `Authorization: Bearer verk_…`.

Example Cursor / Claude config:

```json
{
  "mcpServers": {
    "verk": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer verk_your_key"
      }
    }
  }
}
```

Tools: `list_issues`, `get_issue`, `create_issue`, `update_issue`, `list_cycles`, `list_members`, `list_projects`, `create_project`, `update_project`, `list_labels`, `add_comment`.

Smoke test: `npm run mcp:smoke` (requires `VERK_API_KEY` and `VERK_BASE_URL`).

## Launch QA (manual)

On seeded `acme-engineering` after migrate + seed:

1. ⌘K search `1` → set status via palette  
2. Create issue with project, labels, estimate, due date  
3. Relations: link `#1` as BLOCKS from another issue; remove  
4. Inbox: snooze 1h  
5. Board columns match Settings → Workflow; DnD across columns  
6. Offline: create with estimate → reconnect → verify  
7. Settings → Import page loads  
8. Attachments: without Blob token shows config error; with token uploads  

## Honest caveats

- Neon free tier sleeps after inactivity — the first load after a quiet period is slow.
- Vercel Hobby does not allow commercial use; upgrade if you charge customers.
- Workflow settings can add statuses beyond the five defaults. Extra keys map onto the nearest built-in status type.
- Linear API import pages results and stops at 2,000 issues.
- Offline outbox covers issue CRUD plus comments, labels, estimate, due date, and project.
- Initiatives, SLA hour targets, and a GitHub pull-request mention webhook are included. Full two-way git status sync and native store apps are not. Install Verk from the browser when the install prompt appears.

## Stack

Next.js App Router · HeroUI · Heroicons · Neon Postgres · Prisma · Auth.js · MCP SDK · Vercel Blob · Serwist

## License

MIT

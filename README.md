# Verk

**Linear UX, Vercel deploy, Neon database, free forever.**

Minimal project management for solo developers and small teams — issues, cycles, board & list views, team RBAC, and a built-in MCP server so AI agents can work your backlog natively.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frejisterjack%2Fverk&env=DATABASE_URL,DIRECT_URL,AUTH_SECRET,AUTH_URL&envDescription=Required%3A%20DATABASE_URL%20(Neon%20pooled)%2C%20DIRECT_URL%20(Neon%20direct)%2C%20AUTH_SECRET%2C%20AUTH_URL&project-name=verk&repository-name=verk)

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
- Import from Linear (CSV or API, up to 2,000 issues) under Settings → Import
- Built-in MCP server at `/api/mcp`
- One-click Vercel + Neon deploy — **no Docker**

## Demo

Walk the live demo at [verk.rejisterjack.com](https://verk.rejisterjack.com) (`demo@verk.dev` / `demo1234`): command palette search, create with labels and estimate, board drag, inbox snooze, Settings → Import.

A hosted Loom or YouTube recording of those shots is not published yet. Paste that URL here after capture.

## Quick start (local)

```bash
cp .env.example .env
# Required: DATABASE_URL, DIRECT_URL, AUTH_SECRET, AUTH_URL
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Seeded demo login: `demo@verk.dev` / `demo1234` · team slug `acme-engineering`

## Deploy checklist

1. Create a Neon project; copy pooled `DATABASE_URL` and direct `DIRECT_URL`.
2. Deploy to Vercel. The button asks for the four required variables: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and `AUTH_URL`. Add GitHub, Resend, or Blob from `.env.example` only for those features.
3. `vercel-build` runs `prisma migrate deploy` then `next build --webpack`.
4. Sign in (or seed), confirm issues/board, point your domain.

## Environment variables

Copy [`.env.example`](.env.example). Core + integrations for full product surface:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Required. Neon pooled connection (app runtime) |
| `DIRECT_URL` | Required. Neon direct connection (Prisma migrate) |
| `AUTH_SECRET` | Required. `openssl rand -base64 32` |
| `AUTH_URL` | Required. App origin; OAuth callback base and invite links |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth sign-in (callback: `{AUTH_URL}/api/auth/callback/github`) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Send team invite emails |
| `BLOB_READ_WRITE_TOKEN` | Issue attachments via Vercel Blob |
| `NEXT_PUBLIC_PWA_OFFLINE` | Offline outbox (`true` default; set `false` to disable) |
| `GITHUB_WEBHOOK_SECRET` | HMAC secret for `POST /api/github/webhook` |
| `GITHUB_TOKEN` | Comments on linked pull requests when issue status changes |
| `DEMO_RESET_SECRET` | Header `x-demo-reset-secret` for `POST /api/demo/reset` when `DEMO_MODE=true` |
| `CAPACITOR_SERVER_URL` | Native shell URL. Defaults to `https://verk.rejisterjack.com` |

Prisma runs `migrate deploy` during `npm run build` / Vercel builds.

GitHub sign-in uses `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`. A pull request that mentions `KEY-123` is stored as one GitHub link on that issue (`GITHUB_WEBHOOK_SECRET`). When the issue status changes and `GITHUB_TOKEN` is set, Verk posts a comment on that pull request. Verk does not merge pull requests. Outbound webhooks are configured in Settings → Webhooks.

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
- Initiatives, SLA hour targets, and GitHub pull-request links are included. Status changes comment on linked pull requests when `GITHUB_TOKEN` is set. Verk does not merge pull requests.
- MCP, SCIM, Linear import, the GitHub webhook, and demo reset are limited to 20 requests per minute per server instance. A second instance has its own counter. The 21st request returns 429.
- Native shell: `npm run mobile:sync`, then `npm run mobile:ios` or `npm run mobile:android`. App id `com.rejisterjack.verk`. `CAPACITOR_SERVER_URL` defaults to `https://verk.rejisterjack.com`. Store submission still needs your Apple and Google developer accounts, signing, and privacy listings.

## Stack

Next.js App Router · HeroUI · Heroicons · Neon Postgres · Prisma · Auth.js · MCP SDK · Vercel Blob · Serwist

## License

MIT

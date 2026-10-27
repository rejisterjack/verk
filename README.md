# Verk

**Linear UX, Vercel deploy, Neon database, free forever.**

Minimal project management for solo developers and small teams — issues, cycles, board & list views, team RBAC, and a built-in MCP server so AI agents can work your backlog natively.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frejisterjack%2Fverk&env=DATABASE_URL,DIRECT_URL,AUTH_SECRET,AUTH_URL&envDescription=Neon%20Postgres%20URLs%20and%20Auth.js%20secret&project-name=verk&repository-name=verk)

Demo (fake data): [verk.rejisterjack.com](https://verk.rejisterjack.com)

## Features

- Issues with title, description, status, and priority
- Cycles for sprint planning (start/end dates)
- Teams, members, and role-based access (`OWNER` / `ADMIN` / `MEMBER`)
- Board view (drag-and-drop) and list view
- Installable PWA with offline issue create/update/reorder/delete (IndexedDB + outbox)
- Built-in MCP server at `/api/mcp`
- One-click Vercel + Neon deploy — **no Docker**

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

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon pooled connection string |
| `DIRECT_URL` | Yes | Neon non-pooler URL for migrations |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `AUTH_URL` | Yes | e.g. `http://localhost:3000` or your production URL |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | No | Enables GitHub OAuth |
| `RESEND_API_KEY` | No | Email invites (links always copyable in UI) |
| `EMAIL_FROM` | No | Defaults to Resend onboarding sender |
| `DEMO_MODE` | No | `true` disables team deletion on the public demo |
| `NEXT_PUBLIC_PWA_OFFLINE` | No | Set to `false` to disable offline outbox writes |

Prisma runs `migrate deploy` during `npm run build` / Vercel builds.

### Offline / PWA

See [Docs → Offline](/docs#offline). Production builds register a Serwist service worker (`public/sw.js`). Core issue workflows sync via REST with revision-based conflict handling.



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

Tools: `list_issues`, `get_issue`, `create_issue`, `update_issue`, `list_cycles`, `list_members`.

Smoke test: `npm run mcp:smoke` (requires `VERK_API_KEY` and `VERK_BASE_URL`).

## Honest caveats

- Neon free tier sleeps after inactivity — the first load after a quiet period is slow.
- Vercel Hobby does not allow commercial use; upgrade if you charge customers.
- Verk covers the core 80% of Linear. It is not trying to replace every feature.

## Stack

Next.js App Router · HeroUI · Heroicons · Neon Postgres · Prisma · Auth.js · MCP SDK

## License

MIT

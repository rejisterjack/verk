# Verk — Minimal Project Management for Teams

> Linear-style issue tracking you can deploy to Vercel in minutes—with an MCP server so agents can work the backlog natively.

**Home:** [verk.rejisterjack.com](https://verk.rejisterjack.com)

## One-line idea

A minimal, self-hostable project management app on Next.js and Neon that any team can deploy for free in minutes, including MCP support so AI agents can create and update issues without custom glue code.

## The problem

Best-in-class PM tools charge per seat and add up for small teams. Open-source alternatives like Plane are powerful but painful to self-host (Docker, servers, maintenance). There is a gap: pleasant UX, easy hosting, and no monthly PM tax. Verk targets the core 80%—issues, boards, cycles, teams—with a one-click-style deploy story.

## What Verk does

- Issues with title, description, status, and priority
- Cycles (sprints) with start and end dates
- Teams, members, and role-based access
- Board and list views
- Built-in MCP server for agents to read backlog, create issues, and change status
- Documented Vercel + Neon deploy path

## Who it's for

- Small teams wanting strong PM UX without per-seat SaaS cost
- Developers already on Vercel and Neon
- Teams building AI agents that should interact with a real issue tracker via MCP
- Anyone who tried heavier self-hosted PM tools and wanted something lighter

## How you use it

1. Deploy from the README (Vercel + Neon connection string)
2. Migrations run on deploy (documented postinstall/migrate flow)
3. Invite teammates, create a team, add issues
4. Work in board or list view; group work into cycles
5. Point MCP-capable agents at Verk’s MCP endpoint for automated issue workflows

## How it runs

- Next.js full-stack on Vercel
- Serverless Postgres on Neon
- No separate backend container required
- Local development supported for fully self-managed workflows

## Tech stack

- Next.js App Router (UI + API)
- Neon (Postgres)
- Prisma (ORM, migrations)
- NextAuth (authentication)
- Tailwind CSS
- MCP exposed as Next.js API routes (no extra MCP daemon required)

## Success criteria

- Deploy completes in minutes with only documented env vars
- Issues, statuses, priorities, cycles, and teams work end to end
- Board and list views shipped
- MCP server documented with a working agent example
- README leads with deploy and demo
- Open source at [github.com/rejisterjack/verk](https://github.com/rejisterjack/verk)

## Limitations & non-goals

- Not a feature parity clone of Linear or Jira—scope stays intentionally small
- Neon free tier sleeps; cold starts affect first request after idle
- Vercel Hobby terms restrict commercial use; production businesses may need paid plans
- Ship core workflows before expanding into niche enterprise PM features

## Deployment

| Component | Platform |
|-----------|----------|
| Application | Vercel |
| Database | Neon |
| Migrations | On deploy (documented script) |

Public demo instances should use synthetic data only.

# Verk: Minimal Project Management for Teams

Private doc for me, Rupam. Not for public. Product name: Verk. Home: verk.rejisterjack.com.

## The one-line idea

A minimal, self-hostable project management tool built on Next.js and Neon Postgres that any developer can deploy to Vercel for free in under five minutes, with MCP support so AI agents can create and update issues natively.

## The problem it solves

Linear is the best project management tool available but it costs money, and the cost adds up fast for small teams. Plane is open source and free but self-hosting it requires Docker, a server, and ongoing maintenance. There is no option that is genuinely free, genuinely easy to host, and actually pleasant to use. Verk is that option: clone the repo, set four environment variables (`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`), push to Vercel, done in five minutes.

## What it does

- Issues with titles, descriptions, statuses, and priorities
- Cycles for sprint planning with start and end dates
- Teams and members with role-based access
- Board view and list view for issues
- MCP server built in, so AI agents like Claude can create issues, change statuses, and query the backlog without a custom integration
- One-click Vercel deploy with a Neon Postgres database, free on both platforms

## Who it is for

- Solo developers and small teams who want Linear-quality UX without the monthly bill
- Developers already on Neon and Vercel who want everything in one stack
- Teams building AI agents who want those agents to interact with their project tracker natively via MCP
- Anyone who tried Plane, found it too painful to self-host, and gave up

## How it is used

1. A developer clicks the Deploy to Vercel button in the README, connects their Neon database, and sets one environment variable
2. Vercel runs the schema migration automatically on first deploy
3. They invite teammates by email, create a team, and start adding issues
4. They work through issues on a board or list view, moving them through statuses and grouping them into cycles for sprints
5. If they use AI agents, they point the agent at the built-in MCP server and the agent can read the backlog, create issues, and update statuses without any extra setup

## How I portray it

- One-line pitch: "Linear UX, Vercel deploy, Neon database, free forever."
- Lead with the deploy demo: show the Vercel button, the four required env vars (`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`), and a working board in under two minutes
- Show the MCP integration as the differentiator, since neither Linear's OSS tooling nor Plane does this well
- Position it as infrastructure for developers, not a consumer product
- Be honest that it covers the core 80% of Linear and is not trying to replace every feature

## How it runs

- Deployed on Vercel as a Next.js full-stack app, free on the Hobby plan
- Postgres on Neon, free on the Neon free tier, serverless and sleeps when idle
- No separate backend, no Docker, no server to manage
- The Deploy to Vercel button in the README is the entire install story
- Developers can also clone and run locally with one command for fully self-hosted use

## Tech stack

- Next.js App Router for full-stack, both UI and API routes in one repo
- Neon for serverless Postgres
- Prisma as the ORM, handles migrations automatically on deploy
- NextAuth for authentication
- Tailwind CSS for styling, kept minimal and fast
- MCP server built as a Next.js API route so no extra service is needed

## What done looks like

- A working Deploy to Vercel button that completes in under five minutes with `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and `AUTH_URL` set
- Issues, statuses, priorities, cycles, and teams all working end to end
- Board view and list view
- A working MCP server that an agent can connect to and use
- A clean README with a demo video and the deploy button front and centre
- The repo is open source on GitHub at github.com/rejisterjack/verk

## Honest notes

- This is a crowded category, so the one-click deploy story and the MCP integration are the only real differentiators; without those it is just another CRUD app
- Neon's free tier sleeps after inactivity, so the first load after a quiet period is slow; worth noting in the README
- Vercel Hobby plan does not allow commercial use, so users charging their own customers need to upgrade
- Keep scope tight: ship the core and resist adding features until the basics are rock solid

## Deployment

- Vercel for the Next.js app, free on the Hobby plan
- Neon for Postgres, free on the Neon free tier
- Prisma migrations run automatically on Vercel deploy via a postinstall script
- No Railway needed for this one, the whole stack runs on Vercel and Neon
- Demo at verk.rejisterjack.com uses fake data only

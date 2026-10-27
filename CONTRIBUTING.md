# Contributing to Verk

## Setup

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Checks

```bash
npm run lint
npx tsc --noEmit
npm test
```

## Scope

Keep PRs focused on the core product: issues, cycles, teams/RBAC, board/list, MCP, and the Vercel+Neon deploy story. Avoid adding Docker or unrelated product surface area.

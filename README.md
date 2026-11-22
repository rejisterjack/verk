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
- Archive and restore issues (Issues → Archive); archived issues are deleted for good after 30 days by the daily cron
- Bulk edit: tick rows (shift-click for a range, `x` on the focused row) to set status, priority or assignee, archive, restore or delete up to 200 issues at once
- Sub-issues: an issue has one parent (`Issue.parentId`), up to 8 levels deep, with a progress bar on the parent. Team settings can copy the parent's project, cycle and labels onto new sub-issues, and finish the parent when its last sub-issue is done
- Duplicates: mark an issue as a duplicate of another (it is cancelled and its watchers move to the original); "Similar issues" shows while you type a new title; blocking loops are rejected
- Emoji reactions on comments: any single emoji (picker plus paste-your-own), up to 20 different ones per comment
- Advanced filters: a builder (Issues → Filters) with nested all/any groups over 20 fields (status, priority, assignee, labels, dates such as "due in the next 7 days", blocked, has sub-issues, and more). Apply puts the filter in the URL, "Save as view" stores it. The same filter works in the API (`?filter=<json>`) and in the MCP `list_issues` tool
- Favorites: star an issue, project or cycle (or a saved view) and it appears in your sidebar, where you can reorder items and group them into folders
- Cycle analytics: a burndown chart with an ideal line, scope-creep numbers, a per-assignee split on each cycle, and a velocity chart (planned vs completed, with the average) on the Cycles page. Issues now record when they started, finished or were cancelled, and the daily cron snapshots each running cycle
- Custom workflow statuses (Settings → Workflow): add your own (for example "In review"), recolor, rename, reorder within a type, and delete one by moving its issues to another status of the same type. Every issue always has a workflow status, and its coarse status (backlog, todo, in progress, done, cancelled) follows from the status's type. Also in the API (`/api/teams/{id}/statuses`) and MCP (`list_statuses`, `create_status`, `workflowStatusId` on issues)
- Estimate scales per team (Settings → General): linear (1–5), exponential (1, 2, 4, 8, 16), Fibonacci (1–13), t-shirt (XS–XXL), or off. The new-issue form, the issue page and templates offer that scale, the API rejects values outside it, and issues estimated under an older scale keep their value
- Global search (⌘K palette, `GET /api/teams/{id}/search?q=`, MCP `search`): finds issues (title, description and comments), projects, initiatives, docs, customers, cycles and people. Every word must match; `"quotes"` match a phrase, `-word` excludes, `ENG-12` or `#12` jumps to an issue, and operators narrow issues: `assignee:me`, `creator:`, `status:todo`, `priority:high`, `label:bug`, `project:`, `cycle:current`, and `type:doc` limits the kinds searched. Results rank by title match, then body, then recency
- Keyboard-first editing on the issue list: `J`/`K` move, `X` selects, and `S` (status), `P` (priority) and `A` (assignee) open a type-to-filter picker that applies to the selected issues, or to the focused one when nothing is selected. `G` then a letter still navigates (`G then S` is Settings), and `?` lists every shortcut
- Appearance (Settings → Appearance, also on the account page): light, dark or match-system theme, seven accent colors, comfortable or compact density, and a higher-contrast option. They are personal and saved in the browser, applied before first paint so nothing flashes, and the ⌘K palette can switch the theme
- Timeline (`G then L`, More → Timeline): a Gantt-style chart of projects (start → target date), cycles, releases and initiative targets, with a today marker, month/quarter/year zoom, and earlier/later paging in the URL (`?zoom=quarter&from=2026-01-01`). Projects now have an optional start date, and a start after the target is rejected
- Export (Settings → Export, `GET /api/teams/{id}/export?format=csv|json&archived=1`): every issue with its status, estimate, people, project, cycle, labels, parent and timestamps. Members and above; capped at 20,000 rows; spreadsheet-formula titles are neutralized and the CSV opens cleanly in Excel
- Audit log (Settings → Audit log, admins only; `GET /api/teams/{id}/audit`): records who changed a member's role, removed a member, sent or revoked an invite, created or revoked an API key, created, deleted or toggled a webhook, changed team settings, or downloaded an export. Filter by action and date, page back in time. Entries keep the person's name as it was, never store secrets (only a key's prefix), and the daily cron deletes entries older than a year. Writing the log never blocks the action itself
- Notification preferences (Settings → Notifications): turn off assigned, mentions, comments, status changes or subscription notifications for yourself. Muted types are never created, on any team
- Issue drafts: "Save draft" in the New issue form keeps an unfinished issue (title, description, status, priority, estimate, due date, assignee, cycle, project, milestone, labels) in Drafts, in the sidebar. Resume reopens the form pre-filled, Create issue publishes it through the normal validation, and a published draft is removed. Drafts are private to their author, up to 50 per person per team. Offline, "Save draft" is queued and saved when you reconnect (`GET`/`POST /api/teams/{id}/drafts`). Projects can be created with a start and target date in the form, the API (`startDate`, `targetDate`) and MCP `create_project`
- Attachments: upload several files at once or drag them onto the issue, with image thumbnails and per-file errors. The server checks size (10 MB), allowed type, that the file's real bytes match its type (a script renamed `.png` is refused), 25 files per issue, and cleans the file name; same-named files no longer overwrite each other. Guests can view but not upload, and only the uploader or an admin can delete
- Automations (Settings → Automations, admins only; `GET`/`POST /api/teams/{id}/automations`): "when an issue is created, changes status, is assigned, changes priority or gets a label, and it matches your conditions (status, priority, assignee, label, project, title), do up to five actions": set status, priority, assignee, cycle or project, add or remove a label, add a comment, or notify someone. Conditions use the same filter engine as saved views. Actions are applied straight to the issue, so an automation never triggers another one; a rule that fails is skipped and logged, never blocks the edit; at most 50 rules per team; creating, toggling and deleting are in the audit log
- Two-factor sign-in (Account → Two-factor sign-in): TOTP codes from any authenticator app (RFC 6238, no extra dependency). Setup is a secret plus a confirming code, then ten one-time recovery codes shown once. The password step runs first, so a wrong password never reveals whether an account has 2FA; codes can't be reused within their 30-second step; guesses are limited to 8 per 5 minutes per account; secrets are stored AES-GCM encrypted under `AUTH_SECRET` and recovery codes only as hashes. Turning it off needs your password. Turning 2FA on or off, making new recovery codes, and signing in with a recovery code are written to the audit log of every team the person belongs to. GitHub, Google, SSO and SAML sign-ins rely on their provider's own 2FA
- Passkeys (Account → Passkeys): sign in with a fingerprint, face or device PIN and no password or code (WebAuthn via `@simplewebauthn`). A passkey needs the device plus a local unlock, so it replaces the TOTP step; sign-in checks the signature, the site (`AUTH_URL`), a single-use five-minute challenge and a forward-moving counter. Up to 10 per person; adding and removing are in the audit log. The relying-party id is the host of `AUTH_URL`, so a passkey only works on the site it was made for
- Coding-agent delegation (Settings → Agents; `GET`/`POST /api/teams/{id}/agent/claims`; MCP `claim_issue`, `agent_heartbeat`, `report_result`, `release_issue`): an agent takes a 30-minute lease on an issue (up to 4 hours), becomes the assignee and moves it to In progress, keeps the lease alive with heartbeats and reports back. Two agents can't hold one issue (the take is a compare-and-set), an agent holds at most 5 at once, and if it goes quiet the lease runs out and the issue is free again. A finished claim posts the agent's note as a comment; a failed or released one returns the issue to Todo, unassigned. Admins can take an issue back (audited)
- GitLab: merge requests that mention `ENG-12` link to the issue, opening one starts it, and merging finishes it ("fixes ENG-12", or the team's merge-completes switch) — the same rules as GitHub. Set the team's GitLab project, `GITLAB_WEBHOOK_SECRET`, and add `/api/gitlab/webhook` with the "Merge request events" trigger and that secret as the token
- Privacy and compliance: Account → Your data downloads everything Verk holds about you as JSON (no secrets) and can erase your account (password-confirmed, off on the demo; identity is removed, issues and comments stay as "Deleted user", and a sole owner must hand over or delete the team first). Teams choose how long to keep audit entries (30 days to 2 years, or forever), and admins can download the audit log as CSV. This is tooling, not a certification: SOC 2 and similar are audits of your own processes
- Concurrent document edits: if someone saves a document while you edit it, the two changes are merged by line when they touch different places, and refused with a clear message when they touch the same lines, never silently overwritten. Issues use revision checks with a keep-mine/keep-theirs dialog
- Installed-app shortcuts (New issue, My issues, Inbox) and "Share to Verk": share a link or text from another app to start a pre-filled issue. Verk is PWA-only — install it from the browser instead of maintaining separate desktop or mobile shells
- Issue list display options: group by
 status, priority, assignee, project or cycle, and sort by priority, newest, oldest or title. The choice lives in the URL (`?listGroup=assignee&listSort=priority`) and is saved with a view. Keyboard focus and range-select follow what is on screen
- Roadmap rescheduling: move a project a week earlier or later, or edit its dates, right on the Roadmap page. Saved insight reports: name a builder query, keep it private or share it with the team
- GraphQL API (`POST /api/teams/{id}/graphql`) with the same API-key auth and role checks as REST. Queries: `issue`, `issues`, `projects`, `cycles`, `labels`, `members`, `workflowStatuses`, plus `initiatives`, `releases`, `views`, `documents`, `customers` and `projectDependencies` (these need a `MEMBER` key). Mutations: `createIssue`, `updateIssue`, `addComment`, `createInitiative`, `updateInitiative`, `createRelease`, `setIssueRelease`, `setCustomerValue`, `addProjectDependency`, `removeProjectDependency`. Automations and the audit log are REST and MCP only;
 query depth and size are limited
- OAuth apps (Settings → OAuth apps): authorization-code flow with PKCE (`/oauth/authorize`, `POST /api/oauth/token`). Issued tokens are ordinary scoped API keys tied to the app, so revoking the app revokes them
- Guest access: a guest can be limited to specific projects (Settings → Members). Every issue read path (lists, search, live updates, export, demand) is filtered by that scope
- Generic CSV import (Settings → Import → CSV): upload any CSV, map columns to fields, preview, then import
- AI assist: summaries on issues and triage suggestions (status, priority, labels, assignee). Set `AI_API_KEY` (and optionally `AI_API_URL`, `AI_MODEL`) for an OpenAI-compatible model; without it a keyword/extractive fallback is used. Also in MCP (`summarize_issue`, `suggest_triage`)
- Webhook delivery log (Settings → Webhooks): every delivery with status and response, automatic retries with backoff (a team's overdue retries run whenever it fires another event, and the daily cron sweeps the rest, since Vercel Hobby crons run once a day), manual retry,
 and an SSRF guard that refuses private addresses (set `WEBHOOK_ALLOW_PRIVATE=1` only for local development). Zapier-style REST hooks: `/api/teams/{id}/hooks` (subscribe/unsubscribe, sample payloads)
- Slack link unfurls (needs scopes `links:read`, `links:write`; see `docs/slack-app-manifest.json`) and GitHub PR automation: a PR that says "fixes ENG-12" links, starts and (on merge) closes the issue
- Agent platform: `GET /api/teams/{id}/agent/next` hands a coding agent the next unblocked issue, and `/.well-known/verk-agent.json` describes the endpoints
- Live updates over server-sent events with heartbeat, resume (`Last-Event-ID`), guest scoping and pausing when the tab is hidden
- Languages: English, German, French, Spanish for shared vocabulary, the settings navigation and the list controls (Settings → Appearance); the choice is a cookie. Long-form screens are still English
- Roadmap with rolled-up project progress and computed health; Insights builder (`/t/{slug}/insights/builder`, `GET /api/teams/{id}/insights`) to group and count issues by any dimension
- Document history: every save is a revision with a line diff and restore (Docs → History)
- Ask link (Settings → Ask): a public form at `/ask/{token}` that creates triage issues. Honeypot, link limits and per-visitor and per-team rate limits guard it
- Customer demand (Customers → See demand by issue): open issues ranked by how many different customers asked for them
- Performance: composite indexes on the hot issue queries (team + assignee/project + status), and comment and activity timelines
- Saved views (create/edit/delete/pin) and webhooks (secret shown once)
- Installable PWA with offline issue CRUD plus queued comments and label updates
- Import from Linear (CSV or API, up to 2,000 issues) under Settings → Import
- Built-in MCP server at `/api/mcp`
- One-click Vercel + Neon deploy — **no Docker**

## Demo

The public host [verk.rejisterjack.com](https://verk.rejisterjack.com) is a **shared writable playground** with fake data (`DEMO_MODE=true`). Sign in as `demo@verk.dev` / `demo1234`. Open registration and team deletion are off. Issue/board edits work so you can try the product; data resets daily. Do not put secrets there — self-host for private data.

Walk the demo: command palette search, create with labels and estimate, board drag, inbox snooze, Settings → Import.

Demo clip: [docs/demo.gif](docs/demo.gif).

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
5. `GET /api/health` should return 200 once the app and database are up.
6. Cron routes are `GET /api/cron/cycles` and `GET /api/cron/demo-reset`. Send `Authorization: Bearer $CRON_SECRET`. Without the secret they stay off (404).
7. A private host is a normal deployment: sign-in is required and data stays in your database. `DEMO_MODE=true` is the public demo only. It resets on the demo cron and must not be set on a private host.
8. Turn on Slack with `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN`, SCIM with `SCIM_TOKEN`, AI summaries and triage with `AI_API_KEY`, and git status with `GITHUB_WEBHOOK_SECRET` plus `GITLAB_WEBHOOK_SECRET`. Missing `AI_API_KEY` is a supported setup: summaries fall back to a keyword extract.
9. Microsoft Clarity records sessions only when `NEXT_PUBLIC_CLARITY_PROJECT_ID` is set on the production environment. Leave it empty for a private self-host. The value is read at build time, so a new production deployment is required after setting it. There is no preview deployment.

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
| `GITHUB_TOKEN` | Comments on linked pull requests when issue status changes, and lists open pull requests for an issue's branch |
| `DEMO_RESET_SECRET` | Header `x-demo-reset-secret` for `POST /api/demo/reset` when `DEMO_MODE=true` |
| `CRON_SECRET` | Bearer for the Vercel crons `/api/cron/cycles` and `/api/cron/demo-reset`. Without it both return 404 |
| `INTAKE_TOKEN` | Bearer for `POST /api/teams/{teamId}/intake` (create an issue from an outside form) |
| `EMAIL_INTAKE_TOKEN` | Bearer for `POST /api/teams/{teamId}/email`. Turns inbound email into a triage issue. See [Email intake](#email-intake) |
| `SENTRY_WEBHOOK_SECRET` | Client secret of a Sentry internal integration. Turns on `POST /api/teams/{teamId}/sentry`. See [Sentry](#sentry) |
| `SCIM_TOKEN` | Bearer for `/api/scim/*`. Without it SCIM is off |
| `SAML_IDP_SSO_URL` / `SAML_IDP_CERT` | Turn on SAML single sign-on. See [SAML](#saml-single-sign-on) |
| `SLACK_SIGNING_SECRET` / `SLACK_BOT_TOKEN` | Turn on the Slack app. See [Slack](#slack) |
| `AI_API_KEY` | Turns on `POST /api/agent` and the Triage suggestions button |

Every variable the code reads is listed in [`.env.example`](.env.example).

The Vercel build script (`scripts/vercel-build.mjs`) runs `prisma migrate deploy` before `next build`. It skips the migration when `DIRECT_URL` and `DATABASE_URL` are both empty or point at localhost, so a build without a database still succeeds. Vercel builds only when the git ref is `main`, and that build is production. `postinstall` only runs `prisma generate`.

GitHub sign-in uses `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`. Create a GitHub OAuth App whose callback is `{AUTH_URL}/api/auth/callback/github`. On a private host, set `AUTH_ALLOWED_GITHUB` to a comma-separated list of GitHub usernames or numeric account ids; an empty value leaves sign-up open. A pull request that mentions the team key (`ACM-123` for slug `acme-engineering`) is stored as one GitHub link on that issue (`GITHUB_WEBHOOK_SECRET`, webhook URL `{AUTH_URL}/api/github/webhook`). When the issue status changes and `GITHUB_TOKEN` is set, Verk posts a comment on that pull request that links back to the issue. Verk does not merge pull requests. Outbound webhooks are configured in Settings → Webhooks.

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

Tools (47):

- Issues, read: `list_issues` (pass `archived: true` for the archive), `get_issue`, `list_comments`, `list_sub_issues`, `search`, `find_similar_issues`
- Issues, write: `create_issue`, `update_issue`, `archive_issue`, `restore_issue`, `bulk_update_issues`, `add_comment`, `delete_comment`, `add_relation`, `create_sub_issue`, `set_parent_issue`
- Teams and planning, read: `list_cycles`, `list_members`, `list_projects`, `list_labels`, `list_statuses`, `list_initiatives`
- Teams and planning, write: `create_project`, `update_project`, `create_status`, `create_initiative`, `update_initiative`, `add_project_dependency`, `remove_project_dependency`, `set_customer_value`
- Project dependencies, read: `list_project_dependencies` (also lists scheduling conflicts and the projects ready to start; needs a `MEMBER` key)
- Admin only (an `ADMIN` key, like the settings pages): `list_automations`, `list_audit_log`
- Releases, documents, customers, views: `list_releases`, `create_release`, `set_issue_release`, `list_documents`, `save_document` (pass `baseBody` so a save made in between is merged, not overwritten), `list_customers`, `add_customer_request`, `list_views`. The read tools here need a `MEMBER` key or above, because they can show detail a project-scoped guest must not see
- AI: `summarize_issue`, `suggest_triage`
- Coding-agent delegation: `claim_issue`, `agent_heartbeat`, `report_result`, `release_issue`

Resources: `verk://backlog`, `verk://cycles`.

**Key roles.** Each API key has a role: `GUEST` (read-only), `MEMBER` (the default) or `ADMIN`. A key can never be more powerful than the person who created it, and its power is capped by that person's *current* team role. Demote the creator and their keys weaken at once; remove them from the team, or have SCIM deactivate them, and their keys stop working. Write tools need `MEMBER` or higher. Keys created before roles existed were backfilled to `ADMIN`, so nothing broke. Rotate them to a lower role when you can.

Smoke test: `npm run mcp:smoke` (requires `VERK_API_KEY` and `VERK_BASE_URL`).

`POST /api/agent` is a smaller issue-only agent. It needs `AI_API_KEY` (optional `AI_API_URL`, `AI_MODEL`) and `Authorization: Bearer verk_…` with JSON `{ "teamId", "prompt" }`. It creates or updates issues with the key's own role; `GUEST` keys are refused. Prompts that ask to open or merge a pull request are refused. Bad input returns 400, an unusable model reply 502, and a model that takes longer than 15 seconds 504. MCP remains the fuller tool surface.

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

## CI/CD

Workflows run only on a push to `main`. A pull request, any other branch, a tag push, a schedule, and a manual run do not start CI or CD. The only deploy target is production. Vercel builds only when the git ref is `main`. Lint, typecheck, unit tests, and a production build run on that push. The **Migrate, seed + Playwright** step runs only when repository secret `DATABASE_URL` is set (plus `DIRECT_URL` / `AUTH_SECRET`). Use a throwaway Neon branch: the seed resets the `acme-engineering` demo team. Without those secrets the job still passes, but it prints an "E2E skipped" warning and step summary, so a green check is never mistaken for a tested UI. There is no Docker Postgres in CI.

## SCIM

All `/api/scim/*` routes need `Authorization: Bearer $SCIM_TOKEN` and answer with RFC 7644 `application/scim+json` bodies, including errors.

- **Users.** `GET/POST /Users`, `GET/PUT/PATCH/DELETE /Users/{id}`. `POST` needs only `userName`; add `teamId` to also add a membership. `GET /Users?filter=userName eq "a@b.co"` finds a user. `active:false` (PATCH) or `DELETE` deactivates the user: their sessions, password and OAuth logins, SAML logins and API keys all stop working.
- **Groups.** A group is a Verk team and its `id` is the team id. `GET /Groups` (with `filter=displayName eq "Acme"` and pagination), `GET /Groups/{id}` (lists `members` by user id), `PATCH /Groups/{id}` (RFC 7644 `add`, `remove` and `replace` on `members`, including `members[value eq "<id>"]`), `PUT /Groups/{id}` (replace the member list), and `DELETE /Groups/{id}` (empties the group). `POST /Groups` *links* to an existing team by `displayName` or `externalId`; it never creates a team, because a team needs an owner.
- **Rules.** New members get `MEMBER`; existing members keep their role. **Owners are never removed or demoted**, whatever the IdP sends. Unknown users are skipped, not created. Members match by user id, and by email for older clients. The old `PATCH /Groups?id=<teamId>` form still works.
- Discovery: `GET /ServiceProviderConfig` and `GET /ResourceTypes`.
- Check a live server with `SCIM_TOKEN=... SCIM_TEAM_NAME="Acme" npm run scim:smoke`.

## SAML single sign-on

Built and tested against Google Workspace; any SAML 2.0 IdP that signs its assertions works. Auth.js has no SAML provider, so Verk validates the IdP's response itself (`@node-saml/node-saml`) and hands a 60-second signed ticket to a `saml` credentials provider.

1. In the Google Admin console go to **Apps → Web and mobile apps → Add app → Add custom SAML app**.
2. Copy Google's **SSO URL** and **certificate** into `SAML_IDP_SSO_URL` and `SAML_IDP_CERT` (optionally its **Entity ID** into `SAML_IDP_ISSUER`).
3. Give Google the **ACS URL** `{AUTH_URL}/api/auth/saml/acs` and **Entity ID** `{AUTH_URL}/api/auth/saml/metadata` (the metadata is served at that URL). Set **Name ID format** to `EMAIL` and **Name ID** to the primary email.
4. Turn the app **ON** for your users in Google.
5. Optional: set `SAML_ALLOWED_DOMAINS=acme.com` to accept only your domain.

The login page then shows **Continue with SAML**. A first-time user is created and lands on onboarding. SAML is checked for signature, audience, validity window, `InResponseTo` and replay (assertion and request ids are stored in `SamlSeen`, so a captured response cannot be reused, even across serverless instances). A SCIM-deactivated user cannot sign in. SAML is refused on a private host (`AUTH_ALLOWED_GITHUB`), so that allowlist stays authoritative. With the `SAML_*` variables unset nothing changes.

## Slack

Create the app from [`docs/slack-app-manifest.json`](docs/slack-app-manifest.json) (replace `YOUR-APP.vercel.app` with your `AUTH_URL`). It declares the `/verk` command, the **Create Verk issue** message shortcut, the `app_mention` event and the scopes (`commands`, `chat:write`, `app_mentions:read`, `users:read`, `users:read.email`). Set `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN`.

- **Which team.** In **Team settings → Integrations** enter the Slack workspace id (`T…`) and, optionally, a channel id (`C…`). An exact workspace+channel match wins, then a workspace-wide mapping. `SLACK_TEAM_SLUG` is the fallback when nothing is mapped.
- **Who.** The Slack user is matched to the Verk member with the **same email**, and acts with that member's own role, never as owner. People who aren't team members, and guests, can't create issues.
- **Commands.** `/verk <title>`, `/verk customer:Acme <title>` (also records a customer request), `/verk assign <number> <email>`, `/verk status <number> <status>`.
- **@mention.** `@Verk fix the login bug` creates an issue and replies in the thread. Slack's 3-second retries are ignored, so nothing is created twice.
- **Shortcut.** On any message, **⋯ → Create Verk issue** turns it into an issue with the text and a link back to the message.
- **Notifications.** Creation, assignment, status changes and comments post once to the team's channel (or `SLACK_CHANNEL`) through the bot; without a bot they use the team's incoming webhook. Never both.
- Requests older than 5 minutes are rejected, so a captured signed request cannot be replayed.

## Email intake

Let people email a request straight into triage. Verk does not run a mail server; a provider does, and posts each message to Verk as JSON (Postmark, Resend, SendGrid and Mailgun inbound webhooks all can).

1. Set `EMAIL_INTAKE_TOKEN`. Until it is set the route answers 404.
2. Point the provider's inbound webhook at `POST {AUTH_URL}/api/teams/{teamId}/email` with header `Authorization: Bearer $EMAIL_INTAKE_TOKEN`.
3. A message becomes a backlog issue (so it shows in Triage): the subject is the title (`Re:`/`Fwd:` removed), the body is the description with quoted replies and signatures cut, and the sender is noted at the top. If the sender's company domain matches a customer's domain, the request is recorded against that customer; a new customer is created otherwise. Free webmail domains (gmail.com and similar) never match.
4. Auto-replies, bounces, no-reply senders and mailing-list traffic are dropped (the route answers 200 so the provider does not retry), so two robots cannot loop. A provider retry of the same message id returns the same issue instead of a second one. Limited to 60 requests per minute per IP.

The email body is stored as plain text and shown through the Markdown renderer, which does not run HTML. Attachments are not imported.

## Sentry

Turn a new Sentry error into a triage issue. Create an **internal integration** in Sentry, set its webhook URL to `{AUTH_URL}/api/teams/{teamId}/sentry`, subscribe it to **Issue** (and, if you want alert-rule events, **Event alerts**), and set `SENTRY_WEBHOOK_SECRET` to its client secret. Until it is set the route answers 404.

- Requests are trusted only if `Sentry-Hook-Signature` is the HMAC-SHA256 of the raw body.
- Only `issue` → `created` and `event_alert` are handled; assigned, resolved, comments and metric alerts are ignored with a 200.
- `fatal` → Urgent, `error` → High, `warning` → Medium, anything else Low. The Sentry link is attached to the issue.
- Each Sentry issue id is the idempotency key, so a retry, a repeat alert and the "created" event for the same error make one Verk issue.

## Project dependencies and customer revenue

- **Dependencies.** On a project page, "Depends on" lists the projects that should finish first and "Blocks" lists the ones waiting on it. Loops, duplicates and self-dependencies are refused. The Roadmap shows a banner when a project starts, or is due, before a project it waits on is due, or waits on a cancelled one. API: MCP `list_project_dependencies`, `add_project_dependency`, `remove_project_dependency`; GraphQL `projectDependencies`, `addProjectDependency`, `removeProjectDependency`. There is no drawn dependency graph and no automatic rescheduling.
- **Customer revenue.** Give a customer a tier and annual revenue on the Customers page (or MCP `set_customer_value`, GraphQL `setCustomerValue`). Customer demand can be ranked by breadth (default) or by revenue; each customer counts once per issue however often they asked. Revenue is a number you enter; there is no billing integration.

## Install as an app (PWA only)

Verk has no Electron, iOS, or Android shell to build, sign, and publish separately. Install it from your browser — on desktop or mobile — and it runs in its own app window with the offline outbox and installed-app shortcuts. This keeps one release channel and avoids native store accounts and certificates.

## Honest caveats

- Neon free tier sleeps after inactivity — the first load after a quiet period is slow.
- Vercel Hobby does not allow commercial use; upgrade if you charge customers.
- Workflow settings can add statuses beyond the five defaults. Extra keys map onto the nearest built-in status type.
- Linear API import pages results and stops at 2,000 issues.
- Offline outbox covers issue CRUD plus comments, labels, estimate, due date, and project.
- Initiatives, SLA hour targets, and GitHub pull-request links are included. Status changes comment on linked pull requests when `GITHUB_TOKEN` is set. Verk does not merge pull requests.
- MCP, SCIM, SAML, Linear import, the GitHub webhook, Slack, the issue agent, sign-in and demo reset are limited to 20 requests per minute per client IP (30 for sign-in routes). The counter lives in Postgres, so it is shared by every serverless instance, and the 21st request returns 429. If the database is briefly unreachable the limiter falls back to a per-instance counter instead of failing requests.
- `GET /api/teams/{teamId}/export` downloads the team's issues as CSV or JSON (number, title, description, status, priority, estimate, people, project, cycle, labels, parent, due date and timestamps). It does not include comments, attachments or activity history.
- Releases belong to a pipeline, and each pipeline has its own ordered stages (rename, reorder and delete them on the Releases page). Deleting a stage moves its issues to the first remaining stage.

## Stack

Next.js App Router · HeroUI · Heroicons · Neon Postgres · Prisma · Auth.js · node-saml · MCP SDK · Vercel Blob · Serwist

## License

MIT
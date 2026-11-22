# Ship plan

This is the spec for taking Verk from built to ready for real use. Every feature status is **Not started**. [SHIP_REPORT.md](SHIP_REPORT.md) records earlier live checks. Those checks do not satisfy the ship gates in this document.

## Product summary

Verk is a self-hosted team issue tracker built with Next.js, Prisma, and Neon.
A person registers, accepts an invite, or signs in with a password, GitHub, a passkey, or SAML.
They work inside one team. Guests see only the projects they are given.
Issues move through a workflow, a board, projects, cycles, and a roadmap.
The installed PWA is the desktop and mobile client. There is no native app store shell.
There is no payment system, no Redis, and no Dockerfile.
Slack, SCIM, GitHub, GitLab, Sentry, email intake, and AI stay off until their secrets are set.
Rate limits live in the `RateLimitBucket` table. Sessions are Auth.js cookies.
The operator deploys to Vercel. Production is the `main` branch.
A forgotten password has no in-app reset. Account privacy is export and erasure, not a public legal page.

## Feature inventory

| ID | Feature | Priority | Status | Depends on |
| --- | --- | --- | --- | --- |
| AUTH-01 | Password login | P0 | Not started | — |
| AUTH-02 | Logout | P0 | Not started | AUTH-01 |
| AUTH-03 | Logged-out redirect | P0 | Not started | AUTH-01 |
| AUTH-04 | Register | P1 | Not started | AUTH-01 |
| AUTH-05 | Team invite | P1 | Not started | AUTH-01, AUTH-11 |
| AUTH-06 | Workspace invite | P1 | Not started | AUTH-01 |
| AUTH-07 | GitHub OAuth | P1 | Not started | AUTH-01 |
| AUTH-08 | SAML | P2 | Not started | AUTH-01 |
| AUTH-09 | Passkeys | P1 | Not started | AUTH-01 |
| AUTH-10 | Two-factor | P1 | Not started | AUTH-01 |
| AUTH-11 | Team membership gate | P0 | Not started | AUTH-01 |
| AUTH-12 | Guest project scope | P0 | Not started | AUTH-11 |
| ISSUE-01 | Create and update an issue | P0 | Not started | AUTH-11 |
| ISSUE-02 | Visibility and extra readers | P0 | Not started | ISSUE-01 |
| ISSUE-03 | Issue list, filter, and query | P1 | Not started | ISSUE-01 |
| ISSUE-04 | Board | P1 | Not started | ISSUE-01 |
| ISSUE-05 | Comments | P1 | Not started | ISSUE-01 |
| ISSUE-06 | Sub-issues and relations | P1 | Not started | ISSUE-01 |
| ISSUE-07 | Archive and bulk edit | P1 | Not started | ISSUE-01 |
| ISSUE-08 | Labels, reactions, attachments | P1 | Not started | ISSUE-01, INT-08 |
| ISSUE-09 | Drafts | P1 | Not started | AUTH-11 |
| ISSUE-10 | Search | P1 | Not started | ISSUE-01 |
| ISSUE-11 | Saved views | P1 | Not started | ISSUE-03 |
| PLAN-01 | Projects and milestones | P1 | Not started | AUTH-11 |
| PLAN-02 | Initiatives | P1 | Not started | PLAN-01 |
| PLAN-03 | Cycles and capacity | P1 | Not started | ISSUE-01 |
| PLAN-04 | Calendar and timeline | P1 | Not started | ISSUE-01 |
| PLAN-05 | Roadmap | P1 | Not started | PLAN-02 |
| PLAN-06 | Releases | P1 | Not started | ISSUE-01 |
| PLAN-07 | Documents | P1 | Not started | AUTH-11 |
| PLAN-08 | Customers and demand | P1 | Not started | AUTH-11 |
| PLAN-09 | Dashboards | P1 | Not started | ISSUE-01 |
| PLAN-10 | Insights | P1 | Not started | ISSUE-01 |
| TRIAGE-01 | Triage inbox | P1 | Not started | ISSUE-01 |
| TRIAGE-02 | Automations | P1 | Not started | ISSUE-01 |
| TRIAGE-03 | Public Ask form | P1 | Not started | ISSUE-01 |
| INBOX-01 | Notifications | P1 | Not started | ISSUE-01 |
| OFFLINE-01 | PWA and offline outbox | P1 | Not started | ISSUE-01 |
| DATA-01 | Migrations | P0 | Not started | — |
| DATA-02 | JSON and CSV export | P1 | Not started | AUTH-11, ISSUE-01 |
| DATA-03 | Account export and erasure | P1 | Not started | AUTH-01 |
| DATA-04 | CSV import | P1 | Not started | AUTH-11 |
| API-01 | Health | P0 | Not started | DATA-01 |
| API-02 | Issue REST | P1 | Not started | ISSUE-01, AUTH-11 |
| API-03 | GraphQL | P1 | Not started | ISSUE-01 |
| API-04 | MCP | P1 | Not started | API-05 |
| API-05 | API keys | P1 | Not started | AUTH-11 |
| JOB-01 | Cycle cron | P1 | Not started | PLAN-03 |
| JOB-02 | Demo reset cron | P2 | Not started | DATA-01 |
| JOB-03 | Webhook retry | P1 | Not started | SET-08 |
| AI-01 | Summary and triage without a model key | P2 | Not started | ISSUE-01 |
| INT-01 | GitHub webhook | P2 | Not started | ISSUE-01 |
| INT-02 | GitLab webhook | P2 | Not started | ISSUE-01 |
| INT-03 | Slack | P2 | Not started | AUTH-11 |
| INT-04 | SCIM | P2 | Not started | AUTH-11 |
| INT-05 | Sentry intake | P2 | Not started | ISSUE-01 |
| INT-06 | Email intake | P2 | Not started | ISSUE-01 |
| INT-07 | OAuth apps | P1 | Not started | AUTH-11 |
| INT-08 | File attachments | P1 | Not started | ISSUE-01 |
| SET-01 | Team settings | P1 | Not started | AUTH-11 |
| SET-02 | Members and roles | P1 | Not started | AUTH-11 |
| SET-03 | Workflow | P1 | Not started | AUTH-11 |
| SET-04 | Labels | P1 | Not started | AUTH-11 |
| SET-05 | Notification preferences | P1 | Not started | INBOX-01 |
| SET-06 | Appearance and locale | P1 | Not started | AUTH-01 |
| SET-07 | Audit log | P1 | Not started | AUTH-11 |
| SET-08 | Webhook settings | P1 | Not started | AUTH-11 |
| SET-09 | Agents | P1 | Not started | API-05 |
| SET-10 | Templates | P1 | Not started | ISSUE-01 |
| SEC-01 | Security headers | P0 | Not started | — |
| SEC-02 | Rate limit | P1 | Not started | AUTH-01 |
| I18N-01 | Locales | P1 | Not started | SET-06 |
| OBS-01 | Error and missing pages | P0 | Not started | — |
| ANALYTICS-01 | Clarity production gate | P1 | Not started | SEC-01 |
| SEO-01 | Marketing, robots, sitemap | P2 | Not started | — |
| LEGAL-01 | Public privacy policy and terms | P1 | Not started | — |
| DEVOPS-01 | CI workflow | P1 | Not started | DATA-01 |
| DEVOPS-02 | Production build | P1 | Not started | DEVOPS-01 |
| ABSENT-01 | Payments, Redis, and Docker | P2 | Not started | — |

79 features. P0: 11. P1: 57. P2: 11. LEGAL-01 is P1 because the ship gate requires the pages. The earlier report listed it as P2. P2 is AUTH-08, JOB-02, AI-01, INT-01 through INT-06, SEO-01, and ABSENT-01.

## Gaps

| ID | Gap | Mark | Reason |
| --- | --- | --- | --- |
| GAP-01 | Password reset | BUILD | Register exists in `app/(auth)/register/page.tsx`. No forgot-password route exists. A person who forgets a password has no in-app path. |
| GAP-02 | Public privacy and terms | BUILD | Account export and erasure exist in `lib/services/privacy.ts`. There is no public `/privacy` or `/terms` page. The ship gate requires both. |
| GAP-03 | Content-Security-Policy | BUILD | `next.config.mjs` sets frame, nosniff, referrer, HSTS, and permissions headers. It does not set CSP. Production Clarity must stay allowed. |
| GAP-04 | Docker image | DEFER | Deploy is Vercel via `vercel.json`. The repo has no Dockerfile. A container is not how this product ships. |
| GAP-05 | Payments | DEFER | Customer revenue is a stored number. README states there is no billing integration. |
| GAP-06 | Redis | DEFER | Rate limits use the `RateLimitBucket` table. No Redis client exists. |
| GAP-07 | Guest access to member REST | DEFER | `authenticateRequest` defaults to role MEMBER, so a guest receives 403. The issues page applies `guestIssueScope`. The UI is the guest client. |

## Standard test matrix

Every feature below uses this matrix unless the spec narrows it. P0 and public or auth features run every row. P1 runs the happy path, empty input, wrong role, and one refresh. P2 runs the happy path and records a missing secret as Blocked.

- Happy path with a signed-in member of the demo team.
- Empty, null, missing, and whitespace-only input.
- Boundaries: min and max length, zero, negative, and a huge payload.
- Wrong types, malformed JSON, unicode, emoji, and RTL text.
- Injection: SQL-looking strings, XSS in rendered text, prompt injection where a model is called, path traversal on file names.
- Auth: logged out, wrong team, guest, and another user's record.
- Concurrency: double submit and, where a client mutation id exists, a replay.
- Failure: invalid third-party signature, missing secret, and a database error mapped to a non-500 validation response when the input is bad.
- UI: refresh mid-flow, back button, and a 360px width for the primary screen.
- Do not re-seed the database. Remove records created for the test.

## Per-feature specs

### AUTH-01 Password login

P0. Not started. Files: `app/api/auth/password/route.ts`, `components/auth-form.tsx`, `app/(auth)/login/page.tsx`.

A correct password sets an HttpOnly session cookie and redirects to the callback path when that path starts with a single slash. A wrong, empty, or whitespace password redirects to `/login?error=CredentialsSignin` and the password stays out of the URL. An external callback becomes `/onboarding`. A non-form body redirects instead of returning 500. The 31st attempt from one address in a minute redirects with `error=Throttle`.

Acceptance: session cookie is HttpOnly and SameSite=Lax. Password never appears in the Location header. Throttle trips at 31. Open redirects are dropped.

Depends on nothing. Risk: bcrypt makes a burst of attempts slow. `lib/rate-limit.ts` fails open to memory if the database errors.

### AUTH-02 Logout

P0. Not started. Files: `lib/actions/auth.ts` `logoutAction`, `app/account/page.tsx`, `components/app-sidebar.tsx`.

Sign out clears the session and redirects to `/`. A following request for a team page redirects to login.

Acceptance: after Sign out, `/t/acme-engineering/issues` is not served as the app. Depends on AUTH-01.

### AUTH-03 Logged-out redirect

P0. Not started. File: `proxy.ts` (renamed from middleware).

A signed-out request for `/t/...` redirects to `/login` with a callback URL. `/login`, `/api/health`, and the public Ask page stay reachable.

Acceptance: 307 or 303 to login for a team page, 200 for `/login` and `/api/health`. Depends on AUTH-01.

### AUTH-04 Register

P1. Not started. Files: `app/(auth)/register/page.tsx`, `lib/actions/auth.ts`.

A new email and a password that meets the validator create a user. A duplicate email is rejected. When `AUTH_ALLOWED_GITHUB` is set, password registration stays closed.

Acceptance: duplicate email does not create a second user. Password is hashed. Depends on AUTH-01. Risk: no email verification step was found.

### AUTH-05 Team invite

P1. Not started. Files: `app/(auth)/invite/[token]/page.tsx`, `components/members-settings.tsx`.

An owner or admin creates an invite. The token is stored hashed. Opening the link joins that team with the invited role. A used or unknown token fails closed.

Acceptance: the raw token is not stored. A member cannot invite an owner. Depends on AUTH-01, AUTH-11.

### AUTH-06 Workspace invite

P1. Not started. File: `app/(auth)/invite/workspace/[token]/page.tsx`.

A workspace invite adds the person to the workspace. An unknown token does not create a membership. Depends on AUTH-01.

### AUTH-07 GitHub OAuth

P1. Not started. Files: `lib/actions/auth.ts` `githubSignInAction`, `app/api/auth/[...nextauth]/route.ts`.

GitHub sign-in starts only when `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are set. `AUTH_ALLOWED_GITHUB` limits which accounts may enter. Missing secrets are Blocked, not a failed product.

Acceptance: the OAuth callback is `{AUTH_URL}/api/auth/callback/github`. Depends on AUTH-01.

### AUTH-08 SAML

P2. Not started. Files: `app/api/auth/saml/login/route.ts`, `acs/route.ts`, `metadata/route.ts`, `complete/route.ts`, `lib/saml.ts`.

Login redirects to the IdP. ACS accepts one signed assertion and completes sign-in. Replay of a seen assertion is rejected via `SamlSeen`. Missing SAML env is Blocked.

Acceptance: `safeCallbackPath` rejects protocol-relative and off-site paths. Depends on AUTH-01.

### AUTH-09 Passkeys

P1. Not started. Files: `lib/actions/auth.ts`, passkey ceremony in the account UI.

A signed-in user can register a passkey. Sign-in with that passkey creates a session. A bad assertion returns an error and no session. Depends on AUTH-01.

### AUTH-10 Two-factor

P1. Not started. Files: `components/two-factor-settings.tsx`, `lib/services/two-factor.ts`, `app/api/auth/password/route.ts`.

Enabling 2FA shows the secret once. The next password login without a code redirects to `step=code` and does not put the password in the URL. A wrong code stays on that step. The secret node is masked for Clarity.

Acceptance: do not leave 2FA enabled on the demo user. Depends on AUTH-01. Risk: the TOTP secret is rendered as text, so the mask attribute must stay.

### AUTH-11 Team membership gate

P0. Not started. Files: `lib/api-auth.ts`, `app/t/[teamSlug]/layout.tsx`.

No session on a team API returns 401. A session that is not a member of that team returns 403 on the API and 404 on the team page. A member of the team proceeds.

Acceptance: the demo user cannot read the other team's issues API. Depends on AUTH-01.

### AUTH-12 Guest project scope

P0. Not started. Files: `lib/services/guest-scope.ts`, issue list page.

A guest whose `guestProjectIds` match nothing sees an empty issues page and no issue keys. Issue REST requires MEMBER, so the same guest receives 403 from `GET /api/teams/{id}/issues`. An unlimited guest (empty project list) is not limited by that function.

Acceptance: a scoped guest does not see another project's issue title. The temporary guest is deleted after the test. Depends on AUTH-11. Risk: REST and the page disagree on purpose. See GAP-07.

### ISSUE-01 Create and update an issue

P0. Not started. Files: `lib/services/issues.ts`, `lib/validators/index.ts`, `app/api/teams/[teamId]/issues/route.ts`, `lib/http-error.ts`.

Title is required, trimmed, and at most 200 characters. Empty, whitespace, overlong, and malformed JSON return 400. A valid create returns 201 with the next team number. The same `clientMutationId` returns the same issue. Start date cannot be after the due date.

Acceptance: a probe issue can be created and deleted. Zod failures are 400, not 500. Depends on AUTH-11. Risk: the counter transaction waits 10 seconds and may run 20 (`lib/services/issues.ts`). A longer lock still returns 500. Replay returns 201, the same status as a new create.

### ISSUE-02 Visibility and extra readers

P0. Not started. Files: `lib/services/issues.ts`, `components/issue-editor.tsx`, `IssueReader`.

Visibility is TEAM or RESTRICTED. RESTRICTED is visible to the creator, the assignee, owners, admins, and listed readers. Setting RESTRICTED writes an audit event. A second member who is none of those does not see the issue.

Acceptance: PATCH `visibility: RESTRICTED` persists. A non-reader member does not receive the title. Depends on ISSUE-01. Risk: this plan's earlier live check did not sign in as a second member.

### ISSUE-03 Issue list, filter, and query

P1. Not started. Files: `lib/issue-filter.ts`, `lib/issue-query.ts`, `components/issues-list-client.tsx`.

`status:TODO` compiles to the filter tree. Invalid text returns 400. A JSON filter starting with `{` uses `parseFilter`. Saved `filterJson` is either flat or `{ version: 2, filter }`. The offline cache must not replace a server-filtered list (`keepServerList`).

Acceptance: a text query keeps the filtered rows after hydration. Depends on ISSUE-01.

### ISSUE-04 Board

P1. Not started. File: `app/t/[teamSlug]/board/page.tsx`.

Columns follow workflow statuses. Dragging a card changes status. A guest cannot drag. Depends on ISSUE-01.

### ISSUE-05 Comments

P1. Not started. Files: `app/api/teams/[teamId]/issues/[issueId]/comments/route.ts`, `lib/services/comments.ts`.

A member posts a comment. Empty body is rejected. A guest outside the project cannot comment. Nested replies respect the depth limit. Depends on ISSUE-01.

### ISSUE-06 Sub-issues and relations

P1. Not started. Files: sub-issues and relations routes, `lib/services` relation helpers.

A child keeps its parent's team. Relation types are the enum on `IssueRelation` (`fromIssueId`, `toIssueId`). A cycle in parents is rejected. Depends on ISSUE-01.

### ISSUE-07 Archive and bulk edit

P1. Not started. Files: archive route, bulk route.

Archive hides the issue from the default list and restore brings it back. Bulk update rejects an empty id list and does not touch another team's ids. Depends on ISSUE-01.

### ISSUE-08 Labels, reactions, attachments

P1. Not started. Files: labels routes, reactions route, attachments route.

Labels are team-scoped. A reaction toggles. Attachments are covered by INT-08. Depends on ISSUE-01 and INT-08.

### ISSUE-09 Drafts

P1. Not started. Files: `app/t/[teamSlug]/drafts/page.tsx`, drafts route, `IssueDraft`.

A draft is private to its author. Another member does not see it. Publishing creates an issue. Depends on AUTH-11.

### ISSUE-10 Search

P1. Not started. Files: `lib/search.ts`, `lib/services/search.ts`, search route.

A query returns issues, projects, and documents for the team only. An empty query does not dump the whole team. Depends on ISSUE-01.

### ISSUE-11 Saved views

P1. Not started. Files: views routes, command palette save, issues page save.

A text query saves as `{ version: 2, filter }`. Opening the view restores that filter. A member cannot read another team's view. Depends on ISSUE-03.

### PLAN-01 Projects and milestones

P1. Not started. Files: `app/t/[teamSlug]/projects/page.tsx`, `projects/[projectId]/page.tsx`, projects route.

A member creates a project and a milestone. Delete removes the project the caller is allowed to delete. Contributing teams are sibling teams in the same workspace. The contributing-team label is tied to its select. Depends on AUTH-11.

### PLAN-02 Initiatives

P1. Not started. Files: initiatives page and route, `KeyResult`.

Create, update health, and add a key result. A guest is read-only. Depends on PLAN-01.

### PLAN-03 Cycles and capacity

P1. Not started. Files: cycles pages, `lib/capacity.ts`, cycles route.

A cycle has a team point cap. A person's points plus the others cannot exceed that cap. Active cycle is unique per team. Depends on ISSUE-01.

### PLAN-04 Calendar and timeline

P1. Not started. Files: calendar page, timeline page, `lib/services/timeline.ts`.

An issue with a start and due date appears on both dates. Start after due is rejected by `assertStartNotAfterDue`. Depends on ISSUE-01.

### PLAN-05 Roadmap

P1. Not started. File: `app/t/[teamSlug]/roadmap/page.tsx`, `lib/services/roadmap.ts`.

Initiatives and projects render. Reschedule writes the new dates. Depends on PLAN-02.

### PLAN-06 Releases

P1. Not started. Files: releases page and route, `Pipeline`, `Release`, `IssueRelease`.

A release sits on a pipeline stage. Putting an issue on a release is idempotent for the same pair. Depends on ISSUE-01.

### PLAN-07 Documents

P1. Not started. Files: docs pages, `Document`, `DocumentRevision`.

Save writes a revision. History can restore. A guest does not edit. Depends on AUTH-11.

### PLAN-08 Customers and demand

P1. Not started. Files: customers pages, `Customer`, `CustomerRequest`.

A customer has a tier and annual revenue. Demand ranks by breadth or revenue. Revenue is not a charge. Depends on AUTH-11.

### PLAN-09 Dashboards

P1. Not started. Files: dashboards page, `Dashboard`, `DashboardWidget`.

A member saves a dashboard and can mark it shared. A private dashboard is not listed for another member. Depends on ISSUE-01.

### PLAN-10 Insights

P1. Not started. Files: insights pages, `lib/insights.ts`, `lib/flow.ts`.

Created and completed counts match the issues. Cumulative flow and cycle time render. An empty completed set shows an empty cycle time, not an error. Depends on ISSUE-01.

### TRIAGE-01 Triage inbox

P1. Not started. File: `app/t/[teamSlug]/triage/page.tsx`, `TriageRule`.

Backlog issues can be accepted, declined, or snoozed. A title rule suggests a status. Without `AI_API_KEY`, suggestions stay on the keyword path. Depends on ISSUE-01.

### TRIAGE-02 Automations

P1. Not started. Files: automations routes, `lib/automations.ts`.

A rule on `issue.comment_created` runs its action once per comment. Caps are 100 rules, 10 actions, and depth 2. A disabled rule does not run. Depends on ISSUE-01.

### TRIAGE-03 Public Ask form

P1. Not started. Files: `app/ask/[token]/page.tsx`, `lib/services/asks.ts`, ask settings.

The public form creates a backlog issue. The token is stored hashed and shown once. A honeypot and rate limit reject abuse. The revealed link is Clarity-masked.

Acceptance: a missing token is 404. The raw token is not written to the report. Depends on ISSUE-01.

### INBOX-01 Notifications

P1. Not started. Files: inbox page, notifications routes, `NotificationPreference`.

Assignment and mentions create a notification. Mark read and snooze persist. Another user's notification id returns 404. Depends on ISSUE-01.

### OFFLINE-01 PWA and offline outbox

P1. Not started. Files: `app/sw.ts`, `components` install prompt, `lib/offline`.

The service worker caches same-origin assets and does not cache `clarity.ms`. The outbox queues a write while offline and flushes when online. Dev disables the worker. Depends on ISSUE-01.

### DATA-01 Migrations

P0. Not started. Directory: `prisma/migrations`, `prisma/schema.prisma`.

`prisma migrate status` reports the schema up to date. This plan does not re-seed and does not run a destructive reset. Acceptance: status says up to date, and demo data is still present. Depends on nothing.

### DATA-02 JSON and CSV export

P1. Not started. Files: `lib/export.ts`, `lib/services/export.ts`, export route.

JSON and CSV include `startDate` and `dueDate`. A guest export is project-scoped. A logged-out call is 401. Depends on AUTH-11, ISSUE-01.

### DATA-03 Account export and erasure

P1. Not started. Files: `app/api/account/export/route.ts`, `lib/services/privacy.ts`, `components/privacy-settings.tsx`.

Export returns the signed-in user's data only. Erase deletes that user and signs them out. Do not erase the demo user or the operator. Depends on AUTH-01. Risk: erasure is irreversible. The test uses a throwaway user and removes it.

### DATA-04 CSV import

P1. Not started. File: `app/t/[teamSlug]/settings/import/csv/page.tsx`.

A one-row CSV creates one issue. A header-only file creates none. A huge file is rejected. Depends on AUTH-11.

### API-01 Health

P0. Not started. File: `app/api/health/route.ts`.

`GET /api/health` runs `SELECT 1` and returns `{ ok, status, demo, latencyMs }` with 200. A database failure returns 503 and does not include a stack. Depends on DATA-01.

### API-02 Issue REST

P1. Not started. Files: issue routes under `app/api/teams/[teamId]/issues`.

Covered by ISSUE-01 through ISSUE-08. This item checks the handler catalog: auth, status codes, and that another team's id never returns that team's body. Depends on ISSUE-01, AUTH-11.

### API-03 GraphQL

P1. Not started. File: `app/api/teams/[teamId]/graphql/route.ts`, `lib/graphql/schema.ts`.

A session query for one issue returns `startDate`. A logged-out POST is 401. A query cannot cross teams. Depends on ISSUE-01.

### API-04 MCP

P1. Not started. File: `app/api/mcp/route.ts`, `lib/mcp/server.ts`.

Bearer `verk_...` calls the tool list. No key is 401. Rate limit is per IP. The plaintext key is not written into the plan or the report. Depends on API-05.

### API-05 API keys

P1. Not started. Files: API key settings, `lib/services/api-keys.ts`.

Create shows the key once. The node is Clarity-masked. Revoke makes the key fail. A MEMBER cannot create an OWNER key. The key's power drops if the creator is demoted. Depends on AUTH-11.

### JOB-01 Cycle cron

P1. Not started. File: `app/api/cron/cycles/route.ts`.

`GET` with `Authorization: Bearer $CRON_SECRET` rolls cycles that are due. Without the secret the route stays 404. Depends on PLAN-03.

### JOB-02 Demo reset cron

P2. Not started. Files: `app/api/cron/demo-reset/route.ts`, `app/api/demo/reset/route.ts`.

Runs only when demo mode is on. Production with demo mode off does not wipe data. Depends on DATA-01. Risk: never point this at the production database during a test.

### JOB-03 Webhook retry

P1. Not started. File: `lib/services/webhooks.ts`.

A failed delivery is retried with backoff. SSRF guards reject link-local and metadata hosts. Depends on SET-08.

### AI-01 Summary and triage without a model key

P2. Not started. Files: summary route, triage suggestion code.

With no `AI_API_KEY`, summary uses the keyword extract and triage does not auto-apply. A cached summary returns source `cache`. A prompt-injection string in a title is stored as text and not executed. Depends on ISSUE-01.

### INT-01 GitHub webhook

P2. Not started. File: `app/api/github/webhook/route.ts`.

A signed pull request that says `fixes ACM-12` links, starts, and on merge can complete the issue. A bad signature is rejected. Missing `GITHUB_WEBHOOK_SECRET` is Blocked. Depends on ISSUE-01.

### INT-02 GitLab webhook

P2. Not started. File: `app/api/gitlab/webhook/route.ts`.

Same link rules as GitHub, with the GitLab token. A bad token is rejected. Missing secret is Blocked. Depends on ISSUE-01.

### INT-03 Slack

P2. Not started. Files: `app/api/slack/events/route.ts`, `command/route.ts`, `interactivity/route.ts`, `lib/slack.ts`.

Signed events, slash commands, and actions are accepted. A bad signature is rejected. Issue create does not wait on Slack longer than the 4 second abort in `lib/slack.ts`. Missing tokens are Blocked. Depends on AUTH-11.

### INT-04 SCIM

P2. Not started. Files: `app/api/scim/**`.

Bearer `SCIM_TOKEN`. Users can be listed, created, patched, and disabled. Group display name maps through `Team.scimGroupRoles`. Only ADMIN is special. OWNER stays manual. Missing token is 401 and is Blocked as a product secret. Depends on AUTH-11.

### INT-05 Sentry intake

P2. Not started. File: `app/api/teams/[teamId]/sentry/route.ts`, `lib/sentry.ts`.

A verified Sentry payload creates an issue. Severity maps fatal to urgent, error to high, warning to medium, otherwise low. A bad signature is rejected. Depends on ISSUE-01.

### INT-06 Email intake

P2. Not started. File: `app/api/teams/[teamId]/email/route.ts`, `lib/email-intake.ts`.

A verified inbound email creates an issue. Unsigned mail is rejected. Depends on ISSUE-01.

### INT-07 OAuth apps

P1. Not started. Files: `app/oauth/authorize/page.tsx`, `app/api/oauth/token/route.ts`, oauth settings.

Authorization uses PKCE. The client secret is shown once and Clarity-masked. A reused code fails. Depends on AUTH-11.

### INT-08 File attachments

P1. Not started. File: attachments route, Blob token.

Allowed types are png, jpeg, gif, webp, pdf, text, markdown, and zip, max 10 MB. A path like `../secret` does not leave the team prefix. Missing `BLOB_READ_WRITE_TOKEN` is Blocked. Depends on ISSUE-01.

### SET-01 Team settings

P1. Not started. File: `app/t/[teamSlug]/settings/page.tsx`.

An admin saves the team name, timezone, and SLA hours. A member cannot. Clearing SLA hours stores null. Depends on AUTH-11.

### SET-02 Members and roles

P1. Not started. File: members settings page, members route.

Roles are OWNER, ADMIN, MEMBER, GUEST. The last owner cannot be removed. A member cannot promote themselves. Depends on AUTH-11.

### SET-03 Workflow

P1. Not started. Files: workflow page, statuses routes, `lib/required-fields.ts`.

Statuses have a type and optional required fields: assignee, estimate, due date, start date, project, cycle. Moving an issue without a required field is rejected. Depends on AUTH-11.

### SET-04 Labels

P1. Not started. File: labels settings, labels route.

Create, rename, and delete a label. Delete does not delete the issues. Depends on AUTH-11.

### SET-05 Notification preferences

P1. Not started. File: notifications settings, `NotificationPreference`.

The five switches (assigned, mentions, comments, status, subscriptions) persist. Depends on INBOX-01.

### SET-06 Appearance and locale

P1. Not started. Files: appearance page, `lib/i18n.ts`, `lib/appearance.ts`.

Light, dark, and system apply. Locale cookie switches the strings that have translations. Depends on AUTH-01.

### SET-07 Audit log

P1. Not started. Files: audit page, audit routes, `lib/audit.ts`.

Admin sees the log. CSV export respects retention. A member does not. Depends on AUTH-11.

### SET-08 Webhook settings

P1. Not started. Files: webhooks pages and routes.

Create, disable, and delete a webhook. The URL is checked for SSRF. A delivery log shows failures. Depends on AUTH-11.

### SET-09 Agents

P1. Not started. Files: agents page, agent routes, `AgentClaim`.

Claim, heartbeat, report, and release. Reporting completed posts the note and ends the claim. A second release without a claim fails with a clear error. Depends on API-05.

### SET-10 Templates

P1. Not started. File: templates settings, `IssueTemplate`.

A template prefills a new issue. An empty name is rejected. Depends on ISSUE-01.

### SEC-01 Security headers

P0. Not started. File: `next.config.mjs`.

Responses include `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a strict referrer policy, HSTS, and a permissions policy that denies camera, microphone, and geolocation. CSP is GAP-03 and is part of done for this item.

Acceptance: CSP exists and still allows `https://www.clarity.ms` on production only. Depends on nothing.

### SEC-02 Rate limit

P1. Not started. Files: `lib/rate-limit.ts`, `RateLimitBucket`.

Login is 30 per minute per address. MCP defaults to 20 per minute. Over the limit returns a throttle response, not a 500. If the database errors, the limiter fails open to memory and logs that fact. Depends on AUTH-01.

### I18N-01 Locales

P1. Not started. File: `lib/i18n.ts`.

English, German, French, and Spanish switch the translated chrome. Missing keys fall back to English. Depends on SET-06.

### OBS-01 Error and missing pages

P0. Not started. Files: `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`.

An unknown path returns 404 with a way home and no stack trace in production. A render error shows a retry and a digest, not a stack, to the visitor. Depends on nothing.

### ANALYTICS-01 Clarity production gate

P1. Not started. Files: `lib/clarity.ts`, `components/clarity-script.tsx`, `components/clarity-identify.tsx`.

The tag loads only when `NODE_ENV` is production, `VERCEL_ENV` is unset or `production`, and the project id matches `^[a-z0-9]+$`. Identify sends the internal user id and no name or email. Secrets rendered as text stay masked. Depends on SEC-01.

### SEO-01 Marketing, robots, sitemap

P2. Not started. Files: `app/(marketing)`, `app/robots.ts`, `app/sitemap.ts`.

The marketing home, about, and docs pages render. Robots and sitemap respond. Depends on nothing.

### LEGAL-01 Public privacy policy and terms

P1. Not started. This is GAP-02. The pages do not exist yet.

Acceptance: `/privacy` and `/terms` render without sign-in and are linked from the marketing footer and the register page. They describe the self-hosted operator, not a multi-tenant SaaS. Depends on nothing.

### DEVOPS-01 CI workflow

P1. Not started. File: `.github/workflows/ci.yml`.

Pull requests run install, Prisma generate, lint, typecheck, unit tests, and a production webpack build. E2E runs only when a throwaway `DATABASE_URL` secret exists. Depends on DATA-01.

### DEVOPS-02 Production build

P1. Not started. Files: `package.json` scripts, `scripts/vercel-build.mjs`.

`next build` then `next start` serves login, a P0 issue create, and `/api/health`. `NEXT_PUBLIC_*` values are the ones from that build. Depends on DEVOPS-01.

### ABSENT-01 Payments, Redis, and Docker

P2. Not started. Confirmed absent.

Acceptance: the plan and the README say these are out of product. No code is added to invent them. Depends on nothing.

## API catalog

Handlers under `app/api`. Auth is session, bearer API key, cron secret, webhook signature, SCIM token, or public.

| Method | Path | Auth | Success | Error |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/password` | Public | 303 session | 303 credentials or throttle |
| GET, POST | `/api/auth/[...nextauth]` | Public | Auth.js | Provider error |
| GET | `/api/auth/saml/login` | Public | Redirect | Missing config |
| POST | `/api/auth/saml/acs` | Public | 303 | Bad assertion |
| GET | `/api/auth/saml/metadata` | Public | XML | — |
| GET | `/api/auth/saml/complete` | Ticket | 303 | Bad ticket |
| GET | `/api/health` | Public | 200 | 503 |
| GET | `/.well-known/verk-agent.json` | Public | Manifest | — |
| POST | `/api/oauth/token` | Client | Token | Invalid grant |
| GET, POST, DELETE | `/api/mcp` | Bearer key | Tool result | 401, 429 |
| POST | `/api/agent` | Bearer key | Result | 401 |
| GET | `/api/account/export` | Session | Export | 401 |
| POST | `/api/demo/reset` | Demo secret | Reset | 404 when off |
| GET | `/api/cron/cycles` | Cron secret | Rolled | 404 |
| GET | `/api/cron/demo-reset` | Cron secret | Reset | 404 |
| POST | `/api/github/webhook` | Signature | 200 | 401 |
| POST | `/api/gitlab/webhook` | Token | 200 | 401 |
| POST | `/api/slack/events` | Signature | 200 | 401 |
| POST | `/api/slack/command` | Signature | 200 | 401 |
| POST | `/api/slack/interactivity` | Signature | 200 | 401 |
| GET, POST | `/api/scim/Users` | SCIM token | List or user | 401 |
| GET, PATCH, PUT, DELETE | `/api/scim/Users/{id}` | SCIM token | User | 404 |
| GET, POST, PATCH, PUT | `/api/scim/Groups` | SCIM token | Group | 401 |
| GET, PATCH, PUT, DELETE | `/api/scim/Groups/{id}` | SCIM token | Group | 404 |
| GET | `/api/scim/ResourceTypes` | SCIM token | Document | 401 |
| GET | `/api/scim/ServiceProviderConfig` | SCIM token | Document | 401 |
| GET, POST | `/api/teams/{teamId}/issues` | Member | List, 201 | 400, 401, 403 |
| GET, PATCH, DELETE | `/api/teams/{teamId}/issues/{issueId}` | Member | Issue, 204 | 404 |
| GET, POST, DELETE | `.../comments` | Member | Comment | 400 |
| GET, POST | `.../relations` | Member | Relation | 400 |
| DELETE | `.../relations/{relationId}` | Member | 204 | 404 |
| GET, POST, PUT | `.../sub-issues` | Member | Children | 400 |
| POST, DELETE | `.../archive` | Member | Issue | 404 |
| POST | `/api/teams/{teamId}/issues/bulk` | Member | Result | 400 |
| GET, POST, DELETE | `.../attachments` | Member | File | 400 |
| GET, POST, DELETE | `.../links` | Member | Link | 400 |
| POST | `.../reactions` | Member | Reaction | 400 |
| PUT | `.../labels` | Member | Labels | 400 |
| GET | `.../activity` | Member | Activity | 404 |
| GET, POST, DELETE | `.../subscription` | Member | State | 404 |
| GET, POST | `.../presence` | Member | Presence | 401 |
| GET | `.../summary` | Member | Summary | 404 |
| GET | `/api/teams/{teamId}/issues/similar` | Member | List | 401 |
| GET | `/api/teams/{teamId}/issues/sync` | Member | Changes | 401 |
| GET | `/api/teams/{teamId}/export` | Member | File | 401 |
| POST | `/api/teams/{teamId}/graphql` | Member | Data | 400, 401 |
| GET, POST | `/api/teams/{teamId}/projects` | Member | Project | 400 |
| GET, POST | `.../projects/{projectId}/updates` | Member | Update | 400 |
| GET, POST, PATCH, DELETE | `/api/teams/{teamId}/initiatives` | Member | Initiative | 400 |
| GET, POST | `/api/teams/{teamId}/cycles` | Member | Cycle | 400 |
| GET, POST, PUT | `/api/teams/{teamId}/releases` | Member | Release | 400 |
| GET, POST | `/api/teams/{teamId}/views` | Member | View | 400 |
| PATCH, DELETE | `.../views/{viewId}` | Member | View | 404 |
| GET, POST, PATCH, DELETE | `/api/teams/{teamId}/labels` | Member | Label | 400 |
| GET, POST, PUT | `/api/teams/{teamId}/statuses` | Admin | Status | 403 |
| PATCH, DELETE | `.../statuses/{statusId}` | Admin | Status | 404 |
| GET, POST | `/api/teams/{teamId}/automations` | Admin | Rule | 400 |
| PATCH, DELETE | `.../automations/{id}` | Admin | Rule | 404 |
| GET, POST | `/api/teams/{teamId}/webhooks` | Admin | Hook | 400 |
| PATCH, DELETE | `.../webhooks/{id}` | Admin | Hook | 404 |
| GET, POST, DELETE | `/api/teams/{teamId}/hooks` | Bearer | Delivery | 401 |
| GET | `/api/teams/{teamId}/members` | Member | List | 401 |
| GET, PATCH | `/api/teams/{teamId}/notifications` and `/{id}` | Member | List | 404 |
| GET | `/api/teams/{teamId}/search` | Member | Results | 401 |
| GET | `/api/teams/{teamId}/insights` | Member | Report | 401 |
| GET, POST | `/api/teams/{teamId}/drafts` | Member | Draft | 400 |
| GET | `/api/teams/{teamId}/events` | Member | Stream | 401 |
| GET | `/api/teams/{teamId}/audit` | Admin | Log | 403 |
| GET | `.../audit/export` | Admin | CSV | 403 |
| GET, POST | `/api/teams/{teamId}/agent/claims` | Bearer | Claim | 401 |
| GET | `.../agent/next` | Bearer | Issue | 401 |
| GET | `/api/teams/{teamId}/pulls` | Member | Pulls | 401 |
| POST | `/api/teams/{teamId}/intake` | Public token | Issue | 429 |
| POST | `/api/teams/{teamId}/email` | Signature | Issue | 401 |
| POST | `/api/teams/{teamId}/sentry` | Signature | Issue | 401 |

Exact admin versus member minimums must be confirmed against `authenticateRequest` on each route during that feature's test. Where this table says Admin, the test asserts a MEMBER receives 403.

## Execution order

| Step | ID | Why here | Effort |
| --- | --- | --- | --- |
| 1 | AUTH-01 | Every later session depends on login | S |
| 2 | AUTH-02 | Proves the session can end | S |
| 3 | AUTH-03 | Proves team pages are closed | S |
| 4 | AUTH-11 | Proves team isolation before any write | S |
| 5 | ISSUE-01 | The core write path | M |
| 6 | AUTH-12 | Guest scope needs a team and an issue | M |
| 7 | ISSUE-02 | Restricted reads sit on create | M |
| 8 | DATA-01 | Confirm migrations before more writes | S |
| 9 | API-01 | Health before calling the deploy ready | S |
| 10 | SEC-01 | Headers, including the CSP gap | M |
| 11 | OBS-01 | 404 and 500 must be safe before more UI | S |
| 12 | LEGAL-01 | Required for GO, and it does not exist yet | S |
| 13 | AUTH-04 | Register after login is understood | M |
| 14 | AUTH-10 | 2FA changes the login step | M |
| 15 | AUTH-09 | Passkeys share the login page | M |
| 16 | AUTH-07 | OAuth needs the provider secret or is Blocked | S |
| 17 | AUTH-05 | Invites need roles | M |
| 18 | AUTH-06 | Workspace invite after team invite | S |
| 19 | SET-02 | Roles before other admin screens | M |
| 20 | ISSUE-03 | List and filters | M |
| 21 | ISSUE-04 | Board uses the same issues | M |
| 22 | ISSUE-05 | Comments | M |
| 23 | ISSUE-06 | Sub-issues and relations | M |
| 24 | ISSUE-07 | Archive and bulk | M |
| 25 | SET-04 | Labels before applying them | S |
| 26 | INT-08 | Attachments | M |
| 27 | ISSUE-08 | Labels, reactions, files | M |
| 28 | ISSUE-09 | Drafts | S |
| 29 | ISSUE-10 | Search | M |
| 30 | ISSUE-11 | Saved views need filters | S |
| 31 | SET-10 | Templates | S |
| 32 | PLAN-01 | Projects | M |
| 33 | PLAN-02 | Initiatives | M |
| 34 | PLAN-03 | Cycles | M |
| 35 | PLAN-04 | Calendar and timeline | S |
| 36 | PLAN-05 | Roadmap | S |
| 37 | PLAN-06 | Releases | M |
| 38 | PLAN-07 | Documents | M |
| 39 | PLAN-08 | Customers | M |
| 40 | PLAN-09 | Dashboards | S |
| 41 | PLAN-10 | Insights | M |
| 42 | TRIAGE-01 | Triage inbox | M |
| 43 | TRIAGE-02 | Automations | M |
| 44 | TRIAGE-03 | Public Ask | M |
| 45 | INBOX-01 | Notifications | M |
| 46 | SET-05 | Notification preferences | S |
| 47 | API-05 | Keys before MCP and agents | M |
| 48 | API-02 | Rest of the issue API | M |
| 49 | API-03 | GraphQL | M |
| 50 | API-04 | MCP | L |
| 51 | SET-09 | Agent claims | M |
| 52 | INT-07 | OAuth apps | M |
| 53 | DATA-02 | Export | S |
| 54 | DATA-04 | CSV import | S |
| 55 | DATA-03 | Account export, then a throwaway erase | M |
| 56 | SET-01 | Team settings | S |
| 57 | SET-03 | Workflow | M |
| 58 | SET-07 | Audit | S |
| 59 | SET-08 | Webhooks | M |
| 60 | JOB-03 | Retry | M |
| 61 | JOB-01 | Cycle cron | S |
| 62 | SEC-02 | Rate limits | S |
| 63 | SET-06 | Appearance | S |
| 64 | I18N-01 | Locales | S |
| 65 | OFFLINE-01 | PWA | M |
| 66 | ANALYTICS-01 | Clarity gate | S |
| 67 | DEVOPS-01 | CI | S |
| 68 | DEVOPS-02 | Production build | M |
| 69 | SEO-01 | Marketing pages | S |
| 70 | AI-01 | Keyword fallback | S |
| 71 | INT-01 | GitHub, or Blocked | S |
| 72 | INT-02 | GitLab, or Blocked | S |
| 73 | INT-03 | Slack, or Blocked | S |
| 74 | INT-04 | SCIM, or Blocked | M |
| 75 | INT-05 | Sentry, or Blocked | S |
| 76 | INT-06 | Email, or Blocked | S |
| 77 | AUTH-08 | SAML, or Blocked | M |
| 78 | JOB-02 | Demo reset, only on a throwaway database | S |
| 79 | ABSENT-01 | Confirm the three absences in the README | S |

GAP-01 password reset is built after AUTH-04 and before GO. It is not a separate inventory row yet. When it is built it becomes AUTH-13.

## Ship gates

GO requires all of the following.

- Every P0 row has been executed and marked Passed in SHIP_REPORT.md, with the command and the result.
- GAP-01, GAP-02, and GAP-03 are built, or GO stays NO-GO.
- P1 rows are Passed or explicitly deferred in an update to this plan.
- P2 rows with a missing secret are Blocked, not Passed.
- `npm test`, lint, and `tsc --noEmit` are green. CI on the pull request is green.
- A production build (`next build` and `next start`) serves login, issue create, and `/api/health`.
- Security: no secrets in the client bundle, cookies HttpOnly, team APIs reject logged-out and cross-team calls, rate limits return a throttle response, file uploads reject the disallowed types, webhook signatures are required.
- OWASP checks that apply: broken access control (AUTH-11, AUTH-12, ISSUE-02), cryptographic storage of invite tokens and API keys, injection on issue text, security misconfiguration (SEC-01), vulnerable components recorded from `npm audit` without `--force`, authentication failures (AUTH-01), and SSRF on webhooks.
- Login and the issues list checked at 360 and 1440. Keyboard reaches Sign in, the issue title, and Sign out. Visible labels exist on those controls.
- README setup commands match the commands that were run. `.env.example` lists every variable the app reads, including `NEXT_PUBLIC_CLARITY_PROJECT_ID`.
- `/privacy` and `/terms` exist and are linked.
- Health is monitored at `GET /api/health`. Rollback is redeploying the previous Vercel production deployment. Backups are the Neon project's point-in-time restore, written as an operator step.
- Docker is not a gate. GAP-04 stays deferred.

## Risks

- The issue counter transaction can still 500 if the lock is held longer than 20 seconds (`lib/services/issues.ts`).
- Validation is 400 only for Zod errors (`lib/http-error.ts`). Unexpected exceptions are a generic 500.
- Replaying a client mutation id returns 201.
- Guest REST is 403 while the page is scoped. Testers must not call that a guest data leak, and must not call the 403 a filtered list.
- Login rate limit fails open to memory when Postgres errors (`lib/rate-limit.ts`).
- No Content-Security-Policy yet.
- The dev 404 HTML can include the Next overlay. Production must be checked separately.
- Demo reset against the production database would destroy data. JOB-02 is last and only against a throwaway database.
- `npm audit` may report issues outside Next. Do not use `npm audit fix --force` as a ship step.

## Assumptions

- The local `.env` uses the same Neon database as production. Later tests must not re-seed it.
- User-facing capabilities are the 79 features. HTTP handlers are catalogued under the API section and are not extra features.
- This document's status column stays Not started even where SHIP_REPORT.md already has evidence. Re-running a row under this spec is what moves it to Passed.
- LEGAL-01 is P1 because the ship gate requires the pages.
- Guests are expected to use the pages, not the member REST API.
- A missing optional secret blocks that integration. It does not fail the product.
- Password reset will be added as AUTH-13 when GAP-01 is built. It is not in the 79 until the code exists.

## Open questions

- Should password reset email through Resend, or is an admin reset enough for the first self-hosted operators? Assumption: email reset is required before GO because register is public unless `AUTH_ALLOWED_GITHUB` closes it.
- Should CSP be report-only for one deploy? Assumption: enforce it, with `https://www.clarity.ms` allowed only when the production gate loads the tag.
- Is Neon point-in-time restore the accepted backup, or does the operator also want a logical dump? Assumption: point-in-time restore is the backup plan, documented in the README, not a new job.

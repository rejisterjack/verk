# Ship report

## Product Summary

Verk is a self-hosted issue tracker with Linear-style planning for solo developers and small teams, deployed as a Next.js app on Vercel with Postgres on Neon.
The people who use it are team owners, admins, members, and project-scoped guests, plus API clients: API keys, MCP, GraphQL, SCIM, Slack, and coding agents.
A person registers or signs in, creates or joins a team, and works issues on a list or a board through statuses, cycles, and projects.
Teammates comment, triage, plan on the roadmap, and read an in-app inbox. Agents and webhooks can do the same work through the API when their secrets are set.
There is no payment system. GitHub, GitLab, Slack, SAML, inbound email, Sentry, and the model key stay off until their environment variables are set.

## Feature Table

Every status is NOT STARTED. Result columns are empty until a later test pass. This table matches the Ship Readiness Report canvas.

| ID | Feature | Priority | Status | Bugs Found | Bugs Fixed | UI Issues Fixed | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DATA-01 | Database schema and migrations | P0 | PASSED | 0 | 0 | 0 | Fresh Docker Postgres took all 43 migrations. Status up to date. Second and parallel deploys no-op. Unreachable host exits 1. Read-only role fails on a fresh database (permission denied). Empty and localhost URLs skip migrate. |
| DATA-02 | Neon and Prisma runtime client | P0 | PASSED | 1 | 1 | 0 | Localhost uses the TCP driver. Neon hosts stay on the Neon adapter. Health 200, down 503, issues list shows seeded rows. |
| DEVOPS-01 | Environment configuration | P0 | PASSED | 0 | 0 | 0 | Every process.env name is in .env.example or is a platform variable. Slack is 404 while unset. Cron is 401 without the bearer and 200 with it. |
| DEVOPS-02 | Production build and Vercel deploy | P0 | PASSED | 0 | 0 | 0 | next build --webpack succeeded. sw.js, manifest, and icon exist. No Dockerfile. Localhost skips migrate. A Neon-shaped URL invokes migrate first. |
| DEVOPS-03 | GitHub Actions CI | P1 | PASSED | 0 | 0 | 0 | Workflow runs lint, tsc, vitest, and next build. E2E only when DATABASE_URL is set. Local tsc, vitest 651, and the production build passed. |
| API-01 | Health check | P0 | PASSED | 0 | 0 | 0 | 200 when Postgres is up, 503 when it is stopped, then 200 again. Body is ok, status, demo, latencyMs. Query string is ignored. |
| SEC-01 | Security headers and content security policy | P0 | PASSED | 1 | 1 | 0 | Dev responses omit HSTS so localhost HTTP is not cached as HTTPS-only. Production still sends the one-year preload header. A foreign script host is blocked. |
| AUTH-01 | Email and password registration | P0 | PASSED | 1 | 1 | 0 | A blank name is rejected. A new account lands on Create your team. Demo and private hosts send /register back to login and create nothing. |
| AUTH-02 | Password login and session | P0 | PASSED | 1 | 1 | 0 | Uppercase email signs in and follows a same-site callback. Wrong, empty, and disabled attempts stay on login with CredentialsSignin. An external callback is ignored. A stale session cookie no longer crashes the error overlay. |
| GAP-01 | Password reset | P0 | PASSED | 1 | 1 | 0 | A forgotten password can be replaced from a one-time link. The link expires and cannot be reused. Without Resend the page says email could not be sent and does not show the token. |
| GAP-02 | Change password | P1 | PASSED | 1 | 1 | 0 | The account page replaces the current password. A wrong current password changes nothing. An account with no password shows that there is nothing to change. |
| GAP-03 | Email verification | P1 | BLOCKED | 0 | 0 | 0 | No verify control on the account page. Password signup does not set emailVerified. Needs a verification flow and RESEND_API_KEY. |
| AUTH-03 | Logout | P0 | PASSED | 0 | 0 | 0 | Sidebar and account sign-out both land on /. The next team URL redirects to login. The marketing page has no sign-out control. |
| AUTH-04 | Signed-out and non-member protection | P0 | PASSED | 0 | 0 | 0 | Signed out, a team URL and the account page go to login and return to that path. A missing team is a 404 that does not name the team. |
| AUTH-05 | GitHub OAuth | P1 | BLOCKED | 0 | 0 | 0 | The login page has no GitHub button. Needs AUTH_GITHUB_ID and AUTH_GITHUB_SECRET. |
| AUTH-06 | Google OAuth | P1 | BLOCKED | 0 | 0 | 0 | The login page has no Google button. Needs AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET. |
| AUTH-07 | OIDC single sign-on | P2 | BLOCKED | 0 | 0 | 0 | The login page has no OIDC button. Needs AUTH_OIDC_ISSUER, AUTH_OIDC_CLIENT_ID, and AUTH_OIDC_CLIENT_SECRET. |
| AUTH-08 | SAML single sign-on | P1 | BLOCKED | 0 | 0 | 0 | The login page has no SAML button. Needs SAML_IDP_SSO_URL and SAML_IDP_CERT. |
| AUTH-09 | Two-factor authentication | P1 | BLOCKED | 0 | 0 | 0 | Setup shows a secret and an authenticator link. Confirming the code needs an authenticator app, so two-factor was not turned on. |
| AUTH-10 | Passkeys | P1 | NOT STARTED |  |  |  | WebAuthn sign-in. Up to 10 passkeys. |
| AUTH-11 | Account page | P1 | PASSED | 1 | 1 | 1 | Account shows the profile, password, two-factor, passkeys, data download, appearance, language, and the Acme team. The header offered Log in while signed in. It now says Your teams. |
| GAP-04 | Edit name and email | P1 | BLOCKED | 0 | 0 | 0 | Account shows name and email as text. There are no edit fields. |
| AUTH-12 | Account data export | P1 | NOT STARTED |  |  |  | JSON download of what Verk stores about the signed-in user |
| AUTH-13 | Account erasure | P1 | NOT STARTED |  |  |  | Password-confirmed erase. Demo mode refuses. Sole owners must hand off. |
| AUTH-14 | Demo mode lock | P1 | NOT STARTED |  |  |  | DEMO_MODE blocks registration, team delete, and account erase |
| AUTH-15 | Private host and GitHub allowlist | P1 | NOT STARTED |  |  |  | AUTH_ALLOWED_GITHUB closes password, SAML, Google, and OIDC |
| AUTH-16 | Sign-in rate limit | P0 | NOT STARTED |  |  |  | 30 attempts per minute per IP, shared in Postgres |
| TEAM-01 | Onboarding and team creation | P0 | NOT STARTED |  |  |  | First team after signup |
| TEAM-02 | Team list and switcher | PASSED | 0 | 0 | 0 | Switcher lists Acme Engineering as current. /t opens that team's issues. | Sidebar switcher and /t |
| TEAM-03 | Membership gate and roles | P0 | NOT STARTED |  |  |  | OWNER, ADMIN, MEMBER, GUEST |
| TEAM-04 | Team settings | P1 | NOT STARTED |  |  |  | Name, slug, cycles, estimates, GitHub, GitLab, Slack, SLA, privacy, parent team |
| TEAM-05 | Delete team | P1 | NOT STARTED |  |  |  | Owner only. Blocked on the demo host |
| TEAM-06 | Team invites | P0 | PASSED | 0 | 0 | 0 | Invite created, the link opened the accept page, and revoke removed the pending invite. |
| TEAM-07 | Workspaces and workspace invites | P1 | NOT STARTED |  |  |  | A workspace groups teams. Invites are separate from team invites. |
| TEAM-08 | Members, roles, and guest project scope | P0 | PASSED | 0 | 0 | 0 | Alex Rivera was changed to Admin and back to Member. Remove is on the row. The owner row stays Owner. |
| GAP-05 | Leave a team | P1 | BLOCKED | 0 | 0 | 0 | Members has invite, role, and remove. There is no leave control. |
| ISSUE-01 | Create an issue | P0 | PASSED | 0 | 0 | 0 | New issue created ACM-21 from the dialog and opened on its own page. |
| ISSUE-02 | View and update an issue | P0 | PASSED | 0 | 0 | 0 | The title and priority saved. Reload of the row showed Ship check issue updated and High. Delete removed it. |
| ISSUE-03 | Issue list, my issues, and display options | P0 | PASSED | 1 | 1 | 1 | The list groups by status when listGroup=status. My issues for the demo user correctly says nothing is assigned, instead of telling them to create the first issue. |
| ISSUE-04 | Board | P0 | PASSED | 1 | 1 | 1 | Column titles sat on the first card. Sticky top now stays at the column top, and Backlog, Todo, In Progress, and Done show the issues. |
| ISSUE-05 | Comments | P1 | PASSED | 0 | 0 | 0 | A comment posted, then Delete removed it. The page showed no comments. |
| ISSUE-06 | Sub-issues | PASSED | 0 | 0 | 0 | Ship check child appeared as ACM-22 under ACM-1, with a parent link. Delete removed it. | Parent, up to 8 levels, progress, inherit, auto-close |
| ISSUE-07 | Relations, duplicates, and blocking | PASSED | 0 | 0 | 0 | Related ACM-2 was added on ACM-1. Remove cleared it. | BLOCKS, related, and duplicate. Loops rejected. |
| ISSUE-08 | Archive, restore, and purge | P1 | NOT STARTED |  |  |  | Archive hides an issue. The daily cron deletes it after 30 days. |
| ISSUE-09 | Bulk edit | P1 | NOT STARTED |  |  |  | Up to 200 issues: status, priority, assignee, archive, restore, delete |
| ISSUE-10 | Labels | P1 | PASSED | 0 | 0 | 0 | bug, feature, and polish are listed. Adding shipcheck created it, and Delete removed it. |
| ISSUE-11 | Comment reactions | P2 | PASSED | 0 | 0 | 0 | Thumbs-up on the comment showed 1, you reacted. |
| ISSUE-12 | Attachments | P1 | NOT STARTED |  |  |  | Upload, thumbnails, type sniffing, 10 MB, 25 files |
| ISSUE-13 | External issue links | PASSED | 0 | 0 | 0 | A link to example.com showed on ACM-1. Remove cleared it. | URL links on an issue, separate from git automation |
| ISSUE-14 | Issue activity | PASSED | 0 | 0 | 0 | Activity lists the comment and a description change on ACM-1. | Field history on the issue |
| ISSUE-15 | Issue subscriptions | P1 | NOT STARTED |  |  |  | Watch and unwatch. Drives notifications. |
| ISSUE-16 | Similar issues | P2 | NOT STARTED |  |  |  | Hint while typing a title, and the similar API |
| ISSUE-17 | Advanced filters | P1 | NOT STARTED |  |  |  | Nested all/any groups over the filter fields, in the URL and the API |
| ISSUE-18 | Saved views | PASSED | 0 | 0 | 0 | Saved Ship check view from the issues list. It showed under Settings, Views, and Delete removed it. | Create, edit, delete, pin. Private or shared. |
| ISSUE-19 | Drafts | P1 | PASSED | 0 | 0 | 0 | Saving Ship check draft listed it with Resume and Create issue. Delete returned the page to no drafts. |
| ISSUE-20 | Issue templates | P1 | NOT STARTED |  |  |  | Settings templates prefill the new-issue form |
| ISSUE-21 | Issue visibility and extra readers | P1 | NOT STARTED |  |  |  | TEAM or RESTRICTED, plus explicit readers |
| ISSUE-22 | Required fields | P2 | NOT STARTED |  |  |  | Team rules that block a status change until fields are set |
| ISSUE-23 | Issue presence | P2 | NOT STARTED |  |  |  | Who is viewing the issue |
| ISSUE-24 | Command palette, shortcuts, and peek | P1 | PASSED | 0 | 0 | 0 | Search opens a command menu with go-to commands, create issue, and theme actions. |
| ISSUE-25 | Favorites | PASSED | 0 | 0 | 0 | Add to favorites put ACM-1 in the sidebar. Remove from favorites took it out. | Star issues, projects, cycles, and views. Reorder and folders. |
| ISSUE-26 | Search | P1 | PASSED | 0 | 0 | 0 | Typing Neon in the menu listed ACM-1 Set up Neon database. |
| ISSUE-27 | Live updates | P1 | NOT STARTED |  |  |  | Server-sent events with resume and guest scope |
| ISSUE-28 | Triage | PASSED | 0 | 0 | 0 | Triage lists unassigned backlog issues. Snoozing ACM-14 hid it for an hour, then it returned. | Backlog intake queue |
| ISSUE-29 | Triage rules and suggestions | PASSED | 0 | 0 | 0 | A title rule for shipcheck was added and removed. Suggest on ACM-8 offered Medium. | Rules plus AI or keyword suggestions |
| ISSUE-30 | SLA targets | P2 | NOT STARTED |  |  |  | Per-priority hour targets and business hours |
| ISSUE-31 | Git branch and pull request status | P2 | NOT STARTED |  |  |  | Branch name and open pull requests when GitHub is configured |
| ISSUE-32 | Status-change rules | PASSED | 1 | 1 | 0 | A backlog status rule assigned Alex Rivera. The row had no remove control, so one was added and used. | On triage: when an issue enters a status, set assignee, label, and the other actions the service stores |
| PLAN-01 | Cycles | P1 | PASSED | 0 | 0 | 0 | Cycle 1 is active with 11 issues and Cycle 2 is upcoming. The create form, schedule, and start-next controls are on the page. |
| PLAN-02 | Cycle analytics and capacity | P1 | PASSED | 0 | 0 | 0 | Cycle 1 shows 3/11 done, a burndown section, assignee split, and per-person capacity. Points are 0 because the seeded issues have no estimates. |
| PLAN-03 | Projects and milestones | P1 | PASSED | 0 | 0 | 0 | Launch Verk shows 29 percent, 7 issues, the Public demo milestone, and a lead. |
| PLAN-04 | Project updates and contributing teams | P2 | PASSED | 0 | 0 | 0 | Posting an update put Ship check update on the project timeline. The row was removed afterward. |
| PLAN-05 | Project dependencies | P1 | NOT STARTED |  |  |  | Depends-on and blocks. Loops refused. Roadmap warns. |
| PLAN-06 | Initiatives and key results | P1 | NOT STARTED |  |  |  | Initiatives, health, parent, key results |
| PLAN-07 | Roadmap | P1 | PASSED | 0 | 0 | 0 | Roadmap shows Launch Verk at 2 of 7, 29 percent, On track, with week nudge buttons. |
| PLAN-08 | Timeline | P1 | PASSED | 0 | 0 | 0 | The timeline shows Cycle 1 and Cycle 2 across month, quarter, and year, and notes the project has no dates. |
| PLAN-09 | Calendar | P1 | PASSED | 0 | 0 | 0 | November 2026 shows a Sunday-to-Saturday grid with previous and next. Seeded issues have no start or due dates, so the cells are empty. |
| PLAN-10 | Releases and pipelines | P1 | NOT STARTED |  |  |  | Pipelines, stages, and issue release assignment |
| PLAN-11 | Documents | P1 | NOT STARTED |  |  |  | Team docs, comments, revisions, and line merge |
| PLAN-12 | Customers | PASSED | 0 | 0 | 0 | Added Ship Check Co with a request form and 0 requests. Delete customer removed it. | Customers, tier, revenue, and requests |
| PLAN-13 | Customer demand | P1 | NOT STARTED |  |  |  | Rank open issues by customers or by revenue |
| PLAN-14 | Dashboards | PASSED | 1 | 1 | 0 | Creating Ship check board saved it but the list stayed blank until reload. Create now refreshes, and Delete removes the board. | Personal dashboards and widgets |
| PLAN-15 | Insights | P1 | PASSED | 1 | 1 | 0 | Created 20 and completed 3 match the team. The flow chart ended the day before issues existed, so every row was zero. It now includes today and shows 6, 6, 4, 3, 1. |
| PLAN-16 | Insight builder and saved reports | P1 | NOT STARTED |  |  |  | Build a query, keep it private or share it |
| PLAN-17 | Public Ask form | P1 | NOT STARTED |  |  |  | Token URL that files a triage issue. Honeypot and rate limits. |
| PLAN-18 | Signed-in intake form | P2 | NOT STARTED |  |  |  | In-app intake plus POST /api/teams/{id}/intake |
| INBOX-01 | Inbox | P1 | PASSED | 0 | 0 | 0 | Two notifications. Mark read dropped the badge from 2 to 1. |
| INBOX-02 | Notification preferences | P1 | PASSED | 0 | 0 | 0 | Unchecking Assigned to you saved, and checking it again restored it. The other four types stayed on. |
| GAP-06 | Email alerts for inbox events | P2 | NOT STARTED |  |  |  | BUILD. Resend sends invites only. |
| OFFLINE-01 | Installable PWA and offline page | P1 | PASSED | 0 | 0 | 0 | The offline page says you are offline and offers teams and retry. The manifest names Verk and starts at /t. The worker is turned off while the dev server is running. |
| OFFLINE-02 | Offline outbox and sync | P1 | NOT STARTED |  |  |  | Issue CRUD, comments, labels, and drafts while offline |
| OFFLINE-03 | Edit conflicts | P1 | NOT STARTED |  |  |  | Revision conflicts and the keep-mine dialog |
| INT-01 | GitHub webhook and pull-request automation | P1 | NOT STARTED |  |  |  | HMAC webhook. Mention, open, and merge. |
| INT-02 | GitLab webhook | P1 | NOT STARTED |  |  |  | Merge request events. Same mention rules as GitHub. |
| INT-03 | Slack commands, mentions, and shortcuts | P1 | NOT STARTED |  |  |  | Slash command, app mention, and the create-issue shortcut |
| INT-04 | Slack unfurls and channel notifications | P1 | NOT STARTED |  |  |  | Link previews and one outbound post |
| INT-05 | Email intake | P2 | NOT STARTED |  |  |  | Inbound mail becomes a triage issue |
| INT-06 | Sentry intake | P2 | NOT STARTED |  |  |  | A Sentry issue becomes one triage issue |
| INT-07 | Linear import | P1 | NOT STARTED |  |  |  | CSV or API, capped at 2,000 issues |
| INT-08 | Generic CSV import | P1 | NOT STARTED |  |  |  | Map columns, preview, then import |
| INT-09 | Issue export | P1 | PASSED | 0 | 0 | 0 | CSV export returned 200 with a header row. |
| INT-10 | Outbound webhooks and delivery log | P1 | PASSED | 1 | 1 | 0 | A localhost URL crashed the page. It now shows that webhook URLs must be public https addresses. |
| INT-11 | REST hooks | P2 | NOT STARTED |  |  |  | Zapier-style subscribe and unsubscribe |
| INT-12 | SCIM | P1 | NOT STARTED |  |  |  | Users and groups. Owners are never removed. |
| INT-13 | OAuth apps | P1 | NOT STARTED |  |  |  | Authorization code and PKCE. Tokens are API keys. |
| INT-14 | API keys | P1 | PASSED | 0 | 0 | 0 | A member key was shown once, then listed by prefix, then revoked. |
| API-02 | GraphQL | P1 | NOT STARTED |  |  |  | One endpoint per team, same auth and role checks as REST |
| API-03 | MCP server | P1 | NOT STARTED |  |  |  | 47 tools at POST /api/mcp |
| API-04 | Issue prompt agent | P1 | NOT STARTED |  |  |  | POST /api/agent creates or updates issues from a prompt |
| API-05 | Coding-agent claims and next issue | P1 | NOT STARTED |  |  |  | Lease an issue, heartbeat, report, and the next-unblocked route |
| API-06 | Agent discovery document | P2 | PASSED | 0 | 0 | 0 | GET /.well-known/verk-agent.json describes bearer keys, OAuth, REST, GraphQL, and MCP. |
| API-07 | VS Code extension | P2 | NOT STARTED |  |  |  | Sign in with a key and create an issue |
| SET-01 | Workflow statuses | P1 | PASSED | 1 | 1 | 0 | Statuses showed 0 issues because seeded issues had no workflow status. Counts now read 6, 6, 4, 3, and 1. |
| SET-02 | Automations | P1 | PASSED | 0 | 0 | 0 | Created a rule that sets priority when an issue is created, then deleted it. |
| SET-03 | Audit log, export, and retention | P1 | PASSED | 1 | 1 | 0 | The log lists invites, keys, automations, and the CSV export. Creating a key stored the actor as Unknown when only an id was passed. New rows now show Demo User. |
| SET-04 | Appearance | P1 | PASSED | 0 | 0 | 0 | Dark theme turns the account page to ink on a dark surface and stays readable. Light restores it. Language, accent, and density controls are on the same page. |
| SET-05 | Locales | P1 | PASSED | 0 | 0 | 0 | Deutsch switched the language heading to Sprache and the sidebar to German. |
| SET-06 | In-app API reference | P2 | NOT STARTED |  |  |  | Settings → API describes the key and the routes |
| SEC-02 | Shared rate limiter | P1 | NOT STARTED |  |  |  | Postgres buckets, fail-open to memory |
| OBS-01 | Application error page | P1 | NOT STARTED |  |  |  | app/error.tsx reset control |
| OBS-02 | Not-found page | P1 | PASSED | 0 | 0 | 0 | An unknown address shows This page isn't here, with links to teams and home. Title is Page Not Found - Verk. |
| OBS-03 | Loading states | P2 | NOT STARTED |  |  |  | Team segment loading UI |
| OBS-04 | Empty states | P1 | NOT STARTED |  |  |  | Shared empty state component |
| A11Y-01 | Keyboard access and semantics | P1 | NOT STARTED |  |  |  | React Aria controls, labels, and focus |
| RESP-01 | Responsive layout | P1 | NOT STARTED |  |  |  | The shell at phone, tablet, and desktop widths |
| SEO-01 | Marketing site, robots, and sitemap | P2 | PASSED | 0 | 0 | 0 | Home, docs, and about render. robots.txt allows those and disallows /t, /w, and /api. The sitemap lists the public pages only. |
| LEGAL-01 | Privacy policy and terms | P1 | PASSED | 1 | 1 | 0 | Privacy page renders. The title was doubled and is now Privacy - Verk. |
| ANALYTICS-01 | Microsoft Clarity | P2 | NOT STARTED |  |  |  | Production-only session recording |
| LOG-01 | Logging | P2 | NOT STARTED |  |  |  | Console logs. No analytics pipeline of our own. |
| JOB-01 | Daily maintenance cron | P1 | NOT STARTED |  |  |  | GET /api/cron/cycles. One Vercel schedule. |
| JOB-02 | Demo reset cron | P2 | NOT STARTED |  |  |  | GET /api/cron/demo-reset and POST /api/demo/reset |

## Gaps

BUILD items are also rows in the feature table. DEFER items are not, because the product has chosen not to ship them.

| Gap | Decision | Reason |
| --- | --- | --- |
| Password reset | BUILD | GAP-01. VerificationToken exists and nothing sends a reset link. A person who forgets the password cannot get back in. |
| Change password | BUILD | GAP-02. The account page shows that a password is set and erasure checks it, but nothing writes a new hash. SCIM advertises changePassword unsupported. |
| Email verification | BUILD | GAP-03. Password signup never sets emailVerified. SAML does. Anyone can register an address they do not own before the real owner does. |
| Edit name and email | BUILD | GAP-04. The account page is display-only. |
| Leave a team | BUILD | GAP-05. Only an admin can remove a member. There is no leave action. |
| Email alerts for inbox events | BUILD | GAP-06. Resend sends invite mail only. Assignment and mentions stay in the inbox. |
| Payments and billing | DEFER | The privacy page says Verk has no billing. Customer revenue is a number the team types. |
| Docker | DEFER | The README and the repo ship a Vercel build. No Dockerfile is present. |
| Native desktop and mobile shells | DEFER | The product is a PWA on purpose. |
| Redis or a separate queue | DEFER | Rate limits and the offline outbox use Postgres and the browser. |
| Drawn project-dependency graph and automatic reschedule | DEFER | Dependencies and the roadmap banner exist. The code and the README stop there. |
| Merging pull requests from Verk | DEFER | GitHub and GitLab webhooks link and complete issues. Verk does not merge. |
| SCIM bulk operations | DEFER | ServiceProviderConfig sets bulk supported to false. |

## Per-Feature Sections

## DATA-01 Database schema and migrations

- **ID:** DATA-01
- **Name:** Database schema and migrations
- **Priority:** P0
- **Status:** PASSED

### Files

- `prisma/schema.prisma`
- `prisma/migrations/`

### Expected behavior

Postgres is the system of record. prisma/schema.prisma defines users, sessions, workspaces, teams, memberships, invites, issues, workflow statuses, cycles, projects, initiatives, documents, customers, releases, webhooks, audit logs, automations, drafts, two-factor, passkeys, OAuth apps, agent claims, and the supporting tables. Role is OWNER, ADMIN, MEMBER, or GUEST. Issue status is BACKLOG, TODO, IN_PROGRESS, DONE, or CANCELLED. Forty-three SQL migrations under prisma/migrations are the deploy path (prisma migrate deploy). The app does not create tables at request time.

### Acceptance criteria

- [x] Fresh database accepts prisma migrate deploy and ends with all 43 migrations applied.
- [x] prisma migrate status reports the schema is up to date.
- [x] Seed is a separate command and is not part of migrate.
- [x] Enums in the client match the schema (roles, statuses, priorities, estimates, visibility).

### Test cases

#### Normal use
- Apply the migration history to an empty Postgres database and confirm User, Team, Issue, Membership, and RateLimitBucket exist.
#### Empty, missing, whitespace-only, and very long input
- Run migrate with an empty DIRECT_URL and confirm the Vercel build script skips migrate rather than inventing a database. A migration file of only comments is not in this set; do not add one.
#### Wrong types, special characters, emoji, and non-English text
- Inspect enum labels. They are fixed English tokens (TODO, GUEST), not translated strings. A title column is text and can store emoji later; the migration itself has no title input.
#### SQL injection, XSS, and path traversal
- Confirm migration SQL uses Prisma's quoted identifiers and does not concatenate request input. There is no HTTP surface on this item.
#### Logged out, expired session, wrong role, and another user's data
- Run migrate with a database role that can DDL, then with a read-only role and confirm the second fails closed. This item has no end-user session.
#### Double-submit and parallel requests
- Start two migrate deploy processes against the same database and confirm the second waits or no-ops without leaving a half-applied migration.
#### External service failing, timing out, and rate limiting
- Point DIRECT_URL at an unreachable host and confirm migrate fails with a connection error and does not report success.
#### New user with no data, and a user with lots of data
- Migrate an empty database, then a database that already has the full history. The second run changes nothing.
#### Refresh mid-action, back button, and two tabs
- Interrupt migrate and run it again. Prisma's migration table must not claim a migration that did not finish.

### UI checks

- Alignment, spacing, and control size on the Prisma schema and migration folder.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. This item has no product screen.
- Keyboard: Not applicable. Schema changes are not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

None

### Suspected bugs

- None found while reading the migration list and schema models.

### Results

- Bugs Found: 0
- Bugs Fixed: 0
- UI Issues Fixed: 0
- Files Changed: none
- Notes: Live on Docker Postgres 16. prisma migrate deploy applied 43 migrations and created User, Team, Issue, Membership, and RateLimitBucket. migrate status reported up to date. A second deploy and two parallel deploys reported no pending migrations. DIRECT_URL to 127.0.0.1:1 failed with P1001. A read-only role on a fresh database failed with permission denied for schema public. An already-current database exits 0 for that role because Prisma only reads the migrations table. Empty DIRECT_URL and a localhost URL made scripts/vercel-build.mjs print the skip warning and not call prisma. Seed is a separate npm script. Enums match Role, IssueStatus, Priority, Estimate, and IssueVisibility. No product screen.

## DATA-02 Neon and Prisma runtime client

- **ID:** DATA-02
- **Name:** Neon and Prisma runtime client
- **Priority:** P0
- **Status:** PASSED

### Files

- `lib/db.ts`
- `lib/prisma-adapter.ts`
- `prisma/seed.ts`
- `package.json`

### Expected behavior

The running app talks to Postgres through the Prisma client. A localhost or 127.0.0.1 URL uses the TCP driver, because the Neon serverless driver cannot speak to a normal Postgres port. Any other host, including Neon, keeps the Neon adapter. DATABASE_URL is the runtime URL. DIRECT_URL is for migrations. postinstall and the CI job run prisma generate. Queries in services import prisma from lib/db.ts. If the database is down, routes that catch the error return their own failure (health returns 503). The rate limiter is the exception: it fails open to memory. An empty DATABASE_URL throws before a query. No client component imports lib/db.

### Acceptance criteria

- [x] The generated client matches schema.prisma.
- [x] A successful SELECT 1 works through the same client the health route uses.
- [x] Missing DATABASE_URL fails at first query rather than silently using a file database.
- [x] The client is a server module and is not imported by client components.

### Test cases

#### Normal use
- Open a page that reads issues and confirm rows come back from Postgres.
#### Empty, missing, whitespace-only, and very long input
- Start the server with DATABASE_URL unset and confirm data routes fail rather than serving an empty fake team.
#### Wrong types, special characters, emoji, and non-English text
- Connection strings are configuration, not end-user text. Confirm a password containing @ or non-ASCII in the URL is still parsed as a URL, or fails with a connection error and not a 200.
#### SQL injection, XSS, and path traversal
- Send a query string into a route that uses Prisma parameterized calls (issue search). Confirm it is stored as data, not executed as SQL. See ISSUE-26 for the user-facing case.
#### Logged out, expired session, wrong role, and another user's data
- This client has no role of its own. A logged-out call still hits the client only after the route's auth check, except health.
#### Double-submit and parallel requests
- Fire two issue creates. Confirm the issue counter transaction in lib/services/issues.ts serializes them (it allows up to 10 seconds to wait and 20 seconds to run).
#### External service failing, timing out, and rate limiting
- Stop Postgres mid-request and confirm the request errors. Confirm rateLimitShared then uses the in-memory limiter (lib/rate-limit.ts).
#### New user with no data, and a user with lots of data
- Query a team with no issues and a team with thousands of issues. List endpoints must page or cap (export caps at 20,000; MCP list take max is 100).
#### Refresh mid-action, back button, and two tabs
- Refresh a page during a slow Neon wake-up. The next request should retry the connection rather than cache a 500 forever.

### UI checks

- Alignment, spacing, and control size on no screen; this is the database client.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not applicable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DATA-01`

### Suspected bugs

- The Neon serverless driver cannot open a normal Postgres socket. lib/db.ts used it for every URL, so a local Docker database failed at the first query with an empty ErrorEvent. Fixed by choosing the TCP driver for localhost.

### Results

- Bugs Found: 1
- Bugs Fixed: 1
- UI Issues Fixed: 0
- Files Changed: lib/prisma-adapter.ts, lib/db.ts, prisma/seed.ts, scripts/create-smoke-key.ts, package.json, package-lock.json, tests/unit/prisma-adapter.test.ts
- Notes: Signed in as demo@verk.dev and opened /t/acme-engineering/issues. ACM-1 through ACM-20 rendered from Postgres. GET /api/health was 200 (10ms) with the database up and 503 when Docker Postgres was stopped, then 200 again after it started. An empty DATABASE_URL is rejected before connect. No "use client" file imports lib/db. tsc passed. vitest 651 passed. The issue-counter wait limit was not changed.

## DEVOPS-01 Environment configuration

- **ID:** DEVOPS-01
- **Name:** Environment configuration
- **Priority:** P0
- **Status:** PASSED

### Files

- `.env.example`
- `README.md`

### Expected behavior

Four variables are required for a private deploy: DATABASE_URL, DIRECT_URL, AUTH_SECRET, and AUTH_URL. Everything else is optional and turns a feature on: GitHub, Google, and OIDC sign-in, SAML, Resend invites, Vercel Blob attachments, Clarity, the offline flag, demo mode, cron secret, GitHub and GitLab webhooks, GitHub token, SCIM, intake, email intake, Sentry, Slack, and the OpenAI-compatible AI key. Unset optional variables leave that integration off (several webhook routes return 404 until the secret exists). Secrets are not given defaults that would authenticate a stranger.

### Acceptance criteria

- [x] A deploy with only the four required variables boots, serves login, and leaves GitHub, Slack, SCIM, Sentry, email intake, and AI off.
- [x] README's variable table matches .env.example names.
- [x] AUTH_SECRET is used for Auth.js and for encrypting TOTP secrets.
- [x] DEMO_MODE is false unless set to the string true.

### Test cases

#### Normal use
- Copy .env.example to a local env with the four required values and confirm the process starts far enough to answer /api/health when Postgres is up.
#### Empty, missing, whitespace-only, and very long input
- Leave each optional variable empty one at a time. Confirm the matching route is absent or returns its documented off state, not a 500.
#### Wrong types, special characters, emoji, and non-English text
- Set AUTH_URL to a value with a trailing slash, a non-ASCII host, and an emoji. Confirm callbacks and invite links either normalize or fail clearly.
#### SQL injection, XSS, and path traversal
- Put SQL and HTML in EMAIL_FROM and a webhook secret. Confirm they are treated as secret strings, not executed, and are not printed back on the login page.
#### Logged out, expired session, wrong role, and another user's data
- Env has no user session. Confirm a request cannot read the full environment through any API response (health returns ok, status, demo, latencyMs only).
#### Double-submit and parallel requests
- Two server instances with the same env should accept the same API key. This is configuration, not a double-submit form.
#### External service failing, timing out, and rate limiting
- Set AI_API_URL to a host that refuses connections and confirm the AI route fails with its own error after the key is set. With the key empty, confirm the keyword fallback path is the one that runs for summaries.
#### New user with no data, and a user with lots of data
- A brand-new env with no teams shows onboarding after signup. A seeded env shows the demo team.
#### Refresh mid-action, back button, and two tabs
- Change AUTH_URL and refresh. Passkeys and OAuth callbacks must use the new origin; old passkeys stay bound to the old host.

### UI checks

- Alignment, spacing, and control size on no product screen; configuration only.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not applicable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DATA-01`, `DATA-02`

### Suspected bugs

- None found while comparing .env.example to the variables named in README and the routes that 404 when a secret is missing.

### Results

- Bugs Found: 0
- Bugs Fixed: 0
- UI Issues Fixed: 0
- Files Changed: none
- Notes: Health with the four required values plus optional local tokens returned only ok, status, demo false, and latencyMs. Slack POST /api/slack/command is 404 while SLACK_SIGNING_SECRET is empty. Cron without a bearer is 401. Cron with the bearer is 200. SAML variables are read through trimmedEnv and are listed in .env.example. No env name used as process.env.NAME is missing from the example except platform variables.

## DEVOPS-02 Production build and Vercel deploy

- **ID:** DEVOPS-02
- **Name:** Production build and Vercel deploy
- **Priority:** P0
- **Status:** PASSED

### Files

- `scripts/vercel-build.mjs`
- `package.json`
- `vercel.json`
- `next.config.mjs`

### Expected behavior

npm run build and the Vercel build command run scripts/vercel-build.mjs. That script runs prisma migrate deploy, then next build --webpack, and skips the migration when both database URLs are empty or point at localhost so a preview without a database can still compile. postinstall only runs prisma generate. vercel.json schedules two crons. There is no Dockerfile and no docker-compose file. The service must bind for Vercel, which sets PORT; next start is the local production server. Serwist emits public/sw.js except in development.

### Acceptance criteria

- [x] vercel-build with a reachable direct URL applies migrations before the Next build.
- [x] vercel-build with localhost URLs skips migrate and still builds.
- [x] The production build emits the service worker and the PWA manifest checks that CI already runs.
- [x] No Docker image is required to deploy.

### Test cases

#### Normal use
- Run the production build with the four required variables pointed at a disposable database.
#### Empty, missing, whitespace-only, and very long input
- Run the build with empty DATABASE_URL and DIRECT_URL and confirm migrate is skipped and the build still finishes.
#### Wrong types, special characters, emoji, and non-English text
- A build does not take user text. Confirm a branch name or commit with emoji does not break the Serwist revision (next.config.mjs falls back to a random UUID when git rev-parse fails).
#### SQL injection, XSS, and path traversal
- Confirm the build script does not pass environment values into a shell string that could be injected. Read scripts/vercel-build.mjs before the run.
#### Logged out, expired session, wrong role, and another user's data
- The build is not an authenticated user action.
#### Double-submit and parallel requests
- Do not start two builds against one database unless the test database is disposable. Migrate deploy should be safe to repeat.
#### External service failing, timing out, and rate limiting
- Point DIRECT_URL at a closed port and confirm the build fails because migrate fails, and does not print the URL password into the success line.
#### New user with no data, and a user with lots of data
- Build a repo with no local git commit and confirm the service worker revision falls back rather than crashing.
#### Refresh mid-action, back button, and two tabs
- Rebuild twice. The second build with an up-to-date schema should succeed.

### UI checks

- Alignment, spacing, and control size on no product screen.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not applicable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DATA-01`, `DEVOPS-01`

### Suspected bugs

- None found in the build script's documented skip rule. No Dockerfile exists; that is recorded as a deferred gap, not a bug.

### Results

- Bugs Found: 0
- Bugs Fixed: 0
- UI Issues Fixed: 0
- Files Changed: none
- Notes: npx next build --webpack exited 0 and wrote public/sw.js, public/manifest.webmanifest, and public/icons/icon-192.png. No Dockerfile. scripts/vercel-build.mjs skips migrate for an empty URL and for localhost, then calls next build. A Neon-shaped DIRECT_URL invokes npx prisma migrate deploy before the build and stops if that command fails. The build script uses spawnSync with an argument array, not a shell string.

## DEVOPS-03 GitHub Actions CI

- **ID:** DEVOPS-03
- **Name:** GitHub Actions CI
- **Priority:** P1
- **Status:** PASSED

### Files

- `.github/workflows/ci.yml`

### Expected behavior

On push and pull request to main or master, CI checks out the repo, uses Node 22, runs npm ci, prisma generate, npm run lint, tsc --noEmit, npm test, and next build --webpack. The build uses a localhost database URL so migrate is not required. It then asserts public/manifest.webmanifest, public/sw.js, and public/icons/icon-192.png exist. Playwright runs only when the DATABASE_URL secret is non-empty, after migrate and seed. Without that secret the job still succeeds and writes an E2E-skipped warning to the step summary. There is no Docker Postgres service in the workflow.

### Acceptance criteria

- [x] A pull request with no database secret is green only after lint, types, unit tests, and the production build pass, and the summary says E2E was skipped.
- [x] A pull request with DATABASE_URL, DIRECT_URL, and AUTH_SECRET runs migrate, seed, and Playwright.
- [x] Playwright failure uploads test-results.
- [x] The workflow does not print secret values.

### Test cases

#### Normal use
- Read the workflow and confirm the quality job runs lint, tsc, vitest, and next build in that order.
#### Empty, missing, whitespace-only, and very long input
- Confirm the E2E step is skipped when HAS_E2E_DB is not true, and that the job is not failed by that skip.
#### Wrong types, special characters, emoji, and non-English text
- CI has no free-text user field. A commit message with emoji or SQL should not change which steps run.
#### SQL injection, XSS, and path traversal
- Confirm secrets are referenced as GitHub secrets and are not echoed. A malicious PR cannot set HAS_E2E_DB except through the repository secret.
#### Logged out, expired session, wrong role, and another user's data
- CI is not a product role. Fork pull requests must not receive the database secret (GitHub's default).
#### Double-submit and parallel requests
- Two concurrent workflow runs on one shared Neon branch can reset the same demo team. The README says to use a throwaway branch. Treat a shared database as a bug in the project setup, not in the YAML.
#### External service failing, timing out, and rate limiting
- If npm ci fails, later steps must not run. Confirm the workflow has no continue-on-error on lint or tests.
#### New user with no data, and a user with lots of data
- The unit suite is the small-data check. Playwright is the seeded-team check and is optional.
#### Refresh mid-action, back button, and two tabs
- Re-run a failed job. The upload-artifact step runs only when the job failed and the database secret was set.

### UI checks

- Alignment, spacing, and control size on GitHub Actions log, not the product UI.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not applicable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DEVOPS-02`

### Suspected bugs

- None found in .github/workflows/ci.yml. The intentional skip of E2E without secrets is documented in the workflow comments.

### Results

- Bugs Found: 0
- Bugs Fixed: 0
- UI Issues Fixed: 0
- Files Changed: none
- Notes: Read .github/workflows/ci.yml. The quality job runs npm ci, prisma generate, lint, tsc, vitest, then next build --webpack, then checks the manifest, service worker, and icon. Playwright is gated on HAS_E2E_DB and a failure uploads test-results. Secrets are GitHub secret references and are not echoed. Locally this session ran tsc, vitest (651), and the production build successfully. GitHub itself was not re-triggered.

## API-01 Health check

- **ID:** API-01
- **Name:** Health check
- **Priority:** P0
- **Status:** PASSED

### Files

- `app/api/health/route.ts`

### Expected behavior

GET /api/health runs SELECT 1. On success it returns 200 JSON with ok true, status healthy, demo true only when DEMO_MODE is the string true, and latencyMs. On a database error it returns 503 with ok false and status unhealthy. The route is force-dynamic. It does not check Auth.js, Blob, Resend, or AI. It does not require a session.

### Acceptance criteria

- [x] 200 and healthy when Postgres answers.
- [x] 503 and unhealthy when Postgres does not.
- [x] The body does not include the connection string or AUTH_SECRET.
- [x] demo reflects DEMO_MODE.

### Test cases

#### Normal use
- GET /api/health on a running database and expect 200 with ok true.
#### Empty, missing, whitespace-only, and very long input
- The route takes no body. GET with an empty query string still returns the health object. A very long query string is ignored.
#### Wrong types, special characters, emoji, and non-English text
- Send a query of emoji, non-English text, and angle brackets. The JSON body stays the health object.
#### SQL injection, XSS, and path traversal
- Send a query of ' OR 1=1 and ../../etc/passwd. The route does not use the query. The SQL is the fixed SELECT 1 in app/api/health/route.ts.
#### Logged out, expired session, wrong role, and another user's data
- Call it logged out and with a garbage session cookie. Both should match the logged-in result. Health is public.
#### Double-submit and parallel requests
- Send two parallel GETs. Both should return 200 or both 503, never a partial body.
#### External service failing, timing out, and rate limiting
- Stop the database and expect 503. Restore it and expect 200. There is no third-party call to time out.
#### New user with no data, and a user with lots of data
- Call health on an empty database and on a seeded one. Both are healthy if SELECT 1 works. Row count is not part of the body.
#### Refresh mid-action, back button, and two tabs
- Refresh the URL. Each response has its own latencyMs. The browser back button should show a fresh dynamic response, not a cached healthy lie after the database died.

### UI checks

- Alignment, spacing, and control size on a JSON response, no page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not applicable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DATA-02`

### Suspected bugs

- None found in app/api/health/route.ts.

### Results

- Bugs Found: 0
- Bugs Fixed: 0
- UI Issues Fixed: 0
- Files Changed: none
- Notes: GET /api/health returned 200 with ok, status healthy, demo false, and latencyMs while Postgres was up. Stopping Docker Postgres returned 503 unhealthy. Starting it returned 200 again. A query with SQL, a path, and an emoji was ignored. Two parallel requests both returned 200. No connection string or secret in the body. Logged out.

## SEC-01 Security headers and content security policy

- **ID:** SEC-01
- **Name:** Security headers and content security policy
- **Priority:** P0
- **Status:** PASSED

### Files

- `next.config.mjs`

### Expected behavior

Every path gets X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, a Permissions-Policy that disables camera, microphone, and geolocation, Strict-Transport-Security for one year with includeSubDomains and preload, and a Content-Security-Policy. The policy allows self, images from https and blob and data, inline styles, and inline scripts plus Microsoft Clarity's script hosts. connect-src allows self, https, and wss. poweredByHeader is false. frame-ancestors is none and form-action is self.

### Acceptance criteria

- [x] A document response includes the six security headers.
- [x] The X-Powered-By header is absent.
- [x] Pages still load their own scripts and styles under the policy.
- [x] Clarity's script host is allowed only as written; other script hosts are not.

### Test cases

#### Normal use
- Fetch /login and confirm each header above is present.
#### Empty, missing, whitespace-only, and very long input
- Fetch /api/health and confirm the same headers are attached to JSON.
#### Wrong types, special characters, emoji, and non-English text
- Header values are fixed. A request path with emoji or encoded traversal still gets the same policy.
#### SQL injection, XSS, and path traversal
- Confirm a page cannot be framed (X-Frame-Options and frame-ancestors). Try an iframe in a local HTML file.
#### Logged out, expired session, wrong role, and another user's data
- Headers are sent to anonymous and signed-in users alike.
#### Double-submit and parallel requests
- Two parallel requests both include the headers.
#### External service failing, timing out, and rate limiting
- The policy is static. An external font or script host other than Clarity should be blocked by the browser. Record the console error.
#### New user with no data, and a user with lots of data
- Check headers on the marketing page and on a team page.
#### Refresh mid-action, back button, and two tabs
- Reload. Headers must be present on the second response as well.

### UI checks

- Alignment, spacing, and control size on response headers on every page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. This is not a visible control.
- Keyboard: Not applicable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DEVOPS-02`

### Suspected bugs

- next.config.mjs:36-39 sends HSTS with preload on every response, including a local http://localhost response. A browser that caches that header can refuse later HTTP.
- The CSP allows 'unsafe-inline' scripts (next.config.mjs style and script directives). That is required by the current inline appearance and error scripts, and it weakens XSS protection.

### Results

- Bugs Found: 1
- Bugs Fixed: 1
- UI Issues Fixed: 0
- Files Changed: `next.config.mjs`, `lib/security-headers.mjs`, `tests/unit/security-headers.test.ts`
- Notes: Live GET /login and GET /api/health return X-Frame-Options DENY, nosniff, strict-origin referrer, the camera/microphone/geolocation Permissions-Policy, and the CSP. X-Powered-By is absent. Development omits Strict-Transport-Security and allows unsafe-eval for the dev overlay. Production still sends max-age=31536000; includeSubDomains; preload and drops unsafe-eval. A script from https://evil.example/attack.js was blocked by the policy. /login still rendered its own scripts and styles. The unsafe-inline script allowance remains; it is required by the current inline scripts.

## AUTH-01 Email and password registration

- **ID:** AUTH-01
- **Name:** Email and password registration
- **Priority:** P0
- **Status:** PASSED

### Files

- `app/(auth)/register/page.tsx`
- `components/auth-form.tsx`
- `lib/actions/auth.ts`
- `lib/validators/index.ts`

### Expected behavior

The register page posts a name, email, and password. registerAction rejects signup when DEMO_MODE is true, and when the host is private (AUTH_ALLOWED_GITHUB is set). Otherwise it rate-limits by IP (30 per minute), validates with registerSchema (name 1–100, email, password 8–128), lowercases the email, and refuses an existing email. The password is hashed with bcrypt (cost 10) and stored on User.passwordHash. emailVerified is not set. A successful create signs the person in and sends them to /onboarding. There is no email verification message.

### Acceptance criteria

- [x] A new email and an 8-character password creates a user and lands on Create your team.
- [x] Demo mode returns the demo-login error and creates nothing.
- [x] A private host returns the deploy-your-own error and creates nothing.
- [x] A duplicate email returns An account with this email already exists and does not change the hash.
- [x] A password shorter than 8 or a bad email returns Invalid registration details.

### Test cases

#### Normal use
- Register a new address with a normal name and an 8-character password. Expect /onboarding and a session.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty name, a whitespace name, a missing password, and a 129-character password. Expect a validation error and no user. Submit a 100-character name and expect success if the email is new.
#### Wrong types, special characters, emoji, and non-English text
- Use a name of emoji and CJK characters, an email with a plus tag, and a password of punctuation. Valid ones should store the name as typed and the email lowercased.
#### SQL injection, XSS, and path traversal
- Use a name of <script>alert(1)</script> and an email of ' OR 1=1--@example.com. The email must fail validation. The script name, if the rest is valid, must render as text on the account page later, not execute.
#### Logged out, expired session, wrong role, and another user's data
- Submit while logged out (the normal case). A logged-in user opening /register should not overwrite their account. There is no role on this form.
#### Double-submit and parallel requests
- Double-click Create account. Only one user row should exist. The second submit should hit the duplicate-email error or the rate limit.
#### External service failing, timing out, and rate limiting
- When the database is down, the action should fail and not claim the account exists. The 31st try in a minute from one IP returns Too many attempts.
#### New user with no data, and a user with lots of data
- The first user has no team. That is the onboarding empty state, not an error.
#### Refresh mid-action, back button, and two tabs
- Refresh on the error. The password must not be in the URL. Back from onboarding should not create a second user. Two browsers registering the same email: one wins.

### UI checks

- Alignment, spacing, and control size on the register card.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. Errors render in the form.
- Keyboard: Tab through name, email, password, and submit. Enter submits.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DATA-02`, `AUTH-16`

### Suspected bugs

- Credentials signup never sets emailVerified (lib/actions/auth.ts creates name, email, and passwordHash only). Verification mail does not exist. Tracked as GAP-03.

### Results

- Bugs Found: 1
- Bugs Fixed: 1
- UI Issues Fixed: 0
- Files Changed: `lib/validators/index.ts`, `tests/unit/validators.test.ts`
- Notes: A whitespace name used to create a user and open onboarding. The register schema now trims the name and email and rejects a blank name. Retest showed Invalid registration details and no row. A new address with an 8-character password, a plus-tag email, an emoji and CJK name, a script name, and a 100-character name each created one user and opened Create your team. The script name rendered as text on the account page. A quoted SQL email was rejected by the field. A duplicate email returned the exists message and left the bcrypt hash unchanged. Two submits of the same new email created one row. The 27th further attempt in the same minute returned Too many attempts. With DEMO_MODE true, /register redirected to /login and showed the demo credentials. With AUTH_ALLOWED_GITHUB set, /register redirected to /login and showed that the host is private. Both were restored afterward. The test users were deleted. Light and dark, and widths 360, 768, 1024, and 1440, kept the card on screen with no horizontal scroll. tsc and 655 tests passed.

## AUTH-02 Password login and session

- **ID:** AUTH-02
- **Name:** Password login and session
- **Priority:** P0
- **Status:** PASSED

### Files

- `app/(auth)/login/page.tsx`
- `app/api/auth/password/route.ts`
- `lib/actions/auth.ts`
- `lib/auth.ts`
- `lib/auth.config.ts`
- `app/api/auth/[...nextauth]/route.ts`

### Expected behavior

Login accepts email and password. The password is checked with bcrypt. A wrong password, a missing user, and a disabled user all look the same: the person stays signed out. If the password is right and two-factor is on, the form asks for a code and does not start a session yet. POST /api/auth/password is the normal form path: failures redirect to /login?error=CredentialsSignin and the password is not placed in the URL. callbackUrl is passed through safeCallbackPath, so an external host is not used. Sessions are JWT (lib/auth.config.ts session.strategy is jwt) with the Prisma adapter for OAuth accounts. A disabled user loses the JWT on the next jwt callback (lib/auth.ts). Auth errors use the /login page.

### Acceptance criteria

- [x] Right password and no 2FA creates a session and follows a same-site callback path.
- [x] Wrong, empty, or unknown email stays on login with CredentialsSignin and no password in the location.
- [x] An external callbackUrl is ignored.
- [x] A non-form body does not 500; it redirects as a failed login.
- [x] A disabled user cannot sign in.

### Test cases

#### Normal use
- Sign in as a known user with the right password. Expect a session cookie and the callback page.
#### Empty, missing, whitespace-only, and very long input
- Submit empty email, whitespace password, and a 200-character password. Expect failure and no session.
#### Wrong types, special characters, emoji, and non-English text
- Use an email with emoji, uppercase letters, and a non-English local part. Uppercase must be lowercased. An invalid email fails.
#### SQL injection, XSS, and path traversal
- Use email admin'-- and password <script>. Expect the same CredentialsSignin response. The error page must not echo the password.
#### Logged out, expired session, wrong role, and another user's data
- Call the route with no cookie. An already-signed-in user posting again should end on the callback, not a second account. There is no role check on login itself.
#### Double-submit and parallel requests
- Submit the form twice quickly. Expect one session, not two users. Parallel wrong passwords count toward the 30/minute limit.
#### External service failing, timing out, and rate limiting
- With the database down, login fails. The 31st attempt from one IP redirects with error=Throttle (app/api/auth/password/route.ts).
#### New user with no data, and a user with lots of data
- A user with no team lands on onboarding. A user with a team can be sent to /t/{slug}/issues via callbackUrl.
#### Refresh mid-action, back button, and two tabs
- Refresh the login error page. Back after success should not show the password. Two tabs: signing out in one is covered by AUTH-03.

### UI checks

- Alignment, spacing, and control size on the login card.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. The second-factor step is the same page, not a dialog.
- Keyboard: Tab through email, password, sign in, then GitHub, Google, and passkey when those buttons are shown.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DATA-02`, `AUTH-16`, `SEC-01`

### Suspected bugs

- app/api/auth/password/route.ts:54-55 puts the account email in the login query string when the password is correct and two-factor is required (step=code&email=).

### Results

- Bugs Found: 1
- Bugs Fixed: 1
- UI Issues Fixed: 0
- Files Changed: `lib/auth.ts`, `lib/auth-errors.ts`, `tests/unit/auth-errors.test.ts`
- Notes: DEMO@verk.dev with the right password followed callbackUrl /t/acme-engineering/issues and opened the issue list. A SQL-looking email, a script password, an empty JSON body, and a 200-character password each returned 303 to /login?error=CredentialsSignin with no password in the location. callbackUrl https://evil.example/steal was not followed. A disabled user with the demo password got the same CredentialsSignin redirect. A cookie sealed with an older AUTH_SECRET used to throw JWTSessionError into the Next overlay on public pages. Auth.js now ignores only that stale-session error. The login card matches the register card, which held together in light and dark and at 360, 768, 1024, and 1440. The demo user has no second factor, so the email-in-the-query path was not exercised.

## GAP-01 Password reset

- **ID:** GAP-01
- **Name:** Password reset
- **Priority:** P0
- **Status:** PASSED

### Files

- `lib/validators/index.ts`
- `prisma/schema.prisma`

### Expected behavior

A person who forgets the password cannot recover it. VerificationToken exists on the Prisma schema, and Auth.js is configured, but no page, action, or email sends a reset link. SCIM advertises changePassword supported false. Signup stores a hash and login only compares it. This item is the missing flow: request a reset for an email, send one time-limited link, set a new password, and invalidate the old one.

### Acceptance criteria

- [x] A signed-out person can request a reset for their email.
- [x] The response does not reveal whether the email is registered.
- [x] The link expires and cannot be reused.
- [x] The new password meets the same 8–128 rule as signup.
- [x] The old password stops working and existing JWTs are ended.

### Test cases

#### Normal use
- Once built: request a reset, open the link, set a new password, and sign in with it.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty email, spaces, and a 300-character email. Expect a validation error. A whitespace-only new password must be rejected.
#### Wrong types, special characters, emoji, and non-English text
- Use emoji in the email and a non-English password of 8 characters. The password should be accepted if it meets length; the email must be a real address.
#### SQL injection, XSS, and path traversal
- Put HTML and SQL in the email field. The message, if any, is escaped. The token is not the email.
#### Logged out, expired session, wrong role, and another user's data
- A logged-in user can still request a reset for their own address. A reset link for user A must not change user B. An expired session on the reset page asks them to use the link, not their old cookie.
#### Double-submit and parallel requests
- Submit the reset form twice. The second use of the same token fails. Two parallel requests cannot both set different passwords.
#### External service failing, timing out, and rate limiting
- With Resend unset, the UI must say the mail could not be sent and must not print the raw token. Rate-limit repeated requests.
#### New user with no data, and a user with lots of data
- A new user who never set a password (OAuth only) needs a defined outcome. A user with a password can replace it.
#### Refresh mid-action, back button, and two tabs
- Refresh the reset page. Back after success should not resubmit the token. Two tabs opening one link: one succeeds.

### UI checks

- Alignment, spacing, and control size on a reset request page and a set-new-password page, neither of which exists yet.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal until the pages exist. Errors must be inline.
- Keyboard: The form must submit with Enter and be usable with Tab only.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-01`, `AUTH-02`

### Suspected bugs

- The flow is absent. prisma/schema.prisma defines VerificationToken and nothing in app/ or lib/actions reads it for password reset. app/api/scim/ServiceProviderConfig/route.ts:10 sets changePassword.supported to false.

### Results

- Bugs Found: 1
- Bugs Fixed: 1
- UI Issues Fixed: 0
- Files Changed: `prisma/schema.prisma`, `prisma/migrations/20261120190000_password_changed_at/migration.sql`, `lib/services/password-reset.ts`, `lib/actions/password-reset.ts`, `lib/email.ts`, `lib/auth.ts`, `lib/user-status.ts`, `lib/validators/index.ts`, `components/password-reset-form.tsx`, `components/auth-form.tsx`, `app/(auth)/forgot/page.tsx`, `app/(auth)/reset/[token]/page.tsx`, `tests/unit/password-reset.test.ts`
- Notes: There was no reset flow. /forgot now asks for an email and stores a 30-minute VerificationToken. /reset/[token] sets a new bcrypt hash and passwordChangedAt. The next session read drops a JWT whose stamp does not match, which I saw when /account returned to /login after a reset. The old password then returned CredentialsSignin and the new one reached /account. A second submit of the same link, and a link whose expiry was moved to the past, both said the link is invalid or expired. A short password was rejected and left the token in place. An unknown address got the same message as a real one and created no token. RESEND_API_KEY is unset, so the page says email could not be sent and never prints the token. The test user was deleted. The card has no horizontal scroll at 360, 768, 1024, or 1440 in dark or light. tsc and 656 tests passed.

## GAP-02 Change password

- **ID:** GAP-02
- **Name:** Change password
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/account/page.tsx`
- `lib/actions/privacy.ts`

### Expected behavior

The account page lists password as a sign-in method when passwordHash is set. Privacy erasure asks for the current password. No action compares the current password and writes a new hash. A person who still knows the password cannot rotate it without erasure.

### Acceptance criteria

- [x] The signed-in user enters the current password and a new one.
- [x] Wrong current password changes nothing.
- [x] The new password is 8–128 characters and is stored as a bcrypt hash.
- [x] OAuth-only accounts without a hash get a clear message instead of a broken form.
- [x] Other sessions stop working after the change.

### Test cases

#### Normal use
- Change the password, sign out, and sign in with the new one.
#### Empty, missing, whitespace-only, and very long input
- Submit empty, spaces, 7 characters, and 129 characters. Expect no change.
#### Wrong types, special characters, emoji, and non-English text
- Use a new password of punctuation, emoji, and non-English letters within the length limit.
#### SQL injection, XSS, and path traversal
- Put a script tag in the current-password field. It is a secret, not rendered. A SQL string must not change another user.
#### Logged out, expired session, wrong role, and another user's data
- Logged out, the form redirects to login. User A cannot post user B's id. A guest is still a user and may change their own password.
#### Double-submit and parallel requests
- Double-click save. One hash update. Parallel requests with two new passwords: the last committed hash is the only one that works, and the UI must not claim both succeeded.
#### External service failing, timing out, and rate limiting
- Database failure leaves the old hash in place.
#### New user with no data, and a user with lots of data
- A user with only GitHub linked sees that there is no password to change. A user with a password can change it.
#### Refresh mid-action, back button, and two tabs
- Refresh during save. Back does not revert the hash silently. Two tabs: both show the method as password after refresh.

### UI checks

- Alignment, spacing, and control size on the account page, password section to be built.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal today. A confirmation dialog is appropriate if one is added.
- Keyboard: Tab from current password to new password to save.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-02`, `AUTH-11`

### Suspected bugs

- No change-password action exists. app/account/page.tsx only displays the sign-in methods. Erasure in lib/actions/privacy.ts checks the current password and then deletes the account.

### Results

- Bugs Found: 1
- Bugs Fixed: 1
- UI Issues Fixed: 0
- Files Changed: `app/account/page.tsx`, `components/change-password-form.tsx`, `lib/actions/password.ts`
- Notes: The account page had no way to write a new hash. It now has current and new password fields. A wrong current password returned "Current password is wrong" and left the old hash working. A 7-character password was rejected. "rotated11" replaced it: the old password then returned CredentialsSignin, the new one reached /onboarding, and the previous session was sent back to /login. With the hash removed, the section said there is no password and to use the provider. Logged-out /account redirects to /login. The test user was deleted. tsc and 656 tests passed.

## GAP-03 Email verification

- **ID:** GAP-03
- **Name:** Email verification
- **Priority:** P1
- **Status:** BLOCKED

### Files

- `prisma/schema.prisma`
- `lib/actions/auth.ts`
- `lib/services/saml-login.ts`

### Expected behavior

User.emailVerified exists. SAML signup sets it (lib/services/saml-login.ts). Password registration does not, and no message is sent to confirm the address. Invites and login trust the typed email. This item is a verification mail and a block, or an explicit decision to keep trusting unverified passwords. It is marked BUILD because a stranger can register any address they do not own and then receive invites sent to that address only if they can read the mail — the hole is registering as someone else before that person signs up.

### Acceptance criteria

- [ ] A new password account cannot act as a verified address until the link is opened, or the product documents that verification is intentionally absent.
- [ ] The link expires.
- [ ] Opening it sets emailVerified.
- [ ] Resending does not create a second account.

### Test cases

#### Normal use
- Register, open the verification link, and confirm emailVerified is set.
#### Empty, missing, whitespace-only, and very long input
- Submit a blank address. The register form already rejects it. A blank token in the verify URL fails.
#### Wrong types, special characters, emoji, and non-English text
- Use a non-English display name. The verification mail must escape HTML.
#### SQL injection, XSS, and path traversal
- A token of ../ or a script tag fails closed and does not verify an arbitrary user.
#### Logged out, expired session, wrong role, and another user's data
- Logged out is the normal case for the link. User A’s link must not verify user B.
#### Double-submit and parallel requests
- Click the link twice. The second click is idempotent. Two different addresses cannot share one token.
#### External service failing, timing out, and rate limiting
- With Resend unset, registration should explain that the mail was not sent.
#### New user with no data, and a user with lots of data
- An OAuth user already verified by the provider should not be stuck. A brand-new password user should be.
#### Refresh mid-action, back button, and two tabs
- Refresh the verify URL. Back should not clear emailVerified.

### UI checks

- Alignment, spacing, and control size on a verification landing page, which does not exist yet.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The link target must have a visible success heading.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-01`

### Suspected bugs

- lib/actions/auth.ts creates the user without emailVerified. lib/services/saml-login.ts:51 sets emailVerified for SAML users only.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-03 Logout

- **ID:** AUTH-03
- **Name:** Logout
- **Priority:** P0
- **Status:** PASSED

### Files

- `lib/actions/auth.ts`
- `app/account/page.tsx`
- `components/app-sidebar.tsx`

### Expected behavior

logoutAction calls Auth.js signOut and redirects to /. The account page and the sidebar both expose it. After sign-out, protected paths redirect to /login. The JWT is the session; there is no separate server session row required for credentials.

### Acceptance criteria

- [x] Sign out from the account page lands on /.
- [x] Sign out from the sidebar lands on /.
- [x] A following request to a team URL redirects to login.
- [x] The sign-out control is not shown on the logged-out marketing page.

### Test cases

#### Normal use
- Sign in, open /account, sign out, and request a team page. Expect / then a login redirect.
#### Empty, missing, whitespace-only, and very long input
- Sign out with no extra fields. An empty form is the real request.
#### Wrong types, special characters, emoji, and non-English text
- There is no text field. Confirm the button label is readable in a non-English locale where the shell is translated.
#### SQL injection, XSS, and path traversal
- Confirm the action ignores any extra form field such as a redirect to an external site. signOut's redirectTo is the fixed /.
#### Logged out, expired session, wrong role, and another user's data
- Logged out, posting the action should end on / or login, not a 500. One user cannot sign out another.
#### Double-submit and parallel requests
- Double-click Sign out. The second call is still signed out.
#### External service failing, timing out, and rate limiting
- If Auth.js throws, the UI should not leave the person looking signed in while the cookie is gone, or the reverse. Record which one happens.
#### New user with no data, and a user with lots of data
- A user with many teams and a user with none can both sign out.
#### Refresh mid-action, back button, and two tabs
- Two tabs: sign out in one, then click an issue in the other. The other tab's next navigation goes to login.

### UI checks

- Alignment, spacing, and control size on the account page and the sidebar footer.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. Sign out is a button.
- Keyboard: The control is a button and is reachable by Tab from the sidebar.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-02`

### Suspected bugs

- None found in logoutAction (lib/actions/auth.ts).

### Results

- Bugs Found: 0
- Bugs Fixed: 0
- UI Issues Fixed: 0
- Files Changed: none
- Notes: Signed in as demo@verk.dev. Sidebar Sign out returned to /. The next request to /t/acme-engineering/issues redirected to /login. Signed in again and used Sign out on /account, which showed Working… and then landed on /. The marketing page shows Log in and Start free and no sign-out control.

## AUTH-04 Signed-out and non-member protection

- **ID:** AUTH-04
- **Name:** Signed-out and non-member protection
- **Priority:** P0
- **Status:** PASSED

### Files

- `lib/auth.config.ts`
- `app/t/[teamSlug]/layout.tsx`
- `app/account/page.tsx`
- `app/onboarding/page.tsx`

### Expected behavior

auth.config authorized treats /t, /t/*, /w/*, /onboarding, and /account as protected. No session redirects to /login. On a private host the JWT must also carry an allowed GitHub login. The team layout loads the team by slug and the membership. A missing team or a missing membership calls notFound(), so a stranger cannot tell a private team from a missing one by the status. API routes use their own checks and return 401 or 403. Guests who are members still enter the layout; what they see is TEAM-08.

### Acceptance criteria

- [ ] No cookie on /t/{slug}/issues redirects to login.
- [ ] A member of another team gets the not-found page, not the issues.
- [ ] A member gets the shell.
- [ ] callbackUrl can return them to the same path after login when it is a same-site path.

### Test cases

#### Normal use
- While signed out, open a team issues URL, /account, /onboarding, and /w/{slug}. Expect login.
#### Empty, missing, whitespace-only, and very long input
- Open /t/ and /t/%20 and a very long slug. Expect login when signed out, and not-found or a safe error when signed in.
#### Wrong types, special characters, emoji, and non-English text
- Use a slug of emoji, ../, and %2e%2e. Expect not-found for a signed-in non-member, never a file from disk.
#### SQL injection, XSS, and path traversal
- Use a slug of ' OR 1=1. Expect not-found. The lookup is a Prisma equality on slug.
#### Logged out, expired session, wrong role, and another user's data
- Signed out: redirect. Expired or disabled user: the jwt callback returns null and the next request is signed out. A member of team A opening team B gets not-found.
#### Double-submit and parallel requests
- Two tabs, two users. Each layout resolves its own session.
#### External service failing, timing out, and rate limiting
- Database down during layout should be the error page, not a blank team.
#### New user with no data, and a user with lots of data
- A new user with no membership opening /t hits the team index or onboarding, not another tenant's data.
#### Refresh mid-action, back button, and two tabs
- Refresh a protected URL. After login, back should not flash another team's data.

### UI checks

- Alignment, spacing, and control size on the login redirect and the not-found page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The login redirect must leave focus in the login form.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-02`, `SEC-01`

### Suspected bugs

- A non-member receives notFound() (app/t/[teamSlug]/layout.tsx:30-36), which is the right hiding behavior. Confirm the not-found page does not leak the team name. None else found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-05 GitHub OAuth

- **ID:** AUTH-05
- **Name:** GitHub OAuth
- **Priority:** P1
- **Status:** BLOCKED

### Files

- `lib/auth.ts`
- `lib/actions/auth.ts`
- `components/auth-form.tsx`

### Expected behavior

If both GitHub env vars are set, a GitHub provider is registered and the login page can start it. The callback is {AUTH_URL}/api/auth/callback/github. allowDangerousEmailAccountLinking is true, so a GitHub email that matches an existing user links the accounts. On a private host, sign-in is refused unless the GitHub login or numeric id is in AUTH_ALLOWED_GITHUB. A disabled email cannot sign in. First-time users go to onboarding.

### Acceptance criteria

- [ ] With the env set, Continue with GitHub leaves Verk for GitHub and returns with a session.
- [ ] With the env empty, the button is absent and the provider is not registered.
- [ ] An allowlisted account on a private host succeeds. A non-listed account does not.
- [ ] A SCIM-disabled email is rejected in the signIn callback.

### Test cases

#### Normal use
- Start GitHub sign-in from /login and finish with a GitHub account that has a verified email.
#### Empty, missing, whitespace-only, and very long input
- Cancel at GitHub. Expect to be back on login without a session. No empty code should create a user.
#### Wrong types, special characters, emoji, and non-English text
- A GitHub name with emoji or non-English characters should be stored as the Verk name.
#### SQL injection, XSS, and path traversal
- Confirm the OAuth state is Auth.js's, not a caller-supplied redirect to an external site. callbackUrl is the same safe path as password login.
#### Logged out, expired session, wrong role, and another user's data
- Signed out is the normal start. A user who is already a member returns to the callback team. They do not become owner of someone else's team.
#### Double-submit and parallel requests
- Double-click the GitHub button. One account row per provider account id.
#### External service failing, timing out, and rate limiting
- GitHub down or a timeout returns to the login error page. The 30/minute auth limiter applies to the app's auth actions; the OAuth dance itself depends on GitHub.
#### New user with no data, and a user with lots of data
- A brand-new GitHub user with no team lands on onboarding. A returning user lands on their team.
#### Refresh mid-action, back button, and two tabs
- Refresh the callback URL. It must not be reusable as a second login. Two tabs starting OAuth: both can complete only if GitHub allows it; Verk must not create two users.

### UI checks

- Alignment, spacing, and control size on the login page GitHub button.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. The browser leaves the site.
- Keyboard: The button is a submit control in tab order.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-02`, `AUTH-15`, `DEVOPS-01`

### Suspected bugs

- lib/auth.ts:150 sets allowDangerousEmailAccountLinking: true. A GitHub account that can claim an email can attach to an existing password user.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-06 Google OAuth

- **ID:** AUTH-06
- **Name:** Google OAuth
- **Priority:** P1
- **Status:** BLOCKED

### Files

- `lib/auth.ts`
- `lib/actions/auth.ts`
- `components/auth-form.tsx`

### Expected behavior

Google is registered the same way as GitHub, only when both Google env vars are set. allowDangerousEmailAccountLinking is true. A disabled email is rejected. Private-host signIn in auth.config.ts returns false for every provider other than GitHub, so Google cannot be used to enter a private host.

### Acceptance criteria

- [ ] With env set on a public host, Google sign-in creates or links a user.
- [ ] With env empty, there is no button.
- [ ] On a private host, Google sign-in is refused even if the env is set.
- [ ] Disabled users stay out.

### Test cases

#### Normal use
- Complete Google sign-in on a host that is not private.
#### Empty, missing, whitespace-only, and very long input
- Cancel the Google prompt. Expect no session.
#### Wrong types, special characters, emoji, and non-English text
- A Google profile name in another script should be stored and later rendered as text.
#### SQL injection, XSS, and path traversal
- Confirm an attacker-supplied callback to https://evil.example is not honored.
#### Logged out, expired session, wrong role, and another user's data
- User A's Google login must not enter user B's team without a membership.
#### Double-submit and parallel requests
- Double-click Continue with Google. One Account row for that provider account.
#### External service failing, timing out, and rate limiting
- Google timing out returns to /login with the Auth.js error.
#### New user with no data, and a user with lots of data
- New Google user: onboarding. Returning user: their teams.
#### Refresh mid-action, back button, and two tabs
- Refresh the callback. It must not sign in a second time from a replayed URL.

### UI checks

- Alignment, spacing, and control size on the login page Google button.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The button is in tab order when present.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-02`, `AUTH-15`

### Suspected bugs

- lib/auth.ts:160 sets allowDangerousEmailAccountLinking: true for Google.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-07 OIDC single sign-on

- **ID:** AUTH-07
- **Name:** OIDC single sign-on
- **Priority:** P2
- **Status:** BLOCKED

### Files

- `lib/auth.ts`
- `lib/actions/auth.ts`

### Expected behavior

If AUTH_OIDC_ISSUER, AUTH_OIDC_CLIENT_ID, and AUTH_OIDC_CLIENT_SECRET are all set, an OIDC provider with id oidc and the label SSO is registered. Linking by email is enabled. A private host refuses this provider in the signIn callback, which allows only GitHub. A disabled email is refused.

### Acceptance criteria

- [ ] With the three variables set on a non-private host, Continue with SSO redirects to the issuer.
- [ ] With any of the three empty, the provider is absent.
- [ ] Private hosts refuse the callback.
- [ ] The person lands on onboarding the first time.

### Test cases

#### Normal use
- Sign in against a test issuer and land in Verk.
#### Empty, missing, whitespace-only, and very long input
- Cancel at the issuer. Expect no session and no half-created membership.
#### Wrong types, special characters, emoji, and non-English text
- A preferred username in another language should display as text.
#### SQL injection, XSS, and path traversal
- Confirm the issuer URL comes from the environment, not from the query string, so a user cannot point OIDC at their own host.
#### Logged out, expired session, wrong role, and another user's data
- A user who is not a member of a team still cannot open that team after SSO.
#### Double-submit and parallel requests
- Start two SSO logins. One user row per email.
#### External service failing, timing out, and rate limiting
- An issuer that times out returns to the login error page.
#### New user with no data, and a user with lots of data
- First login has no team. A later login does.
#### Refresh mid-action, back button, and two tabs
- Replay the callback. Auth.js state should reject it.

### UI checks

- Alignment, spacing, and control size on the login page SSO button.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The button is in tab order when the provider is configured.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-02`, `DEVOPS-01`

### Suspected bugs

- lib/auth.ts:177 sets allowDangerousEmailAccountLinking: true on the OIDC provider.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-08 SAML single sign-on

- **ID:** AUTH-08
- **Name:** SAML single sign-on
- **Priority:** P1
- **Status:** BLOCKED

### Files

- `lib/saml.ts`
- `lib/services/saml-login.ts`
- `app/api/auth/saml/acs/route.ts`
- `app/api/auth/saml/login/route.ts`
- `app/api/auth/saml/metadata/route.ts`
- `app/api/auth/saml/complete/route.ts`

### Expected behavior

SAML is on only when SAML_IDP_SSO_URL and SAML_IDP_CERT are both set. The login page then shows Continue with SAML. Verk validates the IdP response (signature, audience, time window, InResponseTo, and replay via the SamlSeen table) and hands Auth.js a 60-second ticket. A first user is created with emailVerified set and sent to onboarding. SAML_ALLOWED_DOMAINS can restrict the email domain. A private host refuses SAML. A SCIM-disabled user cannot sign in. Metadata is served at /api/auth/saml/metadata.

### Acceptance criteria

- [ ] With SAML unset, the login page has no SAML button and the ACS route does not accept a forged response.
- [ ] A valid signed response creates a session.
- [ ] A replayed assertion is rejected.
- [ ] A wrong domain is rejected when the allowlist is set.
- [ ] Metadata lists the ACS URL and entity id.

### Test cases

#### Normal use
- Sign in through a test IdP and land on onboarding or the team.
#### Empty, missing, whitespace-only, and very long input
- POST an empty SAMLResponse. Expect rejection and no user.
#### Wrong types, special characters, emoji, and non-English text
- Use a display name with emoji. It is stored as the name. An email outside SAML_ALLOWED_DOMAINS is rejected.
#### SQL injection, XSS, and path traversal
- POST a response signed with the wrong key, a response for a different audience, and a NameID containing a script tag. All rejected. The script is not rendered.
#### Logged out, expired session, wrong role, and another user's data
- Signed out is the start. A disabled user with a valid assertion still gets no session. User A’s assertion does not join user B’s team.
#### Double-submit and parallel requests
- Submit the same SAMLResponse twice. The second is a replay and fails. Two different InResponseTo values are two logins.
#### External service failing, timing out, and rate limiting
- An IdP that never returns leaves the person on the IdP. The app must not create a user until the ACS succeeds.
#### New user with no data, and a user with lots of data
- A new SAML user has no team. A returning user enters their memberships.
#### Refresh mid-action, back button, and two tabs
- Refresh the ACS POST. The browser should not silently replay a stored response into a second session. Two tabs: one assertion, one success.

### UI checks

- Alignment, spacing, and control size on the login page SAML button and the IdP.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal inside Verk.
- Keyboard: The SAML button is in tab order only when SAML is configured.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-02`, `AUTH-04`, `DEVOPS-01`

### Suspected bugs

- None found in the SAML ticket design described in lib/auth.ts and the SamlSeen model. Replay storage is the control; confirm SamlSeen is written before the session is issued when this is tested.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-09 Two-factor authentication

- **ID:** AUTH-09
- **Name:** Two-factor authentication
- **Priority:** P1
- **Status:** BLOCKED

### Files

- `components/two-factor-settings.tsx`
- `lib/actions/two-factor.ts`
- `lib/services/two-factor.ts`
- `lib/totp.ts`

### Expected behavior

Account → Two-factor sign-in enrolls a TOTP secret. The person confirms with a code, then sees ten recovery codes once. The secret is AES-GCM encrypted with AUTH_SECRET. Recovery codes are stored as hashes. Login asks for the code only after the password matches, so a wrong password does not reveal that 2FA is on. Codes cannot be reused in the same 30-second step. Guesses are limited to 8 per 5 minutes per account (lib/auth.ts). Turning 2FA off requires the password. Enable, disable, regeneration, and recovery-code sign-in are written to the audit log of every team the person belongs to. GitHub, Google, SSO, and SAML do not use this TOTP.

### Acceptance criteria

- [ ] Setup shows a secret and does not enable 2FA until a valid code is entered.
- [ ] Ten recovery codes are shown once.
- [ ] A later login with the right password and a wrong code stays signed out.
- [ ] A recovery code works once.
- [ ] Disable with the wrong password does nothing.

### Test cases

#### Normal use
- Enroll, sign out, and sign in with password plus the current code.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty code, spaces, and a 40-character code. Expect failure and no session. A blank account name is unrelated.
#### Wrong types, special characters, emoji, and non-English text
- Paste a code with emoji. Expect rejection. The recovery code is the alphabet the generator uses, not free text.
#### SQL injection, XSS, and path traversal
- Submit a code of ' OR 1=1 and <script>. Expect the same invalid-code error. The secret is not returned after enrollment.
#### Logged out, expired session, wrong role, and another user's data
- Logged out, the account settings redirect to login. User A cannot disable user B’s 2FA. A guest with a password can enroll for their own account.
#### Double-submit and parallel requests
- Submit two codes in parallel. Only a correct current code works. Double-click enroll must not create two secrets that the UI loses.
#### External service failing, timing out, and rate limiting
- The 9th guess inside 5 minutes fails even if the code is right, until the window passes. There is no external TOTP server.
#### New user with no data, and a user with lots of data
- A user with no 2FA sees the setup button. A user with 2FA sees the enabled state and remaining recovery codes.
#### Refresh mid-action, back button, and two tabs
- Refresh during setup. The secret must still be confirmable or the UI must restart cleanly. Two tabs entering codes: one success.

### UI checks

- Alignment, spacing, and control size on the account two-factor section and the login code step.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- Recovery codes are a one-time panel, not a permanent modal. Confirm it can be copied.
- Keyboard: Tab from the code field to confirm. The login code field submits with Enter.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-02`, `AUTH-11`

### Suspected bugs

- The email is copied into the login URL at the 2FA step (app/api/auth/password/route.ts:54-55).

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-10 Passkeys

- **ID:** AUTH-10
- **Name:** Passkeys
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `components/passkey-settings.tsx`
- `components/passkey-sign-in.tsx`
- `lib/actions/passkeys.ts`
- `lib/services/passkeys.ts`

### Expected behavior

Account → Passkeys registers a WebAuthn credential (@simplewebauthn). Sign-in uses the passkey provider, which checks the signature, the site (the host of AUTH_URL), a single-use five-minute challenge, and a counter that only moves forward. A passkey replaces the TOTP step. Up to 10 per person. Adding and removing are audited. A private host refuses passkey sign-in (lib/auth.ts returns null). Guesses are limited to 10 per 5 minutes per credential id prefix.

### Acceptance criteria

- [ ] Add a passkey from the account page and then sign in with it from the login page without a password.
- [ ] An assertion for another site fails.
- [ ] A replayed assertion fails.
- [ ] The 11th passkey is refused.
- [ ] Remove deletes that credential only.

### Test cases

#### Normal use
- Register a passkey named Laptop and sign in with it.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty name, a whitespace name, and a very long name. Expect a validation error or a truncated stored name, and no credential with a blank id.
#### Wrong types, special characters, emoji, and non-English text
- Name the passkey with emoji and non-English text. It should display as text in the list.
#### SQL injection, XSS, and path traversal
- Post a forged assertion JSON, a truncated clientDataJSON, and a challenge from another origin. Expect the error from passkeySignInAction and no session.
#### Logged out, expired session, wrong role, and another user's data
- Logged out is required to start sign-in. User A cannot delete user B’s passkey. The account page is the user’s own.
#### Double-submit and parallel requests
- Double-click Add. One credential. Two parallel sign-ins with one assertion: one succeeds.
#### External service failing, timing out, and rate limiting
- Cancel the browser prompt. Expect no row. A platform authenticator that times out leaves the list unchanged.
#### New user with no data, and a user with lots of data
- A user with no passkeys sees the empty form. A user with 10 sees a refusal on the next add.
#### Refresh mid-action, back button, and two tabs
- Refresh during the ceremony. The challenge must not be reusable. Two tabs: the list matches the database after refresh.

### UI checks

- Alignment, spacing, and control size on the account passkey list and the login passkey button.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The browser’s passkey sheet is the system dialog. Verk’s list is inline.
- Keyboard: Add and Remove are buttons. The sign-in button is on the login page.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-02`, `AUTH-11`

### Suspected bugs

- None found in the passkey provider wiring in lib/auth.ts. Confirm the counter is stored and checked when this is tested.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-11 Account page

- **ID:** AUTH-11
- **Name:** Account page
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/account/page.tsx`
- `components/privacy-settings.tsx`
- `components/appearance-settings.tsx`

### Expected behavior

Signed-in /account shows the name, email, and sign-in methods (password and each OAuth provider). It does not edit them. It hosts two-factor, passkeys, appearance, privacy export and erasure, a list of teams, and sign out. No session redirects to /login. The marketing navbar is the chrome.

### Acceptance criteria

- [ ] A signed-in user sees their own email and only their teams.
- [ ] A signed-out user is redirected.
- [ ] Name and email are not inputs.
- [ ] Sign-in methods match the user row and Account rows.

### Test cases

#### Normal use
- Open /account and confirm name, email, and methods.
#### Empty, missing, whitespace-only, and very long input
- A user with a null name sees the em dash. There is no empty form to submit.
#### Wrong types, special characters, emoji, and non-English text
- A name with emoji and RTL text stays inside the card and does not run as HTML.
#### SQL injection, XSS, and path traversal
- Confirm the page HTML-escapes the name. A stored name of <img onerror> must be text.
#### Logged out, expired session, wrong role, and another user's data
- Signed out redirects. User A never sees user B’s email. A guest sees their own account.
#### Double-submit and parallel requests
- There is no save button on the profile block. Double-clicks apply to sign out and to the privacy actions, which have their own items.
#### External service failing, timing out, and rate limiting
- If the user row was deleted, the page redirects to login (app/account/page.tsx).
#### New user with no data, and a user with lots of data
- A user with no teams sees an empty team list. A user with many teams can scroll the list.
#### Refresh mid-action, back button, and two tabs
- Refresh. Two tabs show the same email. Back after sign-out does not restore the page without a new login.

### UI checks

- Alignment, spacing, and control size on the account page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- Privacy erasure uses its own confirmation. No profile modal.
- Keyboard: Tab through the sections in order: profile, two-factor, passkeys, appearance, privacy, teams, sign out.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-02`, `AUTH-04`

### Suspected bugs

- The profile block is read-only (app/account/page.tsx:48-64). Editing is GAP-04.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## GAP-04 Edit name and email

- **ID:** GAP-04
- **Name:** Edit name and email
- **Priority:** P1
- **Status:** BLOCKED

### Files

- `app/account/page.tsx`

### Expected behavior

Nothing in the account UI or actions updates User.name or User.email. OAuth may set them at sign-in. A person cannot correct a name or change the address invites use. This item is that form, with the current password or a second factor required before an email change, and a check that the new email is unused.

### Acceptance criteria

- [ ] The user can change their display name.
- [ ] An email change requires proof and refuses an address that already exists.
- [ ] The old email stops receiving new invites.
- [ ] Other users’ rows are untouched.

### Test cases

#### Normal use
- Change the name and see it on the account page and in comments after refresh.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty name, spaces, and a 500-character name. Empty fails. A very long name is rejected or capped at the column’s practical limit.
#### Wrong types, special characters, emoji, and non-English text
- Set a name in Japanese and an emoji. It renders as text.
#### SQL injection, XSS, and path traversal
- Set the name to a script tag and the email to someone else's. The name is text. The email is rejected if taken and never applied to the other user.
#### Logged out, expired session, wrong role, and another user's data
- Logged out redirects. User A cannot post user B’s id.
#### Double-submit and parallel requests
- Double-click save. One update.
#### External service failing, timing out, and rate limiting
- Database failure keeps the old name.
#### New user with no data, and a user with lots of data
- A new user can set a name. A user with a long comment history still shows the new name on new activity and the stored actor snapshot where the audit log froze the old name.
#### Refresh mid-action, back button, and two tabs
- Two tabs: the second save wins and both show it after refresh.

### UI checks

- Alignment, spacing, and control size on an edit form on the account page, not built.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal until built.
- Keyboard: The future form submits with Enter.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-11`

### Suspected bugs

- app/account/page.tsx renders name and email as text and has no update action.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-12 Account data export

- **ID:** AUTH-12
- **Name:** Account data export
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/api/account/export/route.ts`
- `lib/services/privacy.ts`
- `components/privacy-settings.tsx`

### Expected behavior

Account → Your data downloads a JSON file of the signed-in user’s data. The privacy service strips secrets (password hash, tokens, two-factor secret). The route requires a session. It is the user’s own row, not a team export.

### Acceptance criteria

- [ ] A signed-in GET returns 200 JSON and the user’s email.
- [ ] The body has no passwordHash, API key secret, or TOTP secret.
- [ ] A signed-out GET returns 401.
- [ ] The file is only that user’s memberships, issues they created, and comments.

### Test cases

#### Normal use
- Download the export and open it. Confirm the email is present and the hash is absent.
#### Empty, missing, whitespace-only, and very long input
- GET with no query. A very long query string is ignored.
#### Wrong types, special characters, emoji, and non-English text
- The export is generated, not typed. Confirm names with emoji round-trip as JSON strings.
#### SQL injection, XSS, and path traversal
- Confirm a comment body that contains HTML is JSON-escaped and that the route does not take a file path.
#### Logged out, expired session, wrong role, and another user's data
- No cookie returns 401. A cookie for user A never includes user B’s notification preferences.
#### Double-submit and parallel requests
- Two parallel downloads both succeed and match.
#### External service failing, timing out, and rate limiting
- Database down returns an error and not a partial file that looks complete.
#### New user with no data, and a user with lots of data
- A new user gets a small file. A user with many issues gets a complete file that still omits secrets.
#### Refresh mid-action, back button, and two tabs
- Refresh the download. Back does not require a second confirm. Two tabs can each download.

### UI checks

- Alignment, spacing, and control size on the account privacy section.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. The result is a file download.
- Keyboard: The download control is a button or link in tab order.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-11`

### Suspected bugs

- None found in the route’s existence and the privacy service’s nulling of passwordHash (lib/services/privacy.ts). Re-read the exporter for token fields when testing.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-13 Account erasure

- **ID:** AUTH-13
- **Name:** Account erasure
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `lib/actions/privacy.ts`
- `lib/services/privacy.ts`
- `components/privacy-settings.tsx`

### Expected behavior

Erase asks for the password when the user has one. It refuses in demo mode. A sole owner of a team must hand the team over or delete it first. On success the identity is removed and issues and comments stay attributed to a deleted user. Sessions, keys, and OAuth links stop. The action is on the account page.

### Acceptance criteria

- [ ] Wrong password does not erase.
- [ ] Demo mode does not erase.
- [ ] A sole owner gets a clear error and the user remains.
- [ ] After erase, the email can be registered again and old issues do not show the old name.
- [ ] OAuth-only users have a confirmation path that does not ask for a password they do not have.

### Test cases

#### Normal use
- Erase a disposable user who is not a sole owner and confirm they cannot sign in.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty confirmation and spaces. Expect no delete.
#### Wrong types, special characters, emoji, and non-English text
- Submit a password with emoji. If it is not the password, nothing is deleted.
#### SQL injection, XSS, and path traversal
- Submit the password field with a script tag. It is compared, not rendered as HTML.
#### Logged out, expired session, wrong role, and another user's data
- Logged out redirects. User A cannot erase user B. An admin cannot erase another member from this screen.
#### Double-submit and parallel requests
- Double-click Erase. One deletion. The second request finds no user.
#### External service failing, timing out, and rate limiting
- If the delete transaction fails, the user can still sign in.
#### New user with no data, and a user with lots of data
- A new user with no team can erase. A user who owns a team and has members cannot until they hand off.
#### Refresh mid-action, back button, and two tabs
- Two tabs: both confirm. One succeeds. Refresh after success lands on login or home.

### UI checks

- Alignment, spacing, and control size on the account privacy section.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The control is a confirmed submit. It must not look like the export button.
- Keyboard: The confirm field and the button are reachable by keyboard. Escape does not erase.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-11`, `AUTH-02`

### Suspected bugs

- None found in the action’s password check (lib/actions/privacy.ts). Confirm the sole-owner guard in lib/services/privacy.ts when testing.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-14 Demo mode lock

- **ID:** AUTH-14
- **Name:** Demo mode lock
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `lib/utils.ts`
- `components/demo-banner.tsx`
- `lib/actions/auth.ts`
- `lib/services/teams.ts`
- `lib/services/privacy.ts`

### Expected behavior

When DEMO_MODE is the string true, registration returns an error telling the person to use demo@verk.dev, team deletion throws DEMO_LOCKED, and account erasure is refused. A banner shows that the host is a demo. The health check reports demo true. Issue edits are still allowed. The demo cron is JOB-02.

### Acceptance criteria

- [ ] With the flag on, /register does not create users.
- [ ] Team delete is refused for the owner.
- [ ] Erase is refused.
- [ ] With the flag off, those actions follow their normal rules.
- [ ] The banner is visible on the demo host and absent otherwise.

### Test cases

#### Normal use
- On a demo host, try to register, delete the team, and erase the account. All three fail with the demo message.
#### Empty, missing, whitespace-only, and very long input
- The flag is the string true, not 1. Confirm DEMO_MODE=1 does not turn the lock on (isDemoMode should be read before the test).
#### Wrong types, special characters, emoji, and non-English text
- There is no text field on the banner. A team name with emoji still shows under the banner.
#### SQL injection, XSS, and path traversal
- Confirm the banner text is fixed and does not include request input.
#### Logged out, expired session, wrong role, and another user's data
- The lock applies to owners as well as members. A logged-out visitor sees the banner on public pages and still cannot register.
#### Double-submit and parallel requests
- Double-click delete. Both attempts fail and the team remains.
#### External service failing, timing out, and rate limiting
- Not an external service. The flag is local.
#### New user with no data, and a user with lots of data
- The seeded demo user can still edit issues. A new registration cannot add a second owner.
#### Refresh mid-action, back button, and two tabs
- Refresh. The banner stays. Two tabs both refuse delete.

### UI checks

- Alignment, spacing, and control size on the demo banner on the shell.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The banner is not a control. It must not trap focus.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-01`, `TEAM-05`, `AUTH-13`

### Suspected bugs

- None found in the three call sites. Confirm isDemoMode only accepts the string true.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-15 Private host and GitHub allowlist

- **ID:** AUTH-15
- **Name:** Private host and GitHub allowlist
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `lib/auth-allowlist.ts`
- `lib/auth.config.ts`
- `lib/auth.ts`

### Expected behavior

When AUTH_ALLOWED_GITHUB is non-empty, the host is private. Password registration and password login return null or the private-host error. SAML, Google, OIDC, and passkeys are refused. Only GitHub accounts whose login or numeric id is in the comma-separated list may sign in. The jwt and authorized callbacks drop sessions that are not on the list. An empty variable leaves signup open.

### Acceptance criteria

- [ ] A listed GitHub user can sign in.
- [ ] An unlisted GitHub user cannot.
- [ ] Password login does not create a session on that host.
- [ ] SAML does not create a session on that host.
- [ ] Clearing the variable restores password signup.

### Test cases

#### Normal use
- Set the allowlist to one GitHub login and sign in as that user. Then try a second GitHub user.
#### Empty, missing, whitespace-only, and very long input
- Set the variable to spaces or a trailing comma. Confirm parsing trims and does not allow everyone.
#### Wrong types, special characters, emoji, and non-English text
- Use a login with different case. The jwt callback lowercases GitHub logins. The allowlist should be compared the same way.
#### SQL injection, XSS, and path traversal
- The allowlist is not taken from the query string. A user cannot add themselves by typing a login into a form.
#### Logged out, expired session, wrong role, and another user's data
- An existing password session, after the host becomes private, must fail the authorized check on the next request.
#### Double-submit and parallel requests
- Two GitHub users in two browsers: only the listed one enters.
#### External service failing, timing out, and rate limiting
- GitHub being down blocks the only door. That is expected. The app should not fall back to password.
#### New user with no data, and a user with lots of data
- A private host with no teams yet still only lets the allowed GitHub user reach onboarding.
#### Refresh mid-action, back button, and two tabs
- Refresh after a denied callback. The error stays on login. Two tabs share the allowlist decision.

### UI checks

- Alignment, spacing, and control size on the login page on a private host, GitHub only.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Only the GitHub button should be the successful path. Tab should not offer a working password submit.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-05`, `DEVOPS-01`

### Suspected bugs

- lib/auth.config.ts signIn returns false for every non-GitHub provider when the host is private. That matches the README. Confirm password authorize returns null (lib/auth.ts isPrivateHost check).

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## AUTH-16 Sign-in rate limit

- **ID:** AUTH-16
- **Name:** Sign-in rate limit
- **Priority:** P0
- **Status:** NOT STARTED

### Files

- `lib/actions/auth.ts`
- `lib/rate-limit.ts`
- `app/api/auth/password/route.ts`

### Expected behavior

register, login, passkey, and the password POST share rateLimitShared. Login and register use 30 per 60 seconds per client IP (x-forwarded-for, else local). The key is auth:{action}:{ip} for actions and auth:login:{ip} for the route. The 31st response is an error or a redirect with error=Throttle. The limiter is one atomic SQL upsert. If Postgres throws, it falls open to the per-instance memory limiter rather than failing the request.

### Acceptance criteria

- [ ] 30 failures are allowed and the 31st is throttled.
- [ ] A different IP has its own window.
- [ ] A successful login still counts as an attempt.
- [ ] When the database is down, the memory limiter still caps the instance.

### Test cases

#### Normal use
- Fail login 30 times from one address and confirm the 31st is Throttle.
#### Empty, missing, whitespace-only, and very long input
- Send an empty password 31 times. All fail, and the last is throttled.
#### Wrong types, special characters, emoji, and non-English text
- Send a non-English password and a script-tag email. They count as failures, not as a bypass.
#### SQL injection, XSS, and path traversal
- Confirm the rate-limit key is not taken from user-controlled JSON. Only the IP and the action name are used. Spoofing x-forwarded-for is a deployment concern: the app trusts the first forwarded address.
#### Logged out, expired session, wrong role, and another user's data
- The limit applies before the password check on the route (the route throttles first). A logged-in user is not exempt from the route.
#### Double-submit and parallel requests
- Send 30 parallel failures. The SQL upsert must not lose counts. The 31st overall still throttles.
#### External service failing, timing out, and rate limiting
- Stop Postgres and confirm a burst is still limited in that process, and that login does not 500 solely because the limiter’s deleteMany failed.
#### New user with no data, and a user with lots of data
- A new IP with no bucket starts at zero. A busy IP stays limited until the window resets.
#### Refresh mid-action, back button, and two tabs
- Refresh after a throttle. The error stays until the window passes. Two tabs share the same IP bucket.

### UI checks

- Alignment, spacing, and control size on the login and register error text.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. The throttle is an inline error or a query param.
- Keyboard: After a throttle, focus stays on the form and the button can be activated again after the window.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DATA-02`

### Suspected bugs

- lib/rate-limit.ts:71-72 fails open to per-process memory when Postgres errors. That is intentional and is also a risk on a multi-instance host during a database blip.
- The route trusts the first x-forwarded-for value (app/api/auth/password/route.ts).

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## TEAM-01 Onboarding and team creation

- **ID:** TEAM-01
- **Name:** Onboarding and team creation
- **Priority:** P0
- **Status:** NOT STARTED

### Files

- `app/onboarding/page.tsx`
- `components/onboarding-form.tsx`
- `lib/actions/teams.ts`
- `lib/services/teams.ts`

### Expected behavior

A signed-in user with no usable team opens /onboarding, heading Create your team. The form takes a name and an optional slug. createTeamSchema requires a name of 1–80 characters and, if present, a slug of 2–48 characters matching lowercase letters, digits, and single hyphens. The creator becomes OWNER. Default workflow statuses are created. Cycles default off. Demo mode does not block team creation in the action that was read; registration is the demo lock. A private host still requires an allowed GitHub session to reach the page.

### Acceptance criteria

- [ ] Submitting a valid name creates a team and opens its issues page.
- [ ] An empty name is rejected.
- [ ] A duplicate slug is rejected.
- [ ] The creator is OWNER.
- [ ] A signed-out visitor is redirected to login.

### Test cases

#### Normal use
- Create a team named Acme with a blank slug and land on its issues.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty name, spaces, a 1-character slug, and an 81-character name. Expect errors and no team.
#### Wrong types, special characters, emoji, and non-English text
- Use a name of emoji and CJK, and a slug of ACME (uppercase). The slug must be rejected or normalized to the pattern. The name should display as text.
#### SQL injection, XSS, and path traversal
- Use a name of <script> and a slug of ../admin. The slug fails the regex. The script name, if the slug is omitted, is text in the sidebar.
#### Logged out, expired session, wrong role, and another user's data
- Signed out redirects. A member cannot create a team inside someone else's slug. Two users can each create their own team.
#### Double-submit and parallel requests
- Double-click Create. One team, one owner membership.
#### External service failing, timing out, and rate limiting
- Database down shows an error and no partial team without an owner.
#### New user with no data, and a user with lots of data
- A new user sees this page. A user who already has a team can still open onboarding if the route allows it; they must not lose the old team.
#### Refresh mid-action, back button, and two tabs
- Refresh after success lands on the team. Back should not create a second team from a replayed post. Two tabs with the same slug: one wins.

### UI checks

- Alignment, spacing, and control size on the onboarding card.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Tab through name, slug, and submit. Enter submits.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-02`, `AUTH-04`, `DATA-01`

### Suspected bugs

- None found in the onboarding heading and createTeamSchema.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## TEAM-02 Team list and switcher

- **ID:** TEAM-02
- **Name:** Team list and switcher
- **Priority:** P0
- **Status:** PASSED

### Files

- `components/app-sidebar.tsx`
- `app/t/page.tsx`
- `app/t/go/page.tsx`

### Expected behavior

The sidebar lists the signed-in user's teams and navigates to /t/{slug}/issues. The current team is marked. /t is the team index for a signed-in user. /t/go is a short redirect helper. A guest still sees the teams they belong to. The switcher closes on Escape and on a click outside.

### Acceptance criteria

- [ ] The switcher shows only the user's teams.
- [ ] Choosing another team opens that team's issues.
- [ ] Choosing the current team does not navigate.
- [ ] A user with one team still sees it.
- [ ] Keyboard users can close the list with Escape.

### Test cases

#### Normal use
- Open the switcher and move to a second team.
#### Empty, missing, whitespace-only, and very long input
- A user with one team opens the list and sees that team only. An empty name falls back to the letter T (sidebar initial).
#### Wrong types, special characters, emoji, and non-English text
- A team name of emoji and a long German name truncates in the button and is fully available to the screen reader as the button text.
#### SQL injection, XSS, and path traversal
- A team name stored as HTML renders as text.
#### Logged out, expired session, wrong role, and another user's data
- A signed-out user never sees the switcher. User A does not see user B's team.
#### Double-submit and parallel requests
- Click two teams quickly. The last navigation wins and the membership check still applies.
#### External service failing, timing out, and rate limiting
- If listing teams throws, the layout should take the error page rather than an empty switcher that looks like zero teams.
#### New user with no data, and a user with lots of data
- A new owner with one team, and a member of many teams, both see the correct set.
#### Refresh mid-action, back button, and two tabs
- Refresh keeps the current slug. Two tabs can show two teams. The switcher in each tab shows the same membership set.

### UI checks

- Alignment, spacing, and control size on the sidebar team button and its listbox.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The list is a popup listbox, not a modal. It closes on Escape and outside click.
- Keyboard: The button exposes aria-expanded and aria-controls. Arrow-key support inside the listbox should be checked; the options are buttons.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-01`, `AUTH-04`

### Suspected bugs

- None found in the switcher (components/app-sidebar.tsx TeamSwitcher).

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## TEAM-03 Membership gate and roles

- **ID:** TEAM-03
- **Name:** Membership gate and roles
- **Priority:** P0
- **Status:** NOT STARTED

### Files

- `lib/roles.ts`
- `lib/rbac.ts`
- `prisma/schema.prisma`

### Expected behavior

Every team action checks the caller's membership. Roles are OWNER, ADMIN, MEMBER, and GUEST. assertRole enforces a minimum. Owners outrank admins. Guests are members of the team but read-mostly, and TEAM-08 can limit them to projects. API keys have their own role capped by the creator's current team role. A user removed from the team loses the layout on the next request (not-found) and their keys stop.

### Acceptance criteria

- [ ] A member can open the team.
- [ ] A non-member cannot.
- [ ] An admin-only settings page is hidden or refused for a member.
- [ ] A guest cannot hit a member-only write.
- [ ] Demoting a key's creator drops the key's power immediately.

### Test cases

#### Normal use
- As a member, open issues. As an admin, open workflow settings.
#### Empty, missing, whitespace-only, and very long input
- Call a write with an empty body. Expect a validation error, not a role bypass.
#### Wrong types, special characters, emoji, and non-English text
- Role names are fixed enums. Sending role=owner (lowercase) or a translated word must not grant OWNER.
#### SQL injection, XSS, and path traversal
- Send role=<script> and a membership id of ../. Expect 400 or 404, not a role change.
#### Logged out, expired session, wrong role, and another user's data
- Signed out is 401 on the API and a login redirect on the page. A member calling an admin action is refused. User A cannot read team B.
#### Double-submit and parallel requests
- Two admins changing the same member: the last write wins and the audit log shows both if both are allowed.
#### External service failing, timing out, and rate limiting
- Database down fails the check closed (the page errors or the API 500s, and does not default to OWNER).
#### New user with no data, and a user with lots of data
- A new team has one owner. A team with every role shows the right nav to each.
#### Refresh mid-action, back button, and two tabs
- Demote yourself in one tab and keep an admin page open in another. The next action uses the new role.

### UI checks

- Alignment, spacing, and control size on the sidebar and settings, which change with role.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Admin links that are hidden must also be refused on the server when the URL is typed.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-01`, `AUTH-04`

### Suspected bugs

- None found in the role enum. Guest read exceptions are TEAM-08.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## TEAM-04 Team settings

- **ID:** TEAM-04
- **Name:** Team settings
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/settings/page.tsx`
- `components/team-settings-form.tsx`
- `lib/actions/teams.ts`
- `components/settings-nav.tsx`

### Expected behavior

Settings → General edits the team: name, slug, cycle length (1–8 weeks), GitHub repo (owner/name), GitLab project path, Slack webhook and workspace/channel ids, SLA hour map, cycle cooldown, triage owner, estimate scale, private flag, and parent team. The parent cannot be the team itself. Slugs match the same pattern as creation. Admins or owners can save; members can open general settings but writes are checked in the action. The settings nav highlights the active section. Private and parent are fields on the form.

### Acceptance criteria

- [ ] A valid save updates the team and the sidebar name.
- [ ] A bad slug or a bad GitHub repo string is rejected.
- [ ] Setting the parent to itself is stored as no parent.
- [ ] Estimate scale choices match the scales the issue form offers.
- [ ] A member who is not an admin cannot change admin-only fields if the action checks the role.

### Test cases

#### Normal use
- Change the team name and the cycle length to 2 and see both stick after refresh.
#### Empty, missing, whitespace-only, and very long input
- Clear the name, set a slug of one character, and set Slack ids to spaces. Expect errors.
#### Wrong types, special characters, emoji, and non-English text
- Set a name with emoji and a GitLab path with the allowed characters. A path with spaces is rejected.
#### SQL injection, XSS, and path traversal
- Set the name to a script tag and the Slack webhook to javascript:alert(1). The name is text. The webhook must be an http(s) URL or rejected.
#### Logged out, expired session, wrong role, and another user's data
- A guest or a non-member cannot save. A member of another team cannot post this team's id.
#### Double-submit and parallel requests
- Two admins save different names. The later save wins. Double-click sends one or two identical writes.
#### External service failing, timing out, and rate limiting
- An unreachable database leaves the old name.
#### New user with no data, and a user with lots of data
- A new team shows defaults (fibonacci estimates, cycles off, UTC). A fully configured team shows the saved values.
#### Refresh mid-action, back button, and two tabs
- Refresh mid-save. Two tabs: both show the saved name after refresh.

### UI checks

- Alignment, spacing, and control size on the general settings form and the settings nav.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- Selects for estimate scale and parent team. No modal.
- Keyboard: Tab through every field. The nav links are real links.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-03`

### Suspected bugs

- components/settings-nav.tsx:77-80 marks a link active with startsWith, so Settings → Import stays active on /settings/import/csv together with CSV import.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## TEAM-05 Delete team

- **ID:** TEAM-05
- **Name:** Delete team
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `lib/services/teams.ts`
- `lib/actions/teams.ts`
- `components/team-settings-form.tsx`

### Expected behavior

deleteTeam requires OWNER. In demo mode it throws DEMO_LOCKED (403). Otherwise it deletes the team row and cascaded children. The owner must confirm, including typing the team name if the form requires it (the form should be checked at test time). After delete, the slug 404s.

### Acceptance criteria

- [ ] The owner can delete a non-demo team and can no longer open it.
- [ ] An admin cannot.
- [ ] Demo mode refuses and the team remains.
- [ ] Issues, memberships, and keys for that team go with it.

### Test cases

#### Normal use
- As owner, delete a disposable team and confirm the slug 404s.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty confirmation if the form asks for the name. Expect no delete.
#### Wrong types, special characters, emoji, and non-English text
- Type the name with different case, emoji, and extra spaces. Only an exact match should delete, if that is what the form checks.
#### SQL injection, XSS, and path traversal
- Post the action with a slug of another team. The action loads the team from the route slug the owner belongs to, not from a free field.
#### Logged out, expired session, wrong role, and another user's data
- An admin and a member are refused. A signed-out post redirects or 401s.
#### Double-submit and parallel requests
- Double-click delete. The second request 404s. Two owners are impossible; one owner in two tabs: one delete.
#### External service failing, timing out, and rate limiting
- A database error during delete should not report success.
#### New user with no data, and a user with lots of data
- A new empty team can be deleted. A team with many issues can be deleted and those issues are gone.
#### Refresh mid-action, back button, and two tabs
- Refresh after delete goes to not-found or the team list. The other tab errors on the next click.

### UI checks

- Alignment, spacing, and control size on the danger zone on team settings.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The confirm control must be separate from Save.
- Keyboard: The delete button is last in tab order and does not sit on the primary save.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-03`, `AUTH-14`

### Suspected bugs

- lib/services/teams.ts:87-96 deletes by id after the owner and demo checks. Confirm the UI requires typing the name so a mis-click cannot delete.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## TEAM-06 Team invites

- **ID:** TEAM-06
- **Name:** Team invites
- **Priority:** P0
- **Status:** PASSED

### Files

- `lib/email.ts`
- `lib/actions/teams.ts`
- `app/(auth)/invite/[token]/page.tsx`
- `components/members-settings.tsx`

### Expected behavior

An admin or owner invites an email with a role. The stored row keeps a hash of the token, not the raw token. The link is /invite/{token} and expires in 7 days. If RESEND_API_KEY is set, Resend sends it. If not, the UI shows the link and says to copy it. The invite page requires a session. acceptInviteAction joins the team when the signed-in email matches, then redirects to that team's issues. Owners are not created by an invite. A used or unknown token fails in the service.

### Acceptance criteria

- [ ] A member invite shows in the pending list.
- [ ] The email is sent or the link is shown.
- [ ] The matching user who accepts becomes that role and lands on the issues page.
- [ ] A different signed-in email is refused.
- [ ] An expired or reused token does not create a membership.

### Test cases

#### Normal use
- Invite a new address as Member, open the link as that user, and land on the team as Member.
#### Empty, missing, whitespace-only, and very long input
- Invite a blank email, spaces, and a 300-character string. Expect a validation error.
#### Wrong types, special characters, emoji, and non-English text
- Invite an address with a plus tag and a name in another language in the inviter profile. The mail escapes HTML (lib/email.ts escapeHtml).
#### SQL injection, XSS, and path traversal
- Invite email <script>@x.co and a role of OWNER injected as an extra field. The email fails or is stored as text. A member must not be able to mint an OWNER invite if the action caps the role.
#### Logged out, expired session, wrong role, and another user's data
- Signed out, the invite URL redirects to login with that callback. User A cannot accept an invite addressed to user B. A guest invite is the GUEST role, not a member.
#### Double-submit and parallel requests
- Double-click Accept. One membership. Two admins inviting the same email: one pending invite or a clear duplicate error.
#### External service failing, timing out, and rate limiting
- With Resend failing, the action returns the copy-link error and still creates the invite. A down database creates nothing.
#### New user with no data, and a user with lots of data
- A brand-new account can accept. A user who is already a member gets a defined message, not a second membership.
#### Refresh mid-action, back button, and two tabs
- Refresh the invite page. Back after accept should not create a second membership. Two tabs accepting one link: one success.

### UI checks

- Alignment, spacing, and control size on the members settings invite form and the invite accept page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. Errors on the accept page are currently missing.
- Keyboard: Tab through email, role, and invite. On the accept page, Accept is the only control.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-03`, `AUTH-02`

### Suspected bugs

- app/(auth)/invite/[token]/page.tsx:26-28 ignores the return value of acceptInviteAction, so an invalid, expired, or wrong-email failure never renders. The page stays on Team invite.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## TEAM-07 Workspaces and workspace invites

- **ID:** TEAM-07
- **Name:** Workspaces and workspace invites
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/w/[workspaceSlug]/page.tsx`
- `components/workspace-forms.tsx`
- `components/workspace-members.tsx`
- `app/(auth)/invite/workspace/[token]/page.tsx`
- `lib/actions/workspaces.ts`

### Expected behavior

Teams can belong to a workspace. The workspace page lists members and teams and can invite by email. The token is stored as a hash. Accepting requires a session and lands on the workspace. A member of the workspace who is not an admin does not see invite or add-team controls. Workspace role is the workspace membership, separate from each team's role.

### Acceptance criteria

- [ ] The owner can invite and the invitee can accept.
- [ ] A non-admin workspace member cannot invite.
- [ ] A bad token does not add a member.
- [ ] Creating a team inside the workspace sets workspaceId.
- [ ] A signed-out invite link goes to login first.

### Test cases

#### Normal use
- Invite an email, accept, and see the workspace page as that user.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty email. Expect no invite row.
#### Wrong types, special characters, emoji, and non-English text
- Use a non-English display name and an emoji in the workspace name. Both render as text.
#### SQL injection, XSS, and path traversal
- Post a token of ../ and a script-tag email. No membership is created for an arbitrary user.
#### Logged out, expired session, wrong role, and another user's data
- User A cannot accept user B's invite. A team guest is not automatically a workspace admin.
#### Double-submit and parallel requests
- Double-click Accept. One workspace membership.
#### External service failing, timing out, and rate limiting
- Resend down still shows the link. Database down creates nothing.
#### New user with no data, and a user with lots of data
- A new user with no team can accept a workspace invite. A workspace with many teams lists them.
#### Refresh mid-action, back button, and two tabs
- Two tabs accepting one link: one membership. Refresh after accept shows the workspace.

### UI checks

- Alignment, spacing, and control size on the workspace page and the workspace invite page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Invite and Add team are absent, not just hidden with CSS, for a member.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-01`, `TEAM-06`

### Suspected bugs

- app/(auth)/invite/workspace/[token]/page.tsx:28-30 ignores acceptWorkspaceInviteAction's error, same as the team invite page.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## TEAM-08 Members, roles, and guest project scope

- **ID:** TEAM-08
- **Name:** Members, roles, and guest project scope
- **Priority:** P0
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/settings/members/page.tsx`
- `components/members-settings.tsx`
- `components/guest-access-settings.tsx`
- `lib/actions/members.ts`
- `lib/services/guest-scope.ts`
- `app/api/teams/[teamId]/members/route.ts`

### Expected behavior

Admins manage members. They can change a role, remove a member, and set guestProjectIds. An empty guest project list means the guest sees the whole team. A non-empty list limits issue lists, search, live updates, export, and demand to those projects. Owners are not demoted by SCIM; the in-app path must be checked so the last owner cannot be removed. Removed members lose keys because key power follows the creator's membership.

### Acceptance criteria

- [ ] An admin can promote a member to admin and demote them back.
- [ ] An admin can remove a member.
- [ ] A guest limited to one project does not see other projects' issues.
- [ ] A member cannot open the remove action successfully.
- [ ] The actor cannot remove the last owner.

### Test cases

#### Normal use
- Change a member to Guest, limit them to one project, and sign in as them. The issues list is only that project.
#### Empty, missing, whitespace-only, and very long input
- Set the role select to empty. Expect no change. Clear all guest projects and confirm the guest sees the team again.
#### Wrong types, special characters, emoji, and non-English text
- Project names with emoji still match by id, not by the label.
#### SQL injection, XSS, and path traversal
- Post a role of <script> and a project id of ../. Expect a validation error.
#### Logged out, expired session, wrong role, and another user's data
- A member cannot remove an admin. User A cannot edit team B's members. A signed-out post fails.
#### Double-submit and parallel requests
- Two admins removing the same member: one success, the second a not-found. Double-click role save: one role.
#### External service failing, timing out, and rate limiting
- Database down leaves the old role.
#### New user with no data, and a user with lots of data
- A team with one owner shows that owner. A team with many guests applies each guest's own project list.
#### Refresh mid-action, back button, and two tabs
- Change the role in one tab and refresh the other. The member's open issue page 404s after removal on the next request.

### UI checks

- Alignment, spacing, and control size on the members settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- Role is a select. Guest projects are a checklist. No modal unless the remove control asks.
- Keyboard: Each row's role control and remove button are keyboard reachable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-03`, `TEAM-06`

### Suspected bugs

- None found in removeMemberAction, which requires ADMIN (lib/actions/members.ts). There is no self-serve leave. That is GAP-05.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## GAP-05 Leave a team

- **ID:** GAP-05
- **Name:** Leave a team
- **Priority:** P1
- **Status:** BLOCKED

### Files

- `lib/actions/members.ts`
- `components/members-settings.tsx`

### Expected behavior

removeMemberAction requires ADMIN. A member or guest who wants to leave has no action. They remain in the team, keep receiving notifications, and keep their keys until an admin removes them. This item is a Leave team control that deletes the caller's own membership, refuses the last owner, and revokes that person's keys.

### Acceptance criteria

- [ ] A member can leave and then receives not-found for the team.
- [ ] The last owner cannot leave.
- [ ] Keys for that team stop.
- [ ] Other members stay.

### Test cases

#### Normal use
- As a member, leave and confirm the team disappears from the switcher.
#### Empty, missing, whitespace-only, and very long input
- There is no text field. If a confirm-name field is added, empty and whitespace must not leave.
#### Wrong types, special characters, emoji, and non-English text
- Not applicable beyond the confirm string, if any.
#### SQL injection, XSS, and path traversal
- Post another user's membership id to the leave action. It must ignore that id and only remove the caller, or refuse.
#### Logged out, expired session, wrong role, and another user's data
- A signed-out post fails. An admin using Leave removes only themselves, not the person they were looking at.
#### Double-submit and parallel requests
- Double-click Leave. One removal.
#### External service failing, timing out, and rate limiting
- Database failure keeps the membership.
#### New user with no data, and a user with lots of data
- A guest with a project scope can leave. An owner who is the only owner cannot.
#### Refresh mid-action, back button, and two tabs
- Two tabs: after leave, both 404 on the next navigation.

### UI checks

- Alignment, spacing, and control size on a leave control on account or team settings, not built.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- It should be a confirmed button, not the admin Remove button.
- Keyboard: The control is keyboard reachable and is not the default Enter target of the invite form.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-08`

### Suspected bugs

- lib/actions/members.ts:121 requires ADMIN for removeMemberAction. No leave action exists.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-01 Create an issue

- **ID:** ISSUE-01
- **Name:** Create an issue
- **Priority:** P0
- **Status:** PASSED

### Files

- `components/create-issue-form.tsx`
- `components/global-create-issue.tsx`
- `lib/actions/issues.ts`
- `lib/services/issues.ts`
- `app/api/teams/[teamId]/issues/route.ts`
- `lib/validators/index.ts`

### Expected behavior

A member creates an issue with a title and optional description, status, priority, estimate, due date, assignee, cycle, project, milestone, labels, and parent. The title is required, trimmed, and limited (the validator rejects blank and over-long titles). The team issue counter assigns the number inside a transaction (maxWait 10s, timeout 20s, lib/services/issues.ts:440). clientMutationId returns the same issue instead of creating a second one. Guests cannot create. The global create control and the new-issue form both use this path. Workflow status, if set, overrides the coarse status.

### Acceptance criteria

- [ ] A normal title creates an issue with the next number and TEAM visibility.
- [ ] Whitespace-only and empty titles are rejected.
- [ ] A repeated clientMutationId does not create a second row.
- [ ] A guest and a signed-out caller are refused.
- [ ] The new issue appears on the list and the board.

### Test cases

#### Normal use
- Create an issue titled Ship the login fix with priority High and a due date. Expect a number and the issue page.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty title, spaces, and a title over the validator max. Expect 400 from the API and a form error in the UI.
#### Wrong types, special characters, emoji, and non-English text
- Use emoji, CJK, and quotes in the title. They are stored and shown as text.
#### SQL injection, XSS, and path traversal
- Use a title of <script>alert(1)</script> and a description of ' OR 1=1. The title is text in the list. The API returns 400 for malformed JSON and for an array body.
#### Logged out, expired session, wrong role, and another user's data
- Signed out, POST returns 401. A guest is forbidden. A member of another team cannot create in this team.
#### Double-submit and parallel requests
- Double-click Create. One issue, unless the two requests have different mutation ids and both pass. The same clientMutationId returns the first issue.
#### External service failing, timing out, and rate limiting
- If the counter lock waits longer than 20 seconds the create fails. A down database returns an error and no number is skipped silently without a row.
#### New user with no data, and a user with lots of data
- The first issue in a new team is number 1. A team with many issues gets the next number.
#### Refresh mid-action, back button, and two tabs
- Refresh during create. Back should not duplicate if the mutation id is reused. Two tabs creating at once get two numbers.

### UI checks

- Alignment, spacing, and control size on the new issue form and the global create dialog.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The global create control is a dialog. It traps focus and closes on Escape without creating.
- Keyboard: Tab through title, description, and the field selects. Cmd-or-Ctrl-Enter may submit if the form binds it; Enter in the title should not lose the draft.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-03`, `SET-01`

### Suspected bugs

- lib/services/issues.ts:440. A create that cannot get the counter lock within 10 seconds, or that runs longer than 20 seconds, fails. Replaying a client mutation id returns the same success status as a new create.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-02 View and update an issue

- **ID:** ISSUE-02
- **Name:** View and update an issue
- **Priority:** P0
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/issues/[issueNumber]/page.tsx`
- `components/issue-editor.tsx`
- `app/api/teams/[teamId]/issues/[issueId]/route.ts`

### Expected behavior

The issue page loads one issue by team and number. Members can change title, description, status, priority, estimate, assignee, cycle, project, due date, and workflow status. Updates send the revision they started from. A stale revision opens a keep-mine or keep-theirs choice instead of a silent overwrite. DELETE removes the issue. A guest who cannot see the issue gets not-found. Archived issues still open when you have the link, with restore instead of the live edit set where the editor branches on archived.

### Acceptance criteria

- [ ] The page shows the number, title, and current fields.
- [ ] A field change persists after refresh.
- [ ] A stale revision does not silently overwrite.
- [ ] A member of another team gets 404.
- [ ] Delete removes the issue from the list.

### Test cases

#### Normal use
- Open ACM-1, change priority, and refresh. The new priority remains.
#### Empty, missing, whitespace-only, and very long input
- Clear the title and save. Expect a validation error and the old title.
#### Wrong types, special characters, emoji, and non-English text
- Set the title to emoji and a long CJK string. It wraps or truncates in the header without overlapping the buttons.
#### SQL injection, XSS, and path traversal
- Save a description of <script> and a title of ' OR 1=1. The page shows text. Markdown rendering must not execute HTML.
#### Logged out, expired session, wrong role, and another user's data
- Signed out redirects. A guest outside the project gets not-found. User A cannot PATCH team B's issue id.
#### Double-submit and parallel requests
- Two tabs save different titles. One gets the conflict dialog. Double-click save sends one or shows the conflict, not two histories that drop a revision.
#### External service failing, timing out, and rate limiting
- Database down shows the error page or a save error. The field does not look saved.
#### New user with no data, and a user with lots of data
- A new issue has an empty description and no comments. An old issue shows its full description.
#### Refresh mid-action, back button, and two tabs
- Refresh mid-save. Back returns to the list without reverting the save. Two tabs stay honest after refresh.

### UI checks

- Alignment, spacing, and control size on the issue page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The conflict UI is a dialog with keep-mine and keep-theirs. Escape must not pick one silently.
- Keyboard: Status, priority, and assignee controls are keyboard operable. The title is an editable field.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-01`, `AUTH-04`

### Suspected bugs

- None found in the revision conflict described by the editor. Confirm the dialog names both versions when testing.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-03 Issue list, my issues, and display options

- **ID:** ISSUE-03
- **Name:** Issue list, my issues, and display options
- **Priority:** P0
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/issues/page.tsx`
- `components/issues-list-client.tsx`
- `components/issues-display-menu.tsx`
- `lib/list-display.ts`

### Expected behavior

The issues page lists active issues. My issues is the same page with assignee=me. Display options group by status, priority, assignee, project, or cycle, and sort by priority, newest, oldest, or title. The choice is in the URL (listGroup, listSort) and is stored with a saved view. Archived issues are a separate view (ISSUE-08). Guests see only their scope. J and K move, X selects, S, P, and A open pickers. The board is layout=board.

### Acceptance criteria

- [ ] The list shows the team's active issues.
- [ ] assignee=me shows only the current user's issues.
- [ ] Grouping and sorting change the order and are reflected in the URL.
- [ ] A guest does not see out-of-scope issues.
- [ ] Keyboard focus follows the on-screen order.

### Test cases

#### Normal use
- Open issues, group by assignee, sort by title, and refresh. The URL keeps the choice.
#### Empty, missing, whitespace-only, and very long input
- Open with no issues. Expect the empty state, not a broken table. An empty search is the full list or an explicit empty filter.
#### Wrong types, special characters, emoji, and non-English text
- Group labels and issue titles with emoji stay aligned. A very long title truncates.
#### SQL injection, XSS, and path traversal
- Set listGroup to <script> and assignee to ' OR 1=1. Unknown values fall back rather than running.
#### Logged out, expired session, wrong role, and another user's data
- Signed out redirects. Another user opening assignee=me sees their own issues, not yours. A guest sees the scoped subset.
#### Double-submit and parallel requests
- Two tabs with different sorts do not overwrite each other; the URL is the state.
#### External service failing, timing out, and rate limiting
- A slow list shows the team loading state (app/t/[teamSlug]/loading.tsx) rather than a blank shell.
#### New user with no data, and a user with lots of data
- A new team shows the empty state. A team with many issues pages or scrolls without dropping the focused row.
#### Refresh mid-action, back button, and two tabs
- Refresh keeps the query. Back returns to the previous filter. Two tabs keep independent URLs.

### UI checks

- Alignment, spacing, and control size on the issues list.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The display menu is a menu. It closes on Escape.
- Keyboard: J and K move, X selects, S, P, and A open pickers, G then a letter navigates, ? opens shortcut help.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-01`, `TEAM-08`

### Suspected bugs

- app/t/[teamSlug]/issues/page.tsx:135 treats only archived=true as the archive. archived=1 stays on the live list. The export API uses a different flag. Easy to misread.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-04 Board

- **ID:** ISSUE-04
- **Name:** Board
- **Priority:** P0
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/board/page.tsx`
- `components/board-view.tsx`

### Expected behavior

The board shows columns from the team's workflow statuses. Dragging an issue to another column updates its status. The board shows live issues only; the archive is forced back to a list. Guests who cannot edit do not get a successful drop. The board page and the issues page with layout=board both reach this view.

### Acceptance criteria

- [ ] Columns match workflow statuses.
- [ ] A drop persists the new status.
- [ ] A drop by a guest or a read-only user does not change the issue.
- [ ] Archived issues are not on the board.
- [ ] An empty column still renders.

### Test cases

#### Normal use
- Drag an issue from Todo to In progress and refresh. It stays.
#### Empty, missing, whitespace-only, and very long input
- A column with no issues shows an empty column, not a missing column.
#### Wrong types, special characters, emoji, and non-English text
- An issue title with emoji drags without overflowing into the next card.
#### SQL injection, XSS, and path traversal
- Drop does not take a raw status from the DOM that is outside the team's workflow. A forged status in the request is rejected.
#### Logged out, expired session, wrong role, and another user's data
- Signed out redirects. A guest without write access cannot move a card. Another team's issue id is rejected.
#### Double-submit and parallel requests
- Two people drag the same card. One update wins and the other sees the new column on refresh or through live updates.
#### External service failing, timing out, and rate limiting
- If the PATCH fails, the card returns to the original column.
#### New user with no data, and a user with lots of data
- A new team shows the default columns and no cards. A full backlog scrolls inside the column.
#### Refresh mid-action, back button, and two tabs
- Refresh mid-drag cancels the drag. Back leaves the board. Two tabs both show the dropped status after refresh.

### UI checks

- Alignment, spacing, and control size on the board columns.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. Drag is pointer-driven. Keyboard users need another way to change status (the issue page or the list picker).
- Keyboard: Confirm a keyboard path exists to change status. Drag alone is not enough for keyboard-only users.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `SET-01`

### Suspected bugs

- The archive cannot be a board (app/t/[teamSlug]/issues/page.tsx comment at the archived check). That is intended.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-05 Comments

- **ID:** ISSUE-05
- **Name:** Comments
- **Priority:** P1
- **Status:** PASSED

### Files

- `components/issue-comments.tsx`
- `lib/services/comments.ts`
- `app/api/teams/[teamId]/issues/[issueId]/comments/route.ts`

### Expected behavior

Members add a comment on an issue. Replies set parentId and the service checks the parent belongs to the same issue and that the depth is allowed. The body is markdown rendered without raw HTML. The author can delete their comment; an admin can delete others where the service allows it. Guests can read comments on issues they can see and cannot post if the write check says so. Offline comment create is queued (OFFLINE-02).

### Acceptance criteria

- [ ] A comment appears under the issue after submit.
- [ ] An empty body is rejected.
- [ ] A reply nests under its parent.
- [ ] A script tag in the body is text.
- [ ] A user cannot comment on an issue they cannot see.

### Test cases

#### Normal use
- Post a comment and a reply and refresh.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty body, spaces, and a very long body. Empty fails. The long body is capped or accepted and still renders.
#### Wrong types, special characters, emoji, and non-English text
- Post emoji, CJK, and markdown. Markdown formats. HTML does not run.
#### SQL injection, XSS, and path traversal
- Post <script>alert(1)</script> and a body of ' OR 1=1. Both are text. The parent id is a cuid, not a path.
#### Logged out, expired session, wrong role, and another user's data
- Signed out is 401. A guest outside the project cannot read or post. User A cannot delete user B's comment unless they are an admin and the service allows it.
#### Double-submit and parallel requests
- Double-click Post. One comment, or two if the client does not send a mutation id. Record which. Parallel posts both appear.
#### External service failing, timing out, and rate limiting
- Database down leaves the composer filled and shows an error.
#### New user with no data, and a user with lots of data
- An issue with no comments shows an empty prompt. An issue with a long thread scrolls.
#### Refresh mid-action, back button, and two tabs
- Refresh mid-post. Back does not lose a saved comment. Two tabs both show the new comment after refresh.

### UI checks

- Alignment, spacing, and control size on the comment thread on the issue page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. The composer is inline.
- Keyboard: Tab to the composer and submit with the button. A shortcut, if any, is listed in the shortcut help.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`

### Suspected bugs

- None found in the parent-comment check (lib/services/comments.ts). Confirm depth limit when testing.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-06 Sub-issues

- **ID:** ISSUE-06
- **Name:** Sub-issues
- **Priority:** P1
- **Status:** PASSED

### Files

- `components/issue-sub-issues.tsx`
- `lib/services/sub-issues.ts`
- `lib/sub-issues.ts`
- `app/api/teams/[teamId]/issues/[issueId]/sub-issues/route.ts`

### Expected behavior

An issue has one parent. The tree is capped at 8 levels. The parent shows a progress bar. Team settings can copy the parent's project, cycle, and labels onto a new sub-issue (subIssueInherit) and can complete the parent when the last child is done (autoCloseParent). Cycles and self-parenting are rejected. The API and MCP can create and reparent.

### Acceptance criteria

- [ ] Creating a sub-issue links it and updates the parent's progress.
- [ ] The 9th level is rejected.
- [ ] An issue cannot be its own parent.
- [ ] Inherit copies the configured fields.
- [ ] Finishing the last child finishes the parent only when the setting is on.

### Test cases

#### Normal use
- Add a sub-issue and see the progress bar move when it is done.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty child title. Expect the same title validation as ISSUE-01.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji title. It shows in the child list.
#### SQL injection, XSS, and path traversal
- Set parentId to the issue itself and to a path. Both are rejected.
#### Logged out, expired session, wrong role, and another user's data
- A guest cannot create a child. A member cannot parent an issue from another team.
#### Double-submit and parallel requests
- Two people adding children get two children and one progress total.
#### External service failing, timing out, and rate limiting
- A failed create does not change the progress bar.
#### New user with no data, and a user with lots of data
- A parent with no children shows an empty child list. A parent with many children scrolls.
#### Refresh mid-action, back button, and two tabs
- Reparent in two tabs. The refresh shows one parent. Back does not leave two parents.

### UI checks

- Alignment, spacing, and control size on the sub-issue list on the issue page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal beyond the create form.
- Keyboard: Add sub-issue is a button. The progress bar has text, not color alone.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-01`, `TEAM-04`

### Suspected bugs

- None found in the depth rule described by the service. Confirm the constant is 8 when testing.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-07 Relations, duplicates, and blocking

- **ID:** ISSUE-07
- **Name:** Relations, duplicates, and blocking
- **Priority:** P1
- **Status:** PASSED

### Files

- `components/issue-relations.tsx`
- `lib/services/relations.ts`
- `lib/relation-pairs.ts`
- `app/api/teams/[teamId]/issues/[issueId]/relations/route.ts`
- `app/api/teams/[teamId]/issues/[issueId]/relations/[relationId]/route.ts`

### Expected behavior

A member can link another issue as blocking, blocked-by, related, or duplicate. Marking a duplicate cancels the duplicate and moves its watchers to the original. A blocking cycle is rejected. The relation can be removed. The picker searches by number and title.

### Acceptance criteria

- [ ] Linking #2 as blocked by #1 shows on both issues.
- [ ] A loop is rejected and nothing is saved.
- [ ] Duplicate cancels the duplicate issue.
- [ ] Removing the relation clears both sides.
- [ ] A link to another team's number is rejected.

### Test cases

#### Normal use
- Mark one issue as blocking another and see both sides.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty issue number. Expect no relation.
#### Wrong types, special characters, emoji, and non-English text
- Search with emoji and a partial title. The picker filters.
#### SQL injection, XSS, and path traversal
- Enter #1; DROP TABLE and <script>. No relation, no execution.
#### Logged out, expired session, wrong role, and another user's data
- A guest cannot add a relation. User A cannot link team B.
#### Double-submit and parallel requests
- Double-click Add. One relation. Two opposite links that would cycle: the second fails.
#### External service failing, timing out, and rate limiting
- A failed save leaves the list unchanged.
#### New user with no data, and a user with lots of data
- An issue with no relations shows the empty add control. An issue with many relations wraps.
#### Refresh mid-action, back button, and two tabs
- Add in one tab and remove in the other. Refresh shows the survivor.

### UI checks

- Alignment, spacing, and control size on the relations block.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The issue picker is a listbox. Escape closes it.
- Keyboard: The picker is type-to-filter and keyboard selectable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`

### Suspected bugs

- None found in the cycle rejection described by the relation service.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-08 Archive, restore, and purge

- **ID:** ISSUE-08
- **Name:** Archive, restore, and purge
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `lib/services/issues.ts`
- `app/api/teams/[teamId]/issues/[issueId]/archive/route.ts`
- `app/t/[teamSlug]/issues/page.tsx`

### Expected behavior

Archive sets archivedAt and removes the issue from the live list and the board. The archive view is the issues page with archived=true. Restore clears archivedAt. The daily cron (JOB-01) permanently deletes issues archived more than 30 days ago. Activity records archive and restore. Guests cannot archive.

### Acceptance criteria

- [ ] Archive removes the issue from the live list and shows it on archived=true.
- [ ] Restore brings it back.
- [ ] archived=1 does not open the archive.
- [ ] A purged issue is gone.
- [ ] A non-member cannot archive.

### Test cases

#### Normal use
- Archive an issue, open the archive, restore it, and see it on the live list.
#### Empty, missing, whitespace-only, and very long input
- Open archived= and archived=%20. Expect the live list.
#### Wrong types, special characters, emoji, and non-English text
- An archived title with emoji still appears in the archive list.
#### SQL injection, XSS, and path traversal
- POST archive with an issue id from another team. Expect 404.
#### Logged out, expired session, wrong role, and another user's data
- A guest and a signed-out user cannot archive. A member of the team can.
#### Double-submit and parallel requests
- Double-click Archive. One archivedAt. Archive and restore in parallel: the later write wins.
#### External service failing, timing out, and rate limiting
- If the write fails, the button stays on the previous label.
#### New user with no data, and a user with lots of data
- An empty archive shows an empty state. A long archive lists only archived rows.
#### Refresh mid-action, back button, and two tabs
- Refresh on the archive URL stays there. Two tabs: restore in one, the other updates on refresh.

### UI checks

- Alignment, spacing, and control size on the issue archive action and the archive list.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The archive and restore buttons are keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-03`, `JOB-01`

### Suspected bugs

- app/t/[teamSlug]/issues/page.tsx:135 requires the exact query archived=true. archived=1 leaves the live list.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-09 Bulk edit

- **ID:** ISSUE-09
- **Name:** Bulk edit
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `components/issues-list-client.tsx`
- `app/api/teams/[teamId]/issues/bulk/route.ts`
- `lib/actions/issues.ts`

### Expected behavior

Selecting rows (click, shift-click for a range, or X on the focused row) opens a bulk bar. The member can set status, priority, or assignee, or archive, restore, or delete, up to 200 issues. The API rejects a larger set. Each issue is updated with the same rules as a single edit. A guest does not get the write.

### Acceptance criteria

- [ ] A selection of three issues changes priority together.
- [ ] Shift-click selects the range in on-screen order.
- [ ] 201 ids are rejected.
- [ ] Delete removes them.
- [ ] A failed id does not claim the whole batch succeeded without saying so.

### Test cases

#### Normal use
- Select three issues and set priority to High. Refresh and confirm all three.
#### Empty, missing, whitespace-only, and very long input
- Select none and confirm the bar is hidden. Paste a blank id list to the API and expect 400.
#### Wrong types, special characters, emoji, and non-English text
- Bulk-set does not take a free-text title. Assignee names with emoji still resolve by id.
#### SQL injection, XSS, and path traversal
- Post 200 ids plus a script-tag status. Status is rejected. Ids are looked up in the team only.
#### Logged out, expired session, wrong role, and another user's data
- A guest cannot bulk-update. Another team's ids are skipped or 404.
#### Double-submit and parallel requests
- Double-click Apply. One update each. Two bulk deletes in parallel do not error on the second if the ids are already gone; the UI must not show them as still selected.
#### External service failing, timing out, and rate limiting
- A mid-batch database error is reported. Already-written rows stay written.
#### New user with no data, and a user with lots of data
- One selected issue works. A list of many issues still caps at 200.
#### Refresh mid-action, back button, and two tabs
- Refresh clears the selection. Two tabs have independent selections.

### UI checks

- Alignment, spacing, and control size on the bulk bar on the issue list.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The bar is sticky, not a modal. The status picker is a listbox.
- Keyboard: X selects the focused row. Shift-click is pointer. The picker is type-to-filter.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-03`

### Suspected bugs

- None found in the 200 cap described by the bulk route. Confirm the cap in the validator when testing.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-10 Labels

- **ID:** ISSUE-10
- **Name:** Labels
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/settings/labels/page.tsx`
- `components/labels-settings-forms.tsx`
- `components/label-checklist.tsx`
- `lib/services/labels.ts`
- `app/api/teams/[teamId]/labels/route.ts`
- `app/api/teams/[teamId]/issues/[issueId]/labels/route.ts`

### Expected behavior

Settings → Labels creates, recolors, and deletes labels. The issue form assigns them. Deleting a label removes it from issues. Names are unique per team. Guests do not manage the catalog. Offline label changes queue.

### Acceptance criteria

- [ ] A new label appears in the picker.
- [ ] Assigning it shows on the issue.
- [ ] A duplicate name is rejected.
- [ ] Delete removes it from the issue.
- [ ] An empty name is rejected.

### Test cases

#### Normal use
- Create a label bug, add it to an issue, and remove it.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty name, spaces, and a very long name.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji name and a non-English name. They render as text in the chip.
#### SQL injection, XSS, and path traversal
- Use a name of <script> and a color of javascript:alert(1). The name is text. The color must be a color, not a URL.
#### Logged out, expired session, wrong role, and another user's data
- A member of another team cannot create a label here. A guest cannot open the write.
#### Double-submit and parallel requests
- Double-click Create. One label. Two issues toggling the same label end consistent.
#### External service failing, timing out, and rate limiting
- A failed save keeps the old set of chips.
#### New user with no data, and a user with lots of data
- A team with no labels shows the empty state. A team with many labels scrolls the checklist.
#### Refresh mid-action, back button, and two tabs
- Toggle in two tabs. Refresh shows the union of successful writes, not a stale unchecked box that resurrects.

### UI checks

- Alignment, spacing, and control size on label settings and the issue label checklist.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The checklist is a popover. Escape closes it.
- Keyboard: The checklist is keyboard toggleable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `TEAM-03`

### Suspected bugs

- None found in the label pages.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-11 Comment reactions

- **ID:** ISSUE-11
- **Name:** Comment reactions
- **Priority:** P2
- **Status:** PASSED

### Files

- `components/reaction-bar.tsx`
- `lib/reactions.ts`
- `app/api/teams/[teamId]/issues/[issueId]/reactions/route.ts`

### Expected behavior

A member can add any single emoji to a comment, from the picker or by pasting. The same person toggles their own reaction. A comment holds up to 20 different emoji. The reaction is not a free string of text.

### Acceptance criteria

- [ ] Adding an emoji shows the count.
- [ ] Clicking again removes that person's reaction.
- [ ] The 21st distinct emoji is rejected.
- [ ] A non-emoji string is rejected.
- [ ] A user cannot react on an issue they cannot see.

### Test cases

#### Normal use
- React with a thumbs-up and see the count, then remove it.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty reaction. Expect no row.
#### Wrong types, special characters, emoji, and non-English text
- Paste a family emoji and a flag. One glyph is accepted. Two glyphs are rejected.
#### SQL injection, XSS, and path traversal
- Submit <script> and ' OR 1=1. Both rejected.
#### Logged out, expired session, wrong role, and another user's data
- A guest who can see the issue: confirm whether they may react. A user who cannot see the issue gets 404.
#### Double-submit and parallel requests
- Double-click the emoji. The toggle ends consistent (on or off, not two rows).
#### External service failing, timing out, and rate limiting
- A failed POST does not increment the count.
#### New user with no data, and a user with lots of data
- A comment with no reactions shows the add control. A comment near the cap shows 20.
#### Refresh mid-action, back button, and two tabs
- Two tabs add the same emoji. The count is the number of users, not the number of clicks.

### UI checks

- Alignment, spacing, and control size on the reaction row under a comment.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The picker is a popover. Escape closes it.
- Keyboard: The picker and the toggle are buttons.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-05`

### Suspected bugs

- None found in the reaction limit described by the service.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-12 Attachments

- **ID:** ISSUE-12
- **Name:** Attachments
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `components/issue-attachments.tsx`
- `lib/services/attachments.ts`
- `lib/attachment-files.ts`
- `app/api/teams/[teamId]/issues/[issueId]/attachments/route.ts`

### Expected behavior

A member can upload several files or drop them on the issue. The server allows 10 MB and the types png, jpeg, gif, webp, pdf, text, markdown, and zip. It checks the bytes match the type, so a script renamed .png is refused. Names are cleaned and same-name files do not overwrite. The cap is 25 files per issue. Guests can view and cannot upload. Only the uploader or an admin can delete. Without BLOB_READ_WRITE_TOKEN the UI shows a configuration error and stores nothing.

### Acceptance criteria

- [ ] A png under 10 MB uploads and shows a thumbnail.
- [ ] A renamed executable is refused.
- [ ] The 26th file is refused.
- [ ] A guest cannot upload.
- [ ] Without the blob token, the error names the missing configuration and does not pretend success.

### Test cases

#### Normal use
- Upload a small png and a pdf. Both appear. Delete the png as the uploader.
#### Empty, missing, whitespace-only, and very long input
- Submit no file and a 0-byte file. Expect an error.
#### Wrong types, special characters, emoji, and non-English text
- Upload a file named with emoji and non-English letters. The cleaned name still downloads the right bytes.
#### SQL injection, XSS, and path traversal
- Upload a file named ../../x.png and one whose bytes are HTML with a .png name. The path is cleaned and the HTML-as-png is refused.
#### Logged out, expired session, wrong role, and another user's data
- A guest can open an existing file and cannot upload. Another user who is not admin cannot delete someone else's file.
#### Double-submit and parallel requests
- Drop two files at once. Both upload or each shows its own error. Double-click one file does not create two rows that share one blob.
#### External service failing, timing out, and rate limiting
- With Blob returning 500, the row is not saved as a successful attachment. With the token missing, the config error shows.
#### New user with no data, and a user with lots of data
- An issue with no files shows the drop zone. An issue at 25 files refuses the next.
#### Refresh mid-action, back button, and two tabs
- Refresh during upload. The list matches the server. Two tabs see the new file after refresh.

### UI checks

- Alignment, spacing, and control size on the attachment block on the issue.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. Per-file errors sit on the list.
- Keyboard: The file input is keyboard reachable. Drag is extra, not the only path.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `DEVOPS-01`

### Suspected bugs

- None found in the size and type rules. Confirm the magic-byte check in lib/attachment-files.ts when testing.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-13 External issue links

- **ID:** ISSUE-13
- **Name:** External issue links
- **Priority:** P2
- **Status:** PASSED

### Files

- `components/issue-links.tsx`
- `app/api/teams/[teamId]/issues/[issueId]/links/route.ts`

### Expected behavior

A member can attach a URL and a label to an issue. The list shows them and can remove them. This is the manual link, not the GitHub webhook's pull-request link. javascript: and other non-http(s) URLs must be rejected or not made clickable.

### Acceptance criteria

- [ ] A https URL is saved and opens.
- [ ] An empty URL is rejected.
- [ ] A javascript URL is not an active link.
- [ ] Remove deletes that link only.
- [ ] A guest cannot add one.

### Test cases

#### Normal use
- Add https://example.com with the label Spec and click it.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty URL and spaces.
#### Wrong types, special characters, emoji, and non-English text
- Use a label of emoji and a URL with non-ASCII path percent-encoding.
#### SQL injection, XSS, and path traversal
- Submit javascript:alert(1) and a URL of file:///etc/passwd. Neither becomes a working dangerous link.
#### Logged out, expired session, wrong role, and another user's data
- A non-member cannot add a link to this issue.
#### Double-submit and parallel requests
- Double-click Add. One link.
#### External service failing, timing out, and rate limiting
- A failed save leaves the list unchanged.
#### New user with no data, and a user with lots of data
- No links shows the empty add row. Many links wrap.
#### Refresh mid-action, back button, and two tabs
- Add in two tabs. Both appear after refresh.

### UI checks

- Alignment, spacing, and control size on the links block.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The URL field and Add are in tab order.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`

### Suspected bugs

- Confirm the URL scheme allowlist in the link action when testing. If javascript URLs are stored and rendered as href, that is a bug.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-14 Issue activity

- **ID:** ISSUE-14
- **Name:** Issue activity
- **Priority:** P1
- **Status:** PASSED

### Files

- `components/issue-activity.tsx`
- `app/api/teams/[teamId]/issues/[issueId]/activity/route.ts`

### Expected behavior

Status, priority, assignee, archive, and other field changes write an activity row with the actor. The issue page lists them. The actor name is the name at the time of the change where the code snapshots it. A user who cannot see the issue cannot read the activity.

### Acceptance criteria

- [ ] Changing priority adds a row.
- [ ] The row names the person.
- [ ] An issue with no edits shows an empty history.
- [ ] Activity is read-only.
- [ ] Another team cannot read it.

### Test cases

#### Normal use
- Change status and see the activity row.
#### Empty, missing, whitespace-only, and very long input
- There is no composer. An issue that was only created shows the create row or an empty list.
#### Wrong types, special characters, emoji, and non-English text
- A title containing emoji appears correctly in the from/to text.
#### SQL injection, XSS, and path traversal
- Activity text is rendered as text, including a title that contains a script tag.
#### Logged out, expired session, wrong role, and another user's data
- A guest outside the project gets 404 on the activity URL.
#### Double-submit and parallel requests
- Two rapid edits produce two rows in order.
#### External service failing, timing out, and rate limiting
- A failed edit does not write a success row.
#### New user with no data, and a user with lots of data
- A long history scrolls.
#### Refresh mid-action, back button, and two tabs
- Refresh shows the same rows. Two tabs see the new row after refresh.

### UI checks

- Alignment, spacing, and control size on the activity list.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The list is readable with a screen reader in order.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-15 Issue subscriptions

- **ID:** ISSUE-15
- **Name:** Issue subscriptions
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/api/teams/[teamId]/issues/[issueId]/subscription/route.ts`
- `lib/services/notifications.ts`

### Expected behavior

A member can subscribe and unsubscribe. Assignees and mentioned people are subscribed by the notification service where that code says so. Unsubscribing stops later notifications for that issue. A user cannot change another user's subscription.

### Acceptance criteria

- [ ] Subscribe then receive an in-app notification on a comment.
- [ ] Unsubscribe and do not.
- [ ] A user cannot flip someone else's row.
- [ ] The button state matches the database after refresh.

### Test cases

#### Normal use
- Subscribe, have someone comment, and see the inbox item. Then unsubscribe and repeat.
#### Empty, missing, whitespace-only, and very long input
- POST an empty body. The route should toggle or require an explicit boolean, not 500.
#### Wrong types, special characters, emoji, and non-English text
- No free text.
#### SQL injection, XSS, and path traversal
- Post a user id of another member. The route uses the session user.
#### Logged out, expired session, wrong role, and another user's data
- Signed out is 401. A guest outside the issue is 404.
#### Double-submit and parallel requests
- Double-click Subscribe. One row.
#### External service failing, timing out, and rate limiting
- A failed write leaves the button unchanged.
#### New user with no data, and a user with lots of data
- A new issue may auto-subscribe the creator. An old issue with many watchers notifies each, subject to their preferences.
#### Refresh mid-action, back button, and two tabs
- Two tabs: unsubscribe in one, the other shows unsubscribed after refresh.

### UI checks

- Alignment, spacing, and control size on the subscribe control on the issue.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The control is a button.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-05`, `INBOX-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-16 Similar issues

- **ID:** ISSUE-16
- **Name:** Similar issues
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `components/similar-issues-hint.tsx`
- `lib/similar-issues.ts`
- `app/api/teams/[teamId]/issues/similar/route.ts`

### Expected behavior

While the new-issue title is typed, the form requests similar issues in the team. The hint lists them so the person can open an existing one instead of filing a duplicate. Short or empty queries return nothing. Results stay inside the caller's guest scope.

### Acceptance criteria

- [ ] A title that matches an existing issue shows that issue.
- [ ] An empty title shows nothing.
- [ ] A guest does not see out-of-scope titles.
- [ ] Clicking a hint opens that issue.

### Test cases

#### Normal use
- Type an existing title and see it in the hint.
#### Empty, missing, whitespace-only, and very long input
- Type spaces and a single letter. Expect no noisy match or a defined minimum.
#### Wrong types, special characters, emoji, and non-English text
- Type emoji and CJK that match an issue. The match is shown as text.
#### SQL injection, XSS, and path traversal
- Type ' OR 1=1 and <script>. No error banner that echoes HTML, and no extra rows.
#### Logged out, expired session, wrong role, and another user's data
- A guest does not see another project's similar issue.
#### Double-submit and parallel requests
- Typing quickly sends overlapping requests. The last response wins.
#### External service failing, timing out, and rate limiting
- If the request fails, the form still allows create.
#### New user with no data, and a user with lots of data
- A new team shows no hints. A large team still returns a short list.
#### Refresh mid-action, back button, and two tabs
- Refresh clears the hint. Two tabs have their own queries.

### UI checks

- Alignment, spacing, and control size on the hint under the title field.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The hint is a list, not a modal.
- Keyboard: The hint links are keyboard reachable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-17 Advanced filters

- **ID:** ISSUE-17
- **Name:** Advanced filters
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `components/filter-builder.tsx`
- `lib/issue-filter.ts`
- `lib/issue-query.ts`

### Expected behavior

Issues → Filters builds a tree of all/any groups. Fields include status, priority, assignee, labels, dates such as due in the next 7 days, blocked, and has sub-issues. Apply writes the filter into the URL. The same JSON works as the API filter query and as the MCP list_issues filter. A bad filter shows an error and does not wipe the list without a message. Save as view is ISSUE-18.

### Acceptance criteria

- [ ] A status filter limits the list.
- [ ] A bad JSON filter shows the error from the parser.
- [ ] Clearing the filter shows the full list again.
- [ ] The URL is shareable with another member.
- [ ] A guest's results are still scope-limited.

### Test cases

#### Normal use
- Filter to status TODO and priority High. The list matches.
#### Empty, missing, whitespace-only, and very long input
- Apply an empty group. Expect either all issues or a validation message, not a 500.
#### Wrong types, special characters, emoji, and non-English text
- Use a label value with emoji.
#### SQL injection, XSS, and path traversal
- Put a script tag in a title-contains value. It is a match string, not HTML.
#### Logged out, expired session, wrong role, and another user's data
- A signed-out user with the URL is sent to login. Another user opening the URL sees their permission's rows, not a cached copy of yours.
#### Double-submit and parallel requests
- Change the filter twice quickly. The last URL wins.
#### External service failing, timing out, and rate limiting
- A parser exception is the inline error (the issues page catches it).
#### New user with no data, and a user with lots of data
- No issues match: empty state. Many issues match: the list still pages.
#### Refresh mid-action, back button, and two tabs
- Refresh keeps the filter. Back restores the previous one. Two tabs keep two filters.

### UI checks

- Alignment, spacing, and control size on the filter builder.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The builder is an inline panel. Menus close on Escape.
- Keyboard: Every condition row is keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-03`

### Suspected bugs

- None found in the page's try/catch around parseIssueQuery.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-18 Saved views

- **ID:** ISSUE-18
- **Name:** Saved views
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/settings/views/page.tsx`
- `components/views-settings-forms.tsx`
- `lib/actions/views.ts`
- `app/api/teams/[teamId]/views/route.ts`
- `app/api/teams/[teamId]/views/[viewId]/route.ts`

### Expected behavior

A member can save the current filter and display options as a view, private or shared with the team. The sidebar lists views the user may see. Settings → Views edits and deletes them. A private view is hidden from other members. Pinning is the favorite path or the view's own pin, depending on the control that is on the page.

### Acceptance criteria

- [ ] Save a private view and see it in the sidebar.
- [ ] Another member does not see a private view.
- [ ] Delete removes it.
- [ ] A shared view is visible to the team.
- [ ] A guest does not gain extra issues through a shared view.

### Test cases

#### Normal use
- Save a view named This week, private, and reload. It is in the sidebar.
#### Empty, missing, whitespace-only, and very long input
- Save with an empty name and a whitespace name. Expect an error.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji name. It shows as the link label, untranslated (the sidebar translates known labels only).
#### SQL injection, XSS, and path traversal
- Use a name of <script>. It is text in the sidebar.
#### Logged out, expired session, wrong role, and another user's data
- User A’s private view returns 404 to user B. A member cannot delete another user's private view.
#### Double-submit and parallel requests
- Double-click Save. One view.
#### External service failing, timing out, and rate limiting
- A failed save leaves the old list.
#### New user with no data, and a user with lots of data
- A team with no views shows the empty state. A team with many views scrolls.
#### Refresh mid-action, back button, and two tabs
- Rename in one tab and delete in the other. Refresh matches the database.

### UI checks

- Alignment, spacing, and control size on the views settings page and the sidebar view links.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The view links are real links. The form submits with the keyboard.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-17`, `ISSUE-25`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-19 Drafts

- **ID:** ISSUE-19
- **Name:** Drafts
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/drafts/page.tsx`
- `components/drafts-list.tsx`
- `lib/actions/drafts.ts`
- `lib/services/drafts.ts`
- `app/api/teams/[teamId]/drafts/route.ts`

### Expected behavior

Save draft on the new-issue form stores the title and the other fields for the author only. The sidebar Drafts link lists them. Resume reopens the form. Create issue publishes through the normal validator and removes the draft. The cap is 50 per person per team. Another member does not see them. Offline, save is queued. GET and POST /api/teams/{id}/drafts are the API.

### Acceptance criteria

- [ ] Save draft shows the row on /drafts.
- [ ] Resume fills the form.
- [ ] Publish creates an issue and removes the draft.
- [ ] The 51st draft is refused.
- [ ] Another user gets an empty list or 404 for that draft.

### Test cases

#### Normal use
- Save a draft, resume it, and publish it.
#### Empty, missing, whitespace-only, and very long input
- Save with an empty title. Expect a validation error or a stored empty draft that cannot publish. Record which.
#### Wrong types, special characters, emoji, and non-English text
- Save a title with emoji and a long description.
#### SQL injection, XSS, and path traversal
- Save a title of <script>. The drafts list shows text.
#### Logged out, expired session, wrong role, and another user's data
- User B does not see user A's draft. A signed-out GET is 401.
#### Double-submit and parallel requests
- Double-click Save draft. One draft. Publish twice: one issue.
#### External service failing, timing out, and rate limiting
- Offline, the draft queues and appears after reconnect. A server error keeps the local copy.
#### New user with no data, and a user with lots of data
- A user with no drafts sees the empty state. A user at the cap is refused.
#### Refresh mid-action, back button, and two tabs
- Refresh the drafts page. Two tabs publishing one draft: one issue.

### UI checks

- Alignment, spacing, and control size on the drafts page and the new-issue form.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Resume, Create, and Delete are buttons.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-01`, `OFFLINE-02`

### Suspected bugs

- None found in the private-to-author rule.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-20 Issue templates

- **ID:** ISSUE-20
- **Name:** Issue templates
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/settings/templates/page.tsx`
- `components/templates-settings-forms.tsx`

### Expected behavior

Settings → Templates stores a name and a title plus the other default fields. The new-issue form can apply a template. Delete removes the template and does not delete issues that were created from it. An empty template list has an empty state.

### Acceptance criteria

- [ ] Saving a template shows it on the page and in the new-issue picker.
- [ ] Applying it fills the title.
- [ ] Delete removes the template only.
- [ ] An empty name is rejected.

### Test cases

#### Normal use
- Create a template and apply it on the new-issue form.
#### Empty, missing, whitespace-only, and very long input
- Save with an empty name and an empty title.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji title. It prefills as text.
#### SQL injection, XSS, and path traversal
- Use a title of <script>. The form shows text.
#### Logged out, expired session, wrong role, and another user's data
- A guest cannot manage templates. A member of another team cannot.
#### Double-submit and parallel requests
- Double-click Save. One template.
#### External service failing, timing out, and rate limiting
- A failed save leaves the empty state in place.
#### New user with no data, and a user with lots of data
- No templates shows the empty state. Many templates list.
#### Refresh mid-action, back button, and two tabs
- Delete in one tab and apply in the other. The apply fails cleanly if the template is gone.

### UI checks

- Alignment, spacing, and control size on the templates settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The form and the delete button are keyboard reachable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-21 Issue visibility and extra readers

- **ID:** ISSUE-21
- **Name:** Issue visibility and extra readers
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `prisma/schema.prisma`
- `lib/services/issues.ts`
- `lib/services/guest-scope.ts`

### Expected behavior

An issue is TEAM or RESTRICTED (IssueVisibility). RESTRICTED issues are visible to the people granted as readers plus the roles the service allows (creator, assignee, admins — confirm the exact set in the service when testing). Other members do not see them in the list, search, or by number. Guests are also filtered by project scope.

### Acceptance criteria

- [ ] Switching an issue to RESTRICTED hides it from a normal member.
- [ ] The creator still opens it.
- [ ] A reader who was added can open it.
- [ ] Search does not return it to the excluded member.
- [ ] The API uses the same check.

### Test cases

#### Normal use
- Set an issue to RESTRICTED and open it as another member. Expect not-found.
#### Empty, missing, whitespace-only, and very long input
- Set visibility to an empty string. Expect a validation error and no change.
#### Wrong types, special characters, emoji, and non-English text
- Visibility is an enum. A translated word is rejected.
#### SQL injection, XSS, and path traversal
- Send visibility=<script>. Rejected.
#### Logged out, expired session, wrong role, and another user's data
- A non-member is 404 either way. A member who is not a reader is 404 for RESTRICTED. An admin's access must match the service, not a guess.
#### Double-submit and parallel requests
- Two updates of visibility: the last write wins.
#### External service failing, timing out, and rate limiting
- A failed update stays TEAM.
#### New user with no data, and a user with lots of data
- A new issue defaults to TEAM. A team with many restricted issues does not leak them in the count for a normal member.
#### Refresh mid-action, back button, and two tabs
- Change visibility in one tab. The other member's open page 404s on refresh.

### UI checks

- Alignment, spacing, and control size on the visibility control on the issue.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The reader picker is a menu.
- Keyboard: The control is keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `TEAM-08`

### Suspected bugs

- Confirm the exact reader rule in lib/services/issues.ts and guest-scope before testing. The enum exists (prisma IssueVisibility and the 20261119180000 migration).

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-22 Required fields

- **ID:** ISSUE-22
- **Name:** Required fields
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `lib/required-fields.ts`
- `lib/services/workflow.ts`

### Expected behavior

A team can require fields before an issue enters a status. The check runs on update. A missing required field rejects the change and names the field. Clearing the requirement allows the change. This is configuration plus the enforcement on save, not a separate page if the control lives on the workflow screen.

### Acceptance criteria

- [ ] Moving to a status that requires an assignee fails when the assignee is empty.
- [ ] Filling the field allows the move.
- [ ] A status with no requirements does not block.
- [ ] The API returns the same error as the form.

### Test cases

#### Normal use
- Require assignee for In progress, try to move an unassigned issue, then assign and move.
#### Empty, missing, whitespace-only, and very long input
- Save a requirement with no field selected. Expect a validation error.
#### Wrong types, special characters, emoji, and non-English text
- Field names are enums. A translated label is not a field id.
#### SQL injection, XSS, and path traversal
- Post a field name of <script>. Rejected.
#### Logged out, expired session, wrong role, and another user's data
- A guest cannot change the rule. A member is subject to the rule.
#### Double-submit and parallel requests
- Double-click the status change. One rejection, then one success after the field is set.
#### External service failing, timing out, and rate limiting
- A failed save leaves the old status.
#### New user with no data, and a user with lots of data
- A new team has no extra requirements. A team with several rules checks all of them.
#### Refresh mid-action, back button, and two tabs
- Two tabs: one sets the field, the other then moves. Refresh shows the new status.

### UI checks

- Alignment, spacing, and control size on the workflow or issue form error.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The error is inline on the field.
- Keyboard: The error is announced and focus can move to the missing field.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `SET-01`

### Suspected bugs

- Confirm where the UI edits the rule. If only the library exists, the settings control is the gap to record in the result notes.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-23 Issue presence

- **ID:** ISSUE-23
- **Name:** Issue presence
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `components/issue-viewers.tsx`
- `lib/services/presence.ts`
- `app/api/teams/[teamId]/issues/[issueId]/presence/route.ts`

### Expected behavior

Opening an issue posts presence. The page shows other viewers. Presence expires. A user who cannot see the issue does not appear and cannot read the viewer list. The current user is not shown as a stranger.

### Acceptance criteria

- [ ] Two members on one issue see each other.
- [ ] Leaving the page drops the viewer after the expiry.
- [ ] A non-member cannot post presence for the issue.
- [ ] The list does not include users who cannot see a restricted issue.

### Test cases

#### Normal use
- Open the same issue in two accounts and see both names.
#### Empty, missing, whitespace-only, and very long input
- There is no text field. An empty heartbeat still refreshes the timestamp.
#### Wrong types, special characters, emoji, and non-English text
- Names with emoji render as text.
#### SQL injection, XSS, and path traversal
- Post an issue id from another team. 404.
#### Logged out, expired session, wrong role, and another user's data
- Signed out is 401. A guest outside the project is 404.
#### Double-submit and parallel requests
- Two heartbeats in parallel leave one row per user.
#### External service failing, timing out, and rate limiting
- If the post fails, the issue still loads.
#### New user with no data, and a user with lots of data
- One viewer shows a quiet state. Many viewers wrap.
#### Refresh mid-action, back button, and two tabs
- Close one tab. The other drops that name after the stale window. Refresh matches.

### UI checks

- Alignment, spacing, and control size on the viewer row on the issue.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Names are text, not only color dots.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `ISSUE-21`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-24 Command palette, shortcuts, and peek

- **ID:** ISSUE-24
- **Name:** Command palette, shortcuts, and peek
- **Priority:** P1
- **Status:** PASSED

### Files

- `components/app/command-palette.tsx`
- `components/app/keyboard-shell.tsx`
- `components/app/issue-peek.tsx`
- `components/app/shortcut-help.tsx`
- `lib/shortcuts/registry.ts`

### Expected behavior

Cmd-K or Ctrl-K opens the palette. It searches and runs status, priority, and assignee actions. J and K move in the list, Space peeks, Enter opens. G then a letter navigates (G then S is settings). ? lists shortcuts. The palette can switch theme. Peek does not navigate away. Shortcuts do not fire while typing in a field.

### Acceptance criteria

- [ ] The palette opens and finds an issue by title.
- [ ] Peek opens and Escape closes it without navigation.
- [ ] ? shows the shortcut list.
- [ ] Typing in the title field does not move the list.
- [ ] G then S opens settings.

### Test cases

#### Normal use
- Press the palette shortcut, type an issue title, and open it.
#### Empty, missing, whitespace-only, and very long input
- Open the palette and type spaces. Expect no crash and no random navigation.
#### Wrong types, special characters, emoji, and non-English text
- Search emoji and non-English titles from the palette.
#### SQL injection, XSS, and path traversal
- Type <script> in the palette. Results are text. It does not navigate to an injected URL.
#### Logged out, expired session, wrong role, and another user's data
- Signed out, the shell is not mounted. A guest does not see actions they cannot perform, and the server still refuses them.
#### Double-submit and parallel requests
- Hold the shortcut. One palette. Two tabs have two palettes.
#### External service failing, timing out, and rate limiting
- If search fails, the palette shows an error and stays open.
#### New user with no data, and a user with lots of data
- A new team with no issues shows an empty palette result. A large team still returns.
#### Refresh mid-action, back button, and two tabs
- Escape closes the palette and peek. Back after Enter returns to the list.

### UI checks

- Alignment, spacing, and control size on the command palette, peek panel, and shortcut dialog.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The palette and shortcut help are dialogs. Escape closes them and returns focus.
- Keyboard: The shortcuts in lib/shortcuts/registry.ts all work, and none fire from an input.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-03`, `ISSUE-26`, `SET-04`

### Suspected bugs

- None found in the shell wiring.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-25 Favorites

- **ID:** ISSUE-25
- **Name:** Favorites
- **Priority:** P1
- **Status:** PASSED

### Files

- `components/favorite-button.tsx`
- `lib/actions/favorites.ts`
- `lib/services/favorites.ts`
- `components/app-sidebar.tsx`

### Expected behavior

Starring an issue, project, cycle, or view adds it to the user's sidebar. Favorites are per user. They can be reordered and moved into folders. Folders collapse. A favorite the user can no longer see does not remain as a working link. Guests only favorite what they can open.

### Acceptance criteria

- [ ] Star an issue and see it in the sidebar.
- [ ] Reorder persists.
- [ ] A folder groups items.
- [ ] Another user does not see the star.
- [ ] Unstar removes it.

### Test cases

#### Normal use
- Star an issue, move it into a folder, and refresh.
#### Empty, missing, whitespace-only, and very long input
- Create a folder with an empty name. Expect a refusal or a default. Record which.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji folder name. It shows as text.
#### SQL injection, XSS, and path traversal
- Use a folder name of <script>. Text only.
#### Logged out, expired session, wrong role, and another user's data
- User B does not get user A's favorites. A signed-out star redirects.
#### Double-submit and parallel requests
- Double-click the star. One row.
#### External service failing, timing out, and rate limiting
- A failed reorder rolls back the sidebar.
#### New user with no data, and a user with lots of data
- No favorites hides the section (the sidebar returns null). Many favorites scroll.
#### Refresh mid-action, back button, and two tabs
- Reorder in two tabs. Refresh matches the last successful order.

### UI checks

- Alignment, spacing, and control size on the sidebar favorites section.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- Folder collapse is a button. No modal.
- Keyboard: The star is a button. Reorder controls are buttons, not drag-only.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `TEAM-02`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-26 Search

- **ID:** ISSUE-26
- **Name:** Search
- **Priority:** P1
- **Status:** PASSED

### Files

- `lib/services/search.ts`
- `lib/search.ts`
- `app/api/teams/[teamId]/search/route.ts`
- `components/issue-filters-form.tsx`

### Expected behavior

Search matches issues (title, description, comments), projects, initiatives, docs, customers, cycles, and people. Every word must match. Quotes match a phrase. A leading minus excludes. ENG-12 or #12 jumps to that issue. Operators include assignee:me, creator, status, priority, label, project, cycle:current, and type. Results rank title, then body, then recency. Guest scope applies. The issues page uses ?search=.

### Acceptance criteria

- [ ] A word finds the issue with that title and not an unrelated one.
- [ ] Quotes find a phrase.
- [ ] #number opens that issue.
- [ ] An operator limits the kind.
- [ ] A guest does not see hidden issues.

### Test cases

#### Normal use
- Search a known title from the issues filter and from the API.
#### Empty, missing, whitespace-only, and very long input
- Search empty and whitespace. Expect the unfiltered list or an empty result, not every private team.
#### Wrong types, special characters, emoji, and non-English text
- Search emoji and accented text that exist in a title.
#### SQL injection, XSS, and path traversal
- Search ' OR 1=1 and <script>. No SQL error and no HTML execution. The result is a normal empty or literal match.
#### Logged out, expired session, wrong role, and another user's data
- Signed out is 401 on the API. User A's search does not return team B. A guest's search is scoped.
#### Double-submit and parallel requests
- Two overlapping searches: the last query's results are shown.
#### External service failing, timing out, and rate limiting
- A database error returns an error, not a 200 empty that looks like no matches.
#### New user with no data, and a user with lots of data
- A new team returns nothing. A large team still returns within a bounded set.
#### Refresh mid-action, back button, and two tabs
- Refresh keeps ?search=. Back restores the previous query. Two tabs keep two queries.

### UI checks

- Alignment, spacing, and control size on the issues search field and the command palette.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal beyond the palette.
- Keyboard: The search field is labeled and submits with Enter.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-03`, `TEAM-08`

### Suspected bugs

- None found in the search service's operator list.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-27 Live updates

- **ID:** ISSUE-27
- **Name:** Live updates
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `components/live-issue-refresh.tsx`
- `app/api/teams/[teamId]/events/route.ts`

### Expected behavior

The team shell subscribes to GET /api/teams/{id}/events. Events refresh issue views. A heartbeat keeps the stream open. Last-Event-ID resumes. The stream is filtered by guest scope. A hidden tab pauses. A signed-out request is refused. The stream ends when the membership is gone.

### Acceptance criteria

- [ ] A change in one tab appears in the other without a manual reload.
- [ ] A guest does not receive another project's event.
- [ ] Resume does not replay the wrong team's events.
- [ ] A hidden tab stops and resumes when shown.

### Test cases

#### Normal use
- Change an issue in one browser and see the other update.
#### Empty, missing, whitespace-only, and very long input
- Connect with no Last-Event-ID. The stream starts at now, not at the beginning of history.
#### Wrong types, special characters, emoji, and non-English text
- Event payloads with emoji titles render as text when applied.
#### SQL injection, XSS, and path traversal
- Request another team's id. 403 or 404. A Last-Event-ID of ../ does not change the team.
#### Logged out, expired session, wrong role, and another user's data
- Signed out is 401. A removed member's stream ends.
#### Double-submit and parallel requests
- Two tabs, two streams, one event. Both update once.
#### External service failing, timing out, and rate limiting
- If the stream errors, the client reconnects or shows a stale state without wiping the list.
#### New user with no data, and a user with lots of data
- A quiet team gets heartbeats only. A busy team does not drop the guest filter.
#### Refresh mid-action, back button, and two tabs
- Refresh reconnects. Back does not leave a leaked stream that updates a signed-out page.

### UI checks

- Alignment, spacing, and control size on the team shell, no dedicated page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Live updates do not steal focus.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-03`, `TEAM-08`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-28 Triage

- **ID:** ISSUE-28
- **Name:** Triage
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/triage/page.tsx`
- `lib/triage.ts`

### Expected behavior

Triage lists issues that need a decision, including backlog items created by Ask, email, Slack, and Sentry. The page can accept or decline. Accept moves the issue to TODO. Decline cancels it. Guests do not get the triage nav item if the sidebar hides it; the server still checks the role.

### Acceptance criteria

- [ ] The page lists the intake issues.
- [ ] Accept moves one to Todo.
- [ ] Decline cancels it.
- [ ] An empty queue has an empty state.
- [ ] A member who is not allowed is refused by the action.

### Test cases

#### Normal use
- Accept one triage issue and see it leave the queue and become TODO.
#### Empty, missing, whitespace-only, and very long input
- Open triage with an empty team. Expect the empty state.
#### Wrong types, special characters, emoji, and non-English text
- A triage title with emoji renders as text.
#### SQL injection, XSS, and path traversal
- Post an issue id from another team to the accept action. Refused.
#### Logged out, expired session, wrong role, and another user's data
- A guest cannot accept. Signed out redirects.
#### Double-submit and parallel requests
- Double-click Accept. One transition.
#### External service failing, timing out, and rate limiting
- A failed action leaves the issue in the queue.
#### New user with no data, and a user with lots of data
- A long queue scrolls. A new team is empty.
#### Refresh mid-action, back button, and two tabs
- Accept in one tab. The other drops the row on refresh.

### UI checks

- Alignment, spacing, and control size on the triage page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Accept and Decline are buttons.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`

### Suspected bugs

- None found in the accept path that sets TODO or CANCELLED (lib/actions/issues.ts).

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-29 Triage rules and suggestions

- **ID:** ISSUE-29
- **Name:** Triage rules and suggestions
- **Priority:** P1
- **Status:** PASSED

### Files

- `components/triage-rules-form.tsx`
- `components/triage-suggest.tsx`
- `lib/services/triage-rules.ts`
- `lib/ai.ts`
- `app/api/teams/[teamId]/issues/[issueId]/summary/route.ts`

### Expected behavior

Settings or the triage page stores rules that set status, priority, or assignee when an issue matches. The suggestion button proposes status, priority, labels, and assignee. With AI_API_KEY it calls an OpenAI-compatible model (AI_API_URL and AI_MODEL optional). Without the key it uses the keyword and extractive fallback. Applying a suggestion is a normal issue update. The summary route summarizes one issue the caller can see.

### Acceptance criteria

- [ ] A suggestion returns fields and does not save until applied.
- [ ] Without an API key, a suggestion still returns.
- [ ] A rule fires on create.
- [ ] A bad model response does not change the issue.
- [ ] A guest cannot apply a suggestion to a hidden issue.

### Test cases

#### Normal use
- Click suggest on a bug-like title and apply priority.
#### Empty, missing, whitespace-only, and very long input
- Suggest on an empty description. The fallback returns a defined empty or low-confidence result, not a 500.
#### Wrong types, special characters, emoji, and non-English text
- Use a non-English title. The fallback may miss it; the model path should not crash.
#### SQL injection, XSS, and path traversal
- A title of <script> is sent as data. The suggestion text is rendered as text.
#### Logged out, expired session, wrong role, and another user's data
- A user who cannot see the issue gets 404 on the summary route.
#### Double-submit and parallel requests
- Double-click Suggest. Two reads, one apply if they click once.
#### External service failing, timing out, and rate limiting
- Point AI_API_URL at a closed port. The route fails and the issue is unchanged. A slow model hits the timeout used by the AI client.
#### New user with no data, and a user with lots of data
- A new issue with little text still returns. A long description is truncated before the model call.
#### Refresh mid-action, back button, and two tabs
- Apply in one tab. The other shows the new priority after refresh.

### UI checks

- Alignment, spacing, and control size on the suggestion block and the rules form.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Suggest and Apply are buttons. The rule form is keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-28`, `DEVOPS-01`

### Suspected bugs

- Confirm the fallback never claims a model ran. The missing key is a supported setup.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-30 SLA targets

- **ID:** ISSUE-30
- **Name:** SLA targets
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `lib/sla.ts`
- `components/team-settings-form.tsx`

### Expected behavior

Team settings store slaHours, a timezone, slaStartHour, slaEndHour, and slaWeekdays. An open issue past its priority's hour target is breached. Done and cancelled issues are not. A missing or zero target does not breach. Weekend settings skip those days. The breach is shown where the issue UI reads the helper.

### Acceptance criteria

- [ ] An urgent issue older than its target shows breached.
- [ ] A done issue does not.
- [ ] No target means no breach.
- [ ] Hours outside 0–24 are rejected.
- [ ] A member sees the indicator and cannot change the team target unless they can edit settings.

### Test cases

#### Normal use
- Set urgent to 4 hours, create an old urgent issue, and see the breach.
#### Empty, missing, whitespace-only, and very long input
- Save an empty hours map. Nothing is breached.
#### Wrong types, special characters, emoji, and non-English text
- Weekday strings are numbers. A word is rejected.
#### SQL injection, XSS, and path traversal
- Post slaHours as a script tag. Rejected.
#### Logged out, expired session, wrong role, and another user's data
- A non-admin cannot save team SLA settings.
#### Double-submit and parallel requests
- Double-click save. One map.
#### External service failing, timing out, and rate limiting
- A failed save keeps the old map.
#### New user with no data, and a user with lots of data
- A new team has no breach. A team with many overdue issues lists them.
#### Refresh mid-action, back button, and two tabs
- Change the target in one tab. The issue page updates on refresh.

### UI checks

- Alignment, spacing, and control size on team settings SLA fields and the issue indicator.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The hour fields are inputs, not drag-only.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-04`, `ISSUE-02`

### Suspected bugs

- None found in the SLA helper's guards (zero and bad shapes return not breached in the unit tests' expectations).

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ISSUE-31 Git branch and pull request status

- **ID:** ISSUE-31
- **Name:** Git branch and pull request status
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `components/issue-branch.tsx`
- `lib/github-pulls.ts`
- `app/api/teams/[teamId]/pulls/route.ts`

### Expected behavior

The issue page can show a branch name and, when GITHUB_TOKEN and the team's githubRepo are set, the open pull requests for that branch. Without the token the control still copies a branch name and does not call GitHub. The route is team-scoped.

### Acceptance criteria

- [ ] The branch name is derived from the issue and can be copied.
- [ ] With a token, open PRs are listed.
- [ ] Without a token, no error pretends a PR exists.
- [ ] Another team's repo is not queried.

### Test cases

#### Normal use
- Copy the branch name from an issue.
#### Empty, missing, whitespace-only, and very long input
- An issue with a blank title still produces a safe branch slug.
#### Wrong types, special characters, emoji, and non-English text
- An emoji title becomes a slug without breaking the copy button.
#### SQL injection, XSS, and path traversal
- A branch query of ../ is not sent as a path to the local disk.
#### Logged out, expired session, wrong role, and another user's data
- A guest may see the branch and must not see another team's pulls.
#### Double-submit and parallel requests
- Two refreshes share one GitHub response or each call; neither duplicates a link row.
#### External service failing, timing out, and rate limiting
- GitHub 500 shows an error on the PR list and still shows the branch name.
#### New user with no data, and a user with lots of data
- An issue with no PR shows the empty PR state.
#### Refresh mid-action, back button, and two tabs
- Refresh reloads the PR list.

### UI checks

- Alignment, spacing, and control size on the branch block on the issue.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Copy is a button.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `INT-01`, `DEVOPS-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:


## ISSUE-32 Status-change rules

- **ID:** ISSUE-32
- **Name:** Status-change rules
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/triage/page.tsx`
- `lib/services/status-rules.ts`
- `lib/services/issues.ts`

### Expected behavior

The triage page has a "When status changes" list. A member of the team can add a rule: when an issue moves to a chosen status, set an assignee and add a label. The service also stores priority, cycle, and a comment, and updateIssue applies the first matching rule when the status actually changes, but only for fields the caller did not send. The triage form collects status, assignee, and label. It does not collect priority, cycle, or comment. A rule with no action is rejected. Deleting a rule is in the service. The form's error is swallowed and the page redirects back to triage.

### Acceptance criteria

- [ ] Moving an issue into the rule's status sets the assignee when the update did not send one.
- [ ] The label is added once. A second move does not duplicate it.
- [ ] A caller who sends their own assignee is not overwritten.
- [ ] A rule with no action is refused.
- [ ] A rule from another team is not applied.

### Test cases

#### Normal use
- Create a rule from Todo to a member plus a label. Move an issue to Todo and confirm the assignee and the label.
#### Empty, missing, whitespace-only, and very long input
- Submit the form with both assignee and label left empty. Expect no new rule.
#### Wrong types, special characters, emoji, and non-English text
- The status select only offers the five statuses. A forged priority value is not on this form. A label name with emoji displays in the list.
#### SQL injection, XSS, and path traversal
- The status value is an enum. A script-tag status is rejected by the schema. The list prints the status and the person's name as text.
#### Logged out, expired session, wrong role, and another user's data
- Signed out, the triage page redirects to login. A rule id from another team does not match. A guest who cannot update the issue does not fire the rule.
#### Double-submit and parallel requests
- Submit the form twice. Two rules can exist for the same status. The matcher returns the first by position. Record which one ran.
#### External service failing, timing out, and rate limiting
- There is no external call. A database error is caught by the form and the page still redirects, so the failure is invisible.
#### New user with no data, and a user with lots of data
- A team with no rules changes status and nothing else changes. Many rules for one status: only the first match runs.
#### Refresh mid-action, back button, and two tabs
- Refresh after save shows the new rule. Back then submit again can create a duplicate. Two tabs can each add a rule.

### UI checks

- Alignment, spacing, and control size on the triage page, under When status changes.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. The rule form is inline.
- Keyboard: The status and assignee selects and the submit control are reachable. The empty list has no delete control in the form.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `ISSUE-28`, `ISSUE-10`

### Suspected bugs

- `app/t/[teamSlug]/triage/page.tsx` around the status-rule form catches every error and still redirects, so a refused rule looks like success.
- The same form never sends priority, cycle, or comment, while `lib/services/status-rules.ts` and `lib/services/issues.ts` (the status-change block) apply those fields when present.
- The list under the heading shows assignee and label only, so a rule created another way would hide its other actions.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-01 Cycles

- **ID:** PLAN-01
- **Name:** Cycles
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/cycles/page.tsx`
- `app/t/[teamSlug]/cycles/[cycleId]/page.tsx`
- `components/cycle-forms.tsx`
- `lib/services/cycles.ts`
- `lib/actions/cycles.ts`
- `app/api/teams/[teamId]/cycles/route.ts`

### Expected behavior

Cycles are sprints with a name, start, and end. The sidebar has Cycles, Current, and Upcoming. A team can leave cycles disabled. Creating a cycle with an end before the start is rejected. Issues can be assigned to a cycle. Guests do not get the cycles nav item; the API still checks membership. The daily cron advances cycles that are due.

### Acceptance criteria

- [ ] A member can create a cycle and see it under Upcoming or Current based on its dates.
- [ ] An inverted date range is rejected.
- [ ] An issue assigned to the cycle shows on the cycle page.
- [ ] A guest cannot create one.
- [ ] The empty state shows when there are no cycles.

### Test cases

#### Normal use
- Create a two-week cycle and assign an issue to it.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty name and a missing date.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji cycle name. It shows as text.
#### SQL injection, XSS, and path traversal
- Post a name of <script> and a date of ' OR 1=1. The name is text. The date is rejected.
#### Logged out, expired session, wrong role, and another user's data
- A guest and a signed-out user cannot create. Another team’s cycle id is rejected.
#### Double-submit and parallel requests
- Double-click Create. One cycle.
#### External service failing, timing out, and rate limiting
- A failed save leaves the list unchanged.
#### New user with no data, and a user with lots of data
- A new team with cycles off explains that. A team with many cycles splits current and upcoming.
#### Refresh mid-action, back button, and two tabs
- Refresh the cycle page. Two tabs creating the same name: both exist unless uniqueness is enforced, in which case the second errors.

### UI checks

- Alignment, spacing, and control size on the cycles pages.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The form submits with the keyboard.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-04`, `ISSUE-02`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-02 Cycle analytics and capacity

- **ID:** PLAN-02
- **Name:** Cycle analytics and capacity
- **Priority:** P1
- **Status:** PASSED

### Files

- `components/cycle-charts.tsx`
- `lib/cycle-stats.ts`
- `lib/services/cycle-analytics.ts`
- `lib/capacity.ts`

### Expected behavior

A cycle page shows a burndown with an ideal line, scope-creep numbers, and a per-assignee split. The cycles page shows velocity (planned versus completed, with the average). Issues record started, finished, and cancelled times. The daily cron snapshots each running cycle. Capacity rows (CycleCapacity) store per-user capacity for the cycle. Charts render empty when a cycle has no issues.

### Acceptance criteria

- [ ] A cycle with completed issues draws burndown and does not divide by zero.
- [ ] Velocity uses completed cycles.
- [ ] A snapshot appears after the cron.
- [ ] A member who cannot see an issue does not see it in the numbers if scope applies.
- [ ] Empty data shows an empty chart, not a fake line.

### Test cases

#### Normal use
- Open a cycle that has done and open issues and read the counts.
#### Empty, missing, whitespace-only, and very long input
- Open a cycle with no issues. The chart is empty.
#### Wrong types, special characters, emoji, and non-English text
- Assignee names with emoji do not overflow the legend.
#### SQL injection, XSS, and path traversal
- The chart does not take a raw query that changes another team’s snapshot.
#### Logged out, expired session, wrong role, and another user's data
- A guest does not get the page if the nav hides it, and a direct URL is refused or scoped.
#### Double-submit and parallel requests
- Two snapshots on the same day upsert rather than double-count. Confirm in the service.
#### External service failing, timing out, and rate limiting
- If the cron did not run, the chart uses the issues themselves and does not throw.
#### New user with no data, and a user with lots of data
- One issue and many issues both render.
#### Refresh mid-action, back button, and two tabs
- Refresh redraws from the server. Two tabs match.

### UI checks

- Alignment, spacing, and control size on the cycle charts.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The chart has a text alternative or a table of the same numbers.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`PLAN-01`, `JOB-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-03 Projects and milestones

- **ID:** PLAN-03
- **Name:** Projects and milestones
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/projects/page.tsx`
- `app/t/[teamSlug]/projects/[projectId]/page.tsx`
- `components/projects-page-forms.tsx`
- `components/project-detail-forms.tsx`
- `lib/services/projects.ts`
- `app/api/teams/[teamId]/projects/route.ts`

### Expected behavior

Projects have a name, optional start and target dates, a lead, and milestones. A start after the target is rejected. Issues belong to a project. The project page shows progress from its issues. Members create projects. Guests see only the projects in their scope. The API and MCP create and update projects.

### Acceptance criteria

- [ ] Create a project and see it on the roadmap and the issue picker.
- [ ] A start after the target is rejected.
- [ ] A milestone belongs to that project.
- [ ] A guest outside the project cannot open it.
- [ ] Delete or archive behavior matches the button that is actually on the page.

### Test cases

#### Normal use
- Create a project with a start and a target and add an issue.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty name and an inverted date range.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji project name and a non-English milestone name.
#### SQL injection, XSS, and path traversal
- Use a name of <script>. It is text.
#### Logged out, expired session, wrong role, and another user's data
- A guest limited to another project gets not-found. Signed out redirects.
#### Double-submit and parallel requests
- Double-click Create. One project.
#### External service failing, timing out, and rate limiting
- A failed save leaves the list.
#### New user with no data, and a user with lots of data
- No projects shows the empty state. Many projects scroll.
#### Refresh mid-action, back button, and two tabs
- Edit dates in two tabs. The later save wins and the other sees it on refresh.

### UI checks

- Alignment, spacing, and control size on the projects pages.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Date fields and the create button are keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `TEAM-08`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-04 Project updates and contributing teams

- **ID:** PLAN-04
- **Name:** Project updates and contributing teams
- **Priority:** P2
- **Status:** PASSED

### Files

- `app/api/teams/[teamId]/projects/[projectId]/updates/route.ts`
- `prisma/schema.prisma`

### Expected behavior

A project can have written updates (ProjectUpdate) and contributing teams (ProjectTeam). The project page posts an update. Updates are team-scoped. A guest who cannot see the project cannot post. The update body is text.

### Acceptance criteria

- [ ] A member posts an update and sees it on the project.
- [ ] An empty body is rejected.
- [ ] Another team cannot post to this project.
- [ ] The author name is shown.

### Test cases

#### Normal use
- Post a project update and refresh.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty update.
#### Wrong types, special characters, emoji, and non-English text
- Post emoji and a long note.
#### SQL injection, XSS, and path traversal
- Post a script tag. It is text.
#### Logged out, expired session, wrong role, and another user's data
- A guest outside the project is refused.
#### Double-submit and parallel requests
- Double-click Post. One update unless the client has no idempotency key. Record which.
#### External service failing, timing out, and rate limiting
- A failed post keeps the composer text.
#### New user with no data, and a user with lots of data
- A project with no updates shows the empty prompt.
#### Refresh mid-action, back button, and two tabs
- Two tabs both show the update after refresh.

### UI checks

- Alignment, spacing, and control size on the project updates block.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The composer is keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`PLAN-03`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-05 Project dependencies

- **ID:** PLAN-05
- **Name:** Project dependencies
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `lib/services/project-dependencies.ts`
- `lib/project-dependencies.ts`
- `components/project-detail-forms.tsx`

### Expected behavior

A project can depend on another project in the team. The page lists Depends on and Blocks. Loops, duplicates, and self-links are refused. The roadmap shows a banner when a project starts or is due before a dependency is due, or when it waits on a cancelled project. There is no drawn graph and no automatic reschedule. API, MCP, and GraphQL expose the same writes. A member is required.

### Acceptance criteria

- [ ] Adding a dependency shows on both projects.
- [ ] A self-link and a loop are rejected.
- [ ] The roadmap banner appears for a date conflict.
- [ ] Removing the link clears the banner.
- [ ] A guest cannot add one.

### Test cases

#### Normal use
- Make project A depend on project B and see both lists.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty project id.
#### Wrong types, special characters, emoji, and non-English text
- Project names with emoji still link by id.
#### SQL injection, XSS, and path traversal
- Post a project id of ../. Rejected.
#### Logged out, expired session, wrong role, and another user's data
- A non-member cannot add a dependency.
#### Double-submit and parallel requests
- Double-click Add. One row. A parallel loop attempt fails.
#### External service failing, timing out, and rate limiting
- A failed add leaves the list.
#### New user with no data, and a user with lots of data
- A project with no dependencies shows the empty add control.
#### Refresh mid-action, back button, and two tabs
- Remove in one tab. The roadmap banner clears on refresh.

### UI checks

- Alignment, spacing, and control size on the project dependency lists and the roadmap banner.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Add and remove are buttons.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`PLAN-03`, `PLAN-07`

### Suspected bugs

- The README and the service agree there is no drawn graph. That is deferred, not a half-built canvas.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-06 Initiatives and key results

- **ID:** PLAN-06
- **Name:** Initiatives and key results
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/initiatives/page.tsx`
- `components/initiative-forms.tsx`
- `lib/key-results.ts`
- `app/api/teams/[teamId]/initiatives/route.ts`

### Expected behavior

Initiatives have a name, an optional target date, health, and an optional parent. Projects roll up under them. Key results store a target and a current value. Members create and update. A parent cannot form a loop. Health is the InitiativeHealth enum.

### Acceptance criteria

- [ ] Create an initiative and see it in the list.
- [ ] A key result shows current versus target.
- [ ] A parent loop is rejected.
- [ ] An empty name is rejected.
- [ ] A guest cannot create one.

### Test cases

#### Normal use
- Create an initiative and a key result.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty name and a blank target.
#### Wrong types, special characters, emoji, and non-English text
- Use a non-English name and emoji.
#### SQL injection, XSS, and path traversal
- Use a script-tag name. Text only.
#### Logged out, expired session, wrong role, and another user's data
- A non-member cannot update this team’s initiative.
#### Double-submit and parallel requests
- Double-click Create. One row.
#### External service failing, timing out, and rate limiting
- A failed save leaves the list.
#### New user with no data, and a user with lots of data
- No initiatives shows the empty state.
#### Refresh mid-action, back button, and two tabs
- Edit in two tabs. Refresh shows the last save.

### UI checks

- Alignment, spacing, and control size on the initiatives page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The form is keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`PLAN-03`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-07 Roadmap

- **ID:** PLAN-07
- **Name:** Roadmap
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/roadmap/page.tsx`
- `components/roadmap-reschedule.tsx`
- `lib/services/roadmap.ts`
- `lib/reschedule.ts`

### Expected behavior

The roadmap lists projects with rolled-up progress and computed health. A member can move a project a week earlier or later or edit its dates on this page. A start after the target is rejected. Dependency conflicts use the PLAN-05 banner. Guests see only their projects.

### Acceptance criteria

- [ ] The page lists projects with dates.
- [ ] Move later shifts both dates by a week.
- [ ] An edit that would invert the range is rejected.
- [ ] A guest does not see other projects.
- [ ] A project with no dates is still listed.

### Test cases

#### Normal use
- Move a project one week later and refresh.
#### Empty, missing, whitespace-only, and very long input
- Move a project that has no dates. Expect a defined message, not a 500.
#### Wrong types, special characters, emoji, and non-English text
- A project name with emoji stays in its row.
#### SQL injection, XSS, and path traversal
- The nudge is a fixed week, not a user-supplied interval that could be a script.
#### Logged out, expired session, wrong role, and another user's data
- A guest cannot nudge a hidden project.
#### Double-submit and parallel requests
- Double-click later. One week or two. Record which, and make the control idempotent if it double-applies.
#### External service failing, timing out, and rate limiting
- A failed save keeps the old dates.
#### New user with no data, and a user with lots of data
- No projects shows the empty state.
#### Refresh mid-action, back button, and two tabs
- Nudge in two tabs. Refresh shows both weeks if both requests landed.

### UI checks

- Alignment, spacing, and control size on the roadmap page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Earlier and later are buttons.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`PLAN-03`, `PLAN-05`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-08 Timeline

- **ID:** PLAN-08
- **Name:** Timeline
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/timeline/page.tsx`
- `components/timeline-chart.tsx`
- `lib/timeline.ts`
- `lib/services/timeline.ts`

### Expected behavior

Timeline (G then L, and More → Timeline) draws projects from start to target, plus cycles, releases, and initiative targets. It has a today marker and month, quarter, and year zoom. Earlier and later paging is in the URL (zoom and from). A single known date draws a short stub. Items outside the window are not drawn as if they were in it.

### Acceptance criteria

- [ ] Quarter zoom shows the range in the URL.
- [ ] Paging changes from.
- [ ] A project with both dates spans the right cells.
- [ ] A guest sees only their projects.
- [ ] Empty data shows an empty chart.

### Test cases

#### Normal use
- Open the timeline, switch to year, and page later.
#### Empty, missing, whitespace-only, and very long input
- Open with a missing from. The page picks a default window.
#### Wrong types, special characters, emoji, and non-English text
- Long names truncate inside the bar.
#### SQL injection, XSS, and path traversal
- Pass zoom=<script> and from=../../. The page falls back to a default zoom and does not read a file.
#### Logged out, expired session, wrong role, and another user's data
- A guest does not see another project’s bar.
#### Double-submit and parallel requests
- Click later twice. The URL advances twice.
#### External service failing, timing out, and rate limiting
- A failed load is the error page, not a blank chart that looks empty.
#### New user with no data, and a user with lots of data
- A new team is empty. A busy team still scrolls horizontally inside the chart.
#### Refresh mid-action, back button, and two tabs
- Refresh keeps zoom and from. Back pages back.

### UI checks

- Alignment, spacing, and control size on the timeline page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Zoom controls are buttons or links. The chart is not the only place the dates exist.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`PLAN-03`, `PLAN-01`, `PLAN-10`

### Suspected bugs

- lib/timeline.ts draws a two-week stub when only one date is known. That is intentional.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-09 Calendar

- **ID:** PLAN-09
- **Name:** Calendar
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/calendar/page.tsx`

### Expected behavior

The calendar page places issues and other dated items on a month grid. Undated issues are not given a fake day. Navigation moves by month. Guest scope applies. The page is linked from More.

### Acceptance criteria

- [ ] A due date shows the issue on that day.
- [ ] An issue with no due date is absent or listed as undated.
- [ ] Changing the month changes the grid.
- [ ] A guest does not see hidden issues.
- [ ] Today is marked.

### Test cases

#### Normal use
- Put a due date on an issue and find it on the calendar.
#### Empty, missing, whitespace-only, and very long input
- Open a month with no due dates. The grid still renders.
#### Wrong types, special characters, emoji, and non-English text
- An emoji title fits in the day cell or truncates.
#### SQL injection, XSS, and path traversal
- A month query of <script> falls back to the current month.
#### Logged out, expired session, wrong role, and another user's data
- A guest does not see out-of-scope issues on the grid.
#### Double-submit and parallel requests
- Click next month twice. The month advances by two.
#### External service failing, timing out, and rate limiting
- A failed load is an error, not an empty month that hides real issues.
#### New user with no data, and a user with lots of data
- A new team shows an empty month. A busy day wraps or shows a more-count.
#### Refresh mid-action, back button, and two tabs
- Refresh keeps the month. Back returns to the previous month.

### UI checks

- Alignment, spacing, and control size on the calendar page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. Day overflow may be a popover.
- Keyboard: Next and previous are buttons.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`

### Suspected bugs

- None found. Confirm the page’s date source when testing so cycles and issues are not double-counted.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-10 Releases and pipelines

- **ID:** PLAN-10
- **Name:** Releases and pipelines
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/releases/page.tsx`
- `components/issue-release-field.tsx`
- `lib/services/releases.ts`
- `app/api/teams/[teamId]/releases/route.ts`

### Expected behavior

Releases belong to a pipeline. Each pipeline has ordered stages that can be renamed, reordered, and deleted on the Releases page. Deleting a stage moves its issues to the first remaining stage. An issue can be placed in a release and a stage. Members manage releases. The last stage cannot be deleted if that would leave none; confirm the guard when testing.

### Acceptance criteria

- [ ] Create a pipeline, a stage, and a release.
- [ ] Put an issue in the release.
- [ ] Delete a stage and see its issues move.
- [ ] Reorder stages persists.
- [ ] A guest cannot manage them.

### Test cases

#### Normal use
- Create a release and assign an issue.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty release name.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji release name.
#### SQL injection, XSS, and path traversal
- Use a script-tag name. Text only.
#### Logged out, expired session, wrong role, and another user's data
- A non-member cannot create a release in this team.
#### Double-submit and parallel requests
- Double-click Create. One release.
#### External service failing, timing out, and rate limiting
- A failed save leaves the list.
#### New user with no data, and a user with lots of data
- No releases shows the empty state.
#### Refresh mid-action, back button, and two tabs
- Reorder in two tabs. Refresh shows one order.

### UI checks

- Alignment, spacing, and control size on the releases page and the issue release field.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Stage reorder is keyboard operable, not drag-only.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-11 Documents

- **ID:** PLAN-11
- **Name:** Documents
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/docs/page.tsx`
- `app/t/[teamSlug]/docs/[docId]/history/page.tsx`
- `components/docs-forms.tsx`
- `lib/actions/documents.ts`
- `lib/three-way-merge.ts`
- `lib/line-diff.ts`

### Expected behavior

Docs are team documents with a title and a markdown body. Every save stores a revision. History shows a line diff and can restore. If two people save, and their edits touch different lines, the save merges. If they touch the same lines, the save is refused and the editor keeps the user’s text. Comments on a document are separate from issue comments. Guests who cannot see the team’s docs are refused. Search finds documents.

### Acceptance criteria

- [ ] Create a doc and see it in the list and in search.
- [ ] History shows the previous body and restore puts it back.
- [ ] Disjoint edits merge.
- [ ] Overlapping edits are refused.
- [ ] A script tag in the body is not executed.

### Test cases

#### Normal use
- Write a doc, save twice, and restore the first revision.
#### Empty, missing, whitespace-only, and very long input
- Save an empty title. Expect an error. An empty body may be allowed.
#### Wrong types, special characters, emoji, and non-English text
- Write emoji and non-English paragraphs. The diff shows them.
#### SQL injection, XSS, and path traversal
- Write a script tag. The reader shows text or sanitized markdown, not an executed script.
#### Logged out, expired session, wrong role, and another user's data
- A non-member cannot open the doc. User A cannot restore user B’s team doc.
#### Double-submit and parallel requests
- Two tabs save different paragraphs. They merge. Two tabs save the same line. One is refused.
#### External service failing, timing out, and rate limiting
- A failed save keeps the textarea contents.
#### New user with no data, and a user with lots of data
- No docs shows the empty state. A long doc scrolls.
#### Refresh mid-action, back button, and two tabs
- Refresh keeps the saved body. Back from history returns to the doc.

### UI checks

- Alignment, spacing, and control size on the docs list, editor, and history.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The conflict message is inline.
- Keyboard: The editor is a textarea. Restore is a button.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-03`

### Suspected bugs

- None found in the merge description. Confirm the refuse message names the conflict.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-12 Customers

- **ID:** PLAN-12
- **Name:** Customers
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/customers/page.tsx`
- `components/customers-forms.tsx`

### Expected behavior

Customers have a name, an optional domain, a tier, and annual revenue. A request ties a customer to an issue. Revenue is a number the team types. There is no billing integration. Members manage customers. Guests do not get the customers nav item. Free webmail domains are special only for email intake, not for this form.

### Acceptance criteria

- [ ] Create a customer and attach a request to an issue.
- [ ] An empty name is rejected.
- [ ] Tier and revenue save and show on the demand page.
- [ ] A negative revenue is rejected if the validator says so.
- [ ] A guest cannot open the write.

### Test cases

#### Normal use
- Create a customer with a tier and revenue and link an issue.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty name and a blank revenue.
#### Wrong types, special characters, emoji, and non-English text
- Use a non-English company name and a domain with a hyphen.
#### SQL injection, XSS, and path traversal
- Use a name of <script> and a revenue of 1; DROP TABLE. The name is text. The revenue is rejected.
#### Logged out, expired session, wrong role, and another user's data
- A non-member cannot create a customer in this team.
#### Double-submit and parallel requests
- Double-click Create. One customer.
#### External service failing, timing out, and rate limiting
- A failed save leaves the list.
#### New user with no data, and a user with lots of data
- No customers shows the empty state.
#### Refresh mid-action, back button, and two tabs
- Edit revenue in two tabs. The later value wins.

### UI checks

- Alignment, spacing, and control size on the customers page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The form is keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`

### Suspected bugs

- None found. No payment provider is called from this page.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-13 Customer demand

- **ID:** PLAN-13
- **Name:** Customer demand
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/customers/demand/page.tsx`
- `lib/demand.ts`

### Expected behavior

Customers → See demand ranks open issues by how many different customers asked, or by revenue. Each customer counts once per issue. Closed issues are absent. Guest scope applies so a guest does not see demand for hidden issues. The page is empty when no requests exist.

### Acceptance criteria

- [ ] Two customers on one issue rank above one customer.
- [ ] Revenue sort uses the stored number.
- [ ] A customer who asked twice counts once.
- [ ] A done issue drops off.
- [ ] A guest does not see hidden issues in the rank.

### Test cases

#### Normal use
- Create two requests from two customers and see the issue first.
#### Empty, missing, whitespace-only, and very long input
- Open demand with no requests. Expect the empty state.
#### Wrong types, special characters, emoji, and non-English text
- Customer names with emoji render in the row.
#### SQL injection, XSS, and path traversal
- The sort query accepts only the known modes. A script tag falls back.
#### Logged out, expired session, wrong role, and another user's data
- A guest’s rank excludes other projects.
#### Double-submit and parallel requests
- Two refreshes show the same order.
#### External service failing, timing out, and rate limiting
- A failed query is an error, not a zero that looks like no demand.
#### New user with no data, and a user with lots of data
- One request and many requests both render.
#### Refresh mid-action, back button, and two tabs
- Refresh after a new request includes it.

### UI checks

- Alignment, spacing, and control size on the demand page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The sort control is a link or a select.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`PLAN-12`, `ISSUE-02`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-14 Dashboards

- **ID:** PLAN-14
- **Name:** Dashboards
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/dashboards/page.tsx`
- `lib/services/dashboards.ts`

### Expected behavior

A member can keep a dashboard of widgets (Dashboard and DashboardWidget). Widgets read team counts the member is allowed to see. A dashboard is personal (it has a user id). Another member does not see it. An empty dashboard has an empty state and a way to add a widget.

### Acceptance criteria

- [ ] Create a dashboard and a widget and see a number that matches the issue list.
- [ ] Another user does not see it.
- [ ] Remove deletes the widget only.
- [ ] A guest does not see hidden issues inside the count.

### Test cases

#### Normal use
- Add a widget and compare its count to the issue list.
#### Empty, missing, whitespace-only, and very long input
- Save a widget with no type. Expect an error.
#### Wrong types, special characters, emoji, and non-English text
- A dashboard name with emoji shows as text.
#### SQL injection, XSS, and path traversal
- A widget config of <script> is not executed.
#### Logged out, expired session, wrong role, and another user's data
- User B cannot open user A’s dashboard by id.
#### Double-submit and parallel requests
- Double-click Add. One widget.
#### External service failing, timing out, and rate limiting
- A failed add leaves the empty state.
#### New user with no data, and a user with lots of data
- No dashboards shows the empty state.
#### Refresh mid-action, back button, and two tabs
- Two tabs add widgets. Refresh shows both.

### UI checks

- Alignment, spacing, and control size on the dashboards page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Add and remove are buttons.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-03`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-15 Insights

- **ID:** PLAN-15
- **Name:** Insights
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/insights/page.tsx`
- `lib/insights.ts`
- `lib/services/insights.ts`
- `lib/services/flow-report.ts`
- `app/api/teams/[teamId]/insights/route.ts`

### Expected behavior

Insights groups and counts issues by a dimension such as status or priority. The flow report shows movement over days. GET /api/teams/{id}/insights returns the same numbers for a member. Guest scope applies. Saved reports are PLAN-16. An empty team shows zeros, not an error.

### Acceptance criteria

- [ ] The status counts match the issue list.
- [ ] Changing the dimension changes the groups.
- [ ] The API and the page agree.
- [ ] A guest does not inflate counts with hidden issues.
- [ ] A bad dimension is a 400.

### Test cases

#### Normal use
- Open insights and compare status counts to the list.
#### Empty, missing, whitespace-only, and very long input
- Request insights with no dimension. The page uses its default.
#### Wrong types, special characters, emoji, and non-English text
- Labels with emoji appear as group names as text.
#### SQL injection, XSS, and path traversal
- Pass a dimension of <script>. Rejected or ignored.
#### Logged out, expired session, wrong role, and another user's data
- A non-member gets 401 or 403 on the API.
#### Double-submit and parallel requests
- Two refreshes match.
#### External service failing, timing out, and rate limiting
- A database error is an error page, not zeros.
#### New user with no data, and a user with lots of data
- A new team shows zeros. A large team still returns.
#### Refresh mid-action, back button, and two tabs
- Refresh keeps the selected dimension if it is in the URL.

### UI checks

- Alignment, spacing, and control size on the insights page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The dimension control is a select or links.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-03`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-16 Insight builder and saved reports

- **ID:** PLAN-16
- **Name:** Insight builder and saved reports
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/insights/builder/page.tsx`
- `components/insight-reports.tsx`
- `lib/actions/insight-reports.ts`
- `lib/services/insight-reports.ts`

### Expected behavior

The builder takes a filter and a grouping and shows the count. A member can save that report, private or shared. Private reports are visible to the author. Shared reports are visible to the team. Delete removes the report and not the issues. A bad filter shows the parser error.

### Acceptance criteria

- [ ] A saved report reloads the same count.
- [ ] A private report is hidden from another member.
- [ ] Delete removes it.
- [ ] A bad filter does not save.
- [ ] A guest cannot read a report that includes hidden issues.

### Test cases

#### Normal use
- Build a status filter, save it, and reopen it.
#### Empty, missing, whitespace-only, and very long input
- Save with an empty name.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji report name.
#### SQL injection, XSS, and path traversal
- Paste a script tag into the filter JSON. The parser rejects it or treats it as a value, and the page does not execute it.
#### Logged out, expired session, wrong role, and another user's data
- User B cannot open user A’s private report.
#### Double-submit and parallel requests
- Double-click Save. One report.
#### External service failing, timing out, and rate limiting
- A failed save keeps the builder text.
#### New user with no data, and a user with lots of data
- No reports shows the empty state.
#### Refresh mid-action, back button, and two tabs
- Edit in two tabs. The later save wins.

### UI checks

- Alignment, spacing, and control size on the insight builder.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The filter textarea and Save are keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`PLAN-15`, `ISSUE-17`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-17 Public Ask form

- **ID:** PLAN-17
- **Name:** Public Ask form
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/ask/[token]/page.tsx`
- `app/t/[teamSlug]/settings/ask/page.tsx`
- `components/ask-settings.tsx`
- `lib/services/asks.ts`
- `lib/asks.ts`

### Expected behavior

An admin creates an Ask link, and can also create a named Ask form with a chosen field list (title, details, name, email, priority, label, project) and an optional show-if rule. Both resolve on /ask/{token}. The public page lets anyone file an issue into triage. It has a honeypot, a limit on links, and per-visitor and per-team rate limits. A wrong or disabled token 404s. The form does not require a Verk session. The created issue is a backlog issue attributed to the team owner so it shows in triage. The token is shown once; only a prefix is stored.

### Acceptance criteria

- [ ] A valid token creates a triage issue.
- [ ] The honeypot filled in creates nothing.
- [ ] A bad token 404s.
- [ ] The rate limit returns a calm error.
- [ ] An admin can disable the link.

### Test cases

#### Normal use
- Submit the public form and find the issue in triage.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty title and a whitespace title.
#### Wrong types, special characters, emoji, and non-English text
- Use emoji and non-English text in the title.
#### SQL injection, XSS, and path traversal
- Use a script-tag title and a token of ../. The title is text if the token is valid. A path token 404s.
#### Logged out, expired session, wrong role, and another user's data
- The form works signed out. A signed-in user is not recorded as the assignee unless the form says so.
#### Double-submit and parallel requests
- Double-click Submit. One issue, or the second is rate-limited. Record which.
#### External service failing, timing out, and rate limiting
- Over the rate limit, the form errors and does not create. A down database creates nothing.
#### New user with no data, and a user with lots of data
- A new team with no link 404s. A busy link still rate-limits.
#### Refresh mid-action, back button, and two tabs
- Refresh the thanks state. Back should not file a second issue without a new submit. Two tabs share the rate limit.

### UI checks

- Alignment, spacing, and control size on the public ask page and the ask settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The form is keyboard operable and the honeypot is not in tab order.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-28`, `AUTH-16`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## PLAN-18 Signed-in intake form

- **ID:** PLAN-18
- **Name:** Signed-in intake form
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/intake/page.tsx`
- `components/intake-form.tsx`
- `app/api/teams/[teamId]/intake/route.ts`

### Expected behavior

More → Intake is a signed-in form that creates an issue. POST /api/teams/{id}/intake accepts an external form when INTAKE_TOKEN is set as a bearer token. Without the token the route stays off. The created issue lands in triage or backlog as the route specifies. The bearer is not a user session.

### Acceptance criteria

- [ ] The signed-in form creates an issue.
- [ ] The bearer route creates an issue when the token matches.
- [ ] A wrong bearer is 401.
- [ ] With the token unset, the route is 404.
- [ ] A guest cannot use the signed-in form to escape their scope.

### Test cases

#### Normal use
- Submit the intake page as a member.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty title to the API.
#### Wrong types, special characters, emoji, and non-English text
- Submit emoji in the title.
#### SQL injection, XSS, and path traversal
- Send a script tag and a bearer of ../. Rejected or stored as text, and the path is not a file.
#### Logged out, expired session, wrong role, and another user's data
- No bearer and no session is refused. A member of another team cannot use this team’s token interchangeably if tokens are per team. They are an env token, so possession of the token is the right. Record that as a risk.
#### Double-submit and parallel requests
- Double-submit. One or two issues. Record which.
#### External service failing, timing out, and rate limiting
- A wrong token does not create an issue.
#### New user with no data, and a user with lots of data
- The first intake in a new team appears in triage.
#### Refresh mid-action, back button, and two tabs
- Refresh the form. Two tabs can both submit.

### UI checks

- Alignment, spacing, and control size on the intake page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The form submits with the keyboard.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-01`, `DEVOPS-01`

### Suspected bugs

- INTAKE_TOKEN is a single application secret, not a per-team secret, if the route checks one env value. Confirm in the route when testing and record it under risks if any holder can file into any team id.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INBOX-01 Inbox

- **ID:** INBOX-01
- **Name:** Inbox
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/inbox/page.tsx`
- `lib/services/notifications.ts`
- `app/api/teams/[teamId]/notifications/route.ts`
- `app/api/teams/[teamId]/notifications/[notificationId]/route.ts`

### Expected behavior

The inbox lists the user’s notifications for the team: assignment, mention, comment, status, and subscription, unless that type is muted. Unread count is the sidebar badge, excluding snoozed items until they are due. The user can mark read and snooze. Notifications are per user. A guest does not get the inbox link. There is no email for these events (GAP-06).

### Acceptance criteria

- [ ] A comment on a watched issue creates an unread row.
- [ ] Snooze hides it until the time passes.
- [ ] Mark read clears the badge.
- [ ] Another user does not see the row.
- [ ] A muted type is never created.

### Test cases

#### Normal use
- Trigger a comment notification, snooze it for an hour, and confirm the badge drops.
#### Empty, missing, whitespace-only, and very long input
- Open an empty inbox. Expect the empty state.
#### Wrong types, special characters, emoji, and non-English text
- A title with emoji renders in the row.
#### SQL injection, XSS, and path traversal
- The notification id in the URL is a cuid. A path is 404.
#### Logged out, expired session, wrong role, and another user's data
- User B cannot mark user A’s notification read.
#### Double-submit and parallel requests
- Double-click mark read. One update.
#### External service failing, timing out, and rate limiting
- A failed update leaves it unread.
#### New user with no data, and a user with lots of data
- A new user has an empty inbox. A busy user can scroll.
#### Refresh mid-action, back button, and two tabs
- Snooze in one tab. The other badge updates on refresh.

### UI checks

- Alignment, spacing, and control size on the inbox page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. Snooze choices are a menu.
- Keyboard: Rows are keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-15`, `INBOX-02`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INBOX-02 Notification preferences

- **ID:** INBOX-02
- **Name:** Notification preferences
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/settings/notifications/page.tsx`
- `components/notification-settings.tsx`
- `lib/notification-prefs.ts`
- `lib/actions/notifications.ts`

### Expected behavior

Settings → Notifications turns off assigned, mentions, comments, status changes, or subscription notifications for the signed-in user. Muted types are not created, on any team. The preference is one row per user, not per team. Another user is unaffected.

### Acceptance criteria

- [ ] Turning off comments stops new comment notifications.
- [ ] Existing rows remain until read.
- [ ] Another user still receives theirs.
- [ ] The toggle persists after refresh.

### Test cases

#### Normal use
- Mute comments, have someone comment, and confirm no new row.
#### Empty, missing, whitespace-only, and very long input
- There is no text field. Saving with no change is a no-op.
#### Wrong types, special characters, emoji, and non-English text
- Labels are translated with the locale. The stored keys stay English enums.
#### SQL injection, XSS, and path traversal
- A posted type of <script> is rejected.
#### Logged out, expired session, wrong role, and another user's data
- User A cannot change user B’s preference.
#### Double-submit and parallel requests
- Double-click the toggle. It ends in one state.
#### External service failing, timing out, and rate limiting
- A failed save returns the toggle to the saved state.
#### New user with no data, and a user with lots of data
- A new user has all types on.
#### Refresh mid-action, back button, and two tabs
- Toggle in two tabs. Refresh shows the last write.

### UI checks

- Alignment, spacing, and control size on the notification settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The toggles are keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`INBOX-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## GAP-06 Email alerts for inbox events

- **ID:** GAP-06
- **Name:** Email alerts for inbox events
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `lib/email.ts`
- `lib/services/notifications.ts`

### Expected behavior

lib/email.ts sends team invite mail and nothing else. Inbox events stay in the app. A person who is away from Verk is not mailed when they are assigned or mentioned. This item is optional mail for the notification types the user has not muted, using the same Resend key, with a per-user off switch that already exists for in-app types.

### Acceptance criteria

- [ ] An assignment sends one mail when Resend is set and the type is not muted.
- [ ] No mail when the type is muted.
- [ ] No mail when the key is unset, and the in-app row still exists.
- [ ] The mail body escapes HTML.
- [ ] A user cannot subscribe another user’s address.

### Test cases

#### Normal use
- Assign an issue and receive one mail.
#### Empty, missing, whitespace-only, and very long input
- There is no extra text field beyond the issue itself.
#### Wrong types, special characters, emoji, and non-English text
- An emoji title is readable in the mail subject.
#### SQL injection, XSS, and path traversal
- A script-tag title is escaped in the HTML part.
#### Logged out, expired session, wrong role, and another user's data
- User B does not get user A’s mail.
#### Double-submit and parallel requests
- Two rapid comments do not send two mails for one event. Record the batching.
#### External service failing, timing out, and rate limiting
- Resend 500 leaves the in-app notification in place.
#### New user with no data, and a user with lots of data
- A user with no notifications gets no mail. A busy user is not mailed for muted types.
#### Refresh mid-action, back button, and two tabs
- Refresh does not resend.

### UI checks

- Alignment, spacing, and control size on a mail message, plus the existing notification toggles.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The existing toggles cover the preference.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`INBOX-01`, `INBOX-02`, `DEVOPS-01`

### Suspected bugs

- lib/email.ts only exports the invite sender. No notification mail call exists.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## OFFLINE-01 Installable PWA and offline page

- **ID:** OFFLINE-01
- **Name:** Installable PWA and offline page
- **Priority:** P1
- **Status:** PASSED

### Files

- `public/manifest.webmanifest`
- `app/sw.ts`
- `app/~offline/page.tsx`
- `components/pwa/install-prompt.tsx`
- `components/pwa/pwa-provider.tsx`
- `components/pwa/offline-banner.tsx`
- `app/t/go/page.tsx`
- `lib/app-links.ts`

### Expected behavior

The root layout points at the web manifest and the apple touch icon. Production builds register a Serwist worker (public/sw.js). Development disables it. The worker precaches /~offline. The install prompt offers install. The offline banner shows when the browser is offline. There is no Electron or native shell. NEXT_PUBLIC_PWA_OFFLINE=false turns the outbox off; the manifest remains. Installed-app shortcuts and Share to Verk land on /t/go. A signed-out visitor is sent to login with the query preserved. With no team they go to onboarding. Otherwise the first team receives them: new issue, my issues, inbox, or a prefilled draft from the shared title, text, and url.

### Acceptance criteria

- [ ] The manifest and icons exist after a production build.
- [ ] Install adds a standalone window.
- [ ] Offline navigation to an uncached URL shows the offline page.
- [ ] A cached issue page still opens.
- [ ] The offline page is not in the sitemap allow list as a page to index (robots disallow /~offline).

### Test cases

#### Normal use
- Load the production build, install, and go offline.
#### Empty, missing, whitespace-only, and very long input
- There is no text field on the offline page.
#### Wrong types, special characters, emoji, and non-English text
- The offline page heading is English even when the locale is German. Record that.
#### SQL injection, XSS, and path traversal
- The service worker does not cache authenticated JSON for another user on a shared browser without a Vary or cache rule. Confirm.
#### Logged out, expired session, wrong role, and another user's data
- The offline page is public. Team data is not inside it.
#### Double-submit and parallel requests
- Reload twice. One worker controls the page.
#### External service failing, timing out, and rate limiting
- A failed worker registration still loads the online app.
#### New user with no data, and a user with lots of data
- A new browser shows the install prompt once. A returning installed app does not.
#### Refresh mid-action, back button, and two tabs
- Refresh online clears the banner. Two tabs share the online state.

### UI checks

- Alignment, spacing, and control size on the install prompt and the offline page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal besides the browser install sheet.
- Keyboard: The install button is a button.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DEVOPS-02`, `SEO-01`

### Suspected bugs

- app/~offline/page.tsx:14-18 uses the same hardcoded light gradient as the error page, so the offline page ignores dark theme.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## OFFLINE-02 Offline outbox and sync

- **ID:** OFFLINE-02
- **Name:** Offline outbox and sync
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `lib/offline/db.ts`
- `lib/offline/sync-engine.ts`
- `lib/offline/outbox-payload.ts`
- `lib/offline/issue-repository.ts`
- `app/api/teams/[teamId]/issues/sync/route.ts`

### Expected behavior

When the flag is not false, Dexie stores an outbox. Creating or editing an issue, a comment, labels, estimate, due date, or project while offline queues and replays through the sync route when the browser reconnects. clientMutationId keeps replays from duplicating. The sync route requires a session and a membership. A guest's queue cannot write outside their scope.

### Acceptance criteria

- [ ] Create an issue offline, reconnect, and see it on the server with one number.
- [ ] A comment queued offline appears once.
- [ ] A disabled flag does not queue.
- [ ] A 401 on sync keeps the queue and asks the user to sign in.
- [ ] Replay is idempotent.

### Test cases

#### Normal use
- Go offline, create an issue, reconnect, and find one issue.
#### Empty, missing, whitespace-only, and very long input
- Queue an empty title. The server rejects it and the client shows the error instead of retrying forever.
#### Wrong types, special characters, emoji, and non-English text
- Queue a title with emoji.
#### SQL injection, XSS, and path traversal
- Queue a title of <script>. It syncs as text.
#### Logged out, expired session, wrong role, and another user's data
- Sign out before reconnect. The queue does not apply to the next user on that browser.
#### Double-submit and parallel requests
- Reconnect twice. One issue.
#### External service failing, timing out, and rate limiting
- If the server returns 500, the item stays queued. A 400 is not retried blindly.
#### New user with no data, and a user with lots of data
- A new user with an empty cache and a user with a large cache both sync.
#### Refresh mid-action, back button, and two tabs
- Refresh while offline shows cached issues. Two tabs share one Dexie queue.

### UI checks

- Alignment, spacing, and control size on the offline banner and the issues list.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The conflict modal is OFFLINE-03.
- Keyboard: Sync has no extra shortcut.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-01`, `ISSUE-05`, `AUTH-04`

### Suspected bugs

- None found in the sync route's existence. Confirm the queue is cleared only after a 2xx.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## OFFLINE-03 Edit conflicts

- **ID:** OFFLINE-03
- **Name:** Edit conflicts
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `components/pwa/conflict-modal.tsx`
- `lib/offline/sync-logic.ts`

### Expected behavior

If the server revision moved while the client was offline, sync opens a conflict modal: keep mine or keep theirs. Issues use the same revision check as the online editor. Documents use the line merge in PLAN-11. Choosing keep theirs drops the local edit. Choosing keep mine retries the write. Closing the modal must not silently pick one.

### Acceptance criteria

- [ ] A stale offline edit opens the dialog.
- [ ] Keep mine writes the local text.
- [ ] Keep theirs keeps the server text.
- [ ] Escape does not choose.
- [ ] A fresh edit with the current revision does not open the dialog.

### Test cases

#### Normal use
- Edit online in one browser and offline in another, then sync.
#### Empty, missing, whitespace-only, and very long input
- There is no free text beyond the two versions.
#### Wrong types, special characters, emoji, and non-English text
- Emoji in both versions is visible in the dialog.
#### SQL injection, XSS, and path traversal
- The dialog text is the issue body, rendered as text.
#### Logged out, expired session, wrong role, and another user's data
- User B's conflict is not shown to user A.
#### Double-submit and parallel requests
- Double-click Keep mine. One write.
#### External service failing, timing out, and rate limiting
- If the retry fails, the dialog stays and the local copy remains.
#### New user with no data, and a user with lots of data
- One conflict and several queued conflicts are handled in order.
#### Refresh mid-action, back button, and two tabs
- Refresh during the dialog restores the choice from the queue, not from a lost memory.

### UI checks

- Alignment, spacing, and control size on the conflict dialog.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- This is a modal. Escape must not choose. Focus returns to the issue.
- Keyboard: Both choices are buttons.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`OFFLINE-02`, `ISSUE-02`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-01 GitHub webhook and pull-request automation

- **ID:** INT-01
- **Name:** GitHub webhook and pull-request automation
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/api/github/webhook/route.ts`
- `lib/github-events.ts`
- `lib/github.ts`

### Expected behavior

POST /api/github/webhook checks the HMAC in GITHUB_WEBHOOK_SECRET. A pull request that mentions the team key (for example ACM-123) is stored as a link. Opening the PR starts the issue when it is backlog or todo. Merging finishes it when the body says fixes or when the team's merge-completes switch is on. Without the secret the route stays off. Verk does not merge the pull request. When GITHUB_TOKEN is set, a status change comments on the linked PR.

### Acceptance criteria

- [ ] A signed ping is accepted.
- [ ] An unsigned body is rejected.
- [ ] fixes ACM-12 on merge completes that issue.
- [ ] A PR for another repo is ignored.
- [ ] A replay does not create a second link.

### Test cases

#### Normal use
- Send a signed pull_request opened event that mentions an issue.
#### Empty, missing, whitespace-only, and very long input
- Send an empty body and a body with no issue key.
#### Wrong types, special characters, emoji, and non-English text
- A PR title with emoji is stored as text.
#### SQL injection, XSS, and path traversal
- Send a bad signature and a body of <script>. Rejected or stored as text, never executed.
#### Logged out, expired session, wrong role, and another user's data
- The route has no user session. It acts as the integration, not as an admin bypass for unrelated teams.
#### Double-submit and parallel requests
- Deliver the same event twice. One link.
#### External service failing, timing out, and rate limiting
- GitHub retries on a 500. A 4xx must not cause a duplicate. A missing secret is 404.
#### New user with no data, and a user with lots of data
- The first link on an issue, and a second PR, both show.
#### Refresh mid-action, back button, and two tabs
- Refresh the issue page after the webhook. Two deliveries do not double-complete.

### UI checks

- Alignment, spacing, and control size on the GitHub link on the issue.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `ISSUE-13`, `DEVOPS-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-02 GitLab webhook

- **ID:** INT-02
- **Name:** GitLab webhook
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/api/gitlab/webhook/route.ts`
- `lib/gitlab-events.ts`

### Expected behavior

POST /api/gitlab/webhook checks the token against GITLAB_WEBHOOK_SECRET. The team's gitlabProject must match the project path. Merge request events that mention the issue key link, start, and complete under the same rules as GitHub. Other events are ignored. Without the secret the route is off.

### Acceptance criteria

- [ ] A matching merge request links the issue.
- [ ] A wrong token is rejected.
- [ ] A different project path is ignored.
- [ ] Merge completes only under the same rules as GitHub.
- [ ] No secret returns 404.

### Test cases

#### Normal use
- Send a signed merge request event that mentions an issue.
#### Empty, missing, whitespace-only, and very long input
- Send an empty body.
#### Wrong types, special characters, emoji, and non-English text
- A title with emoji is stored as text.
#### SQL injection, XSS, and path traversal
- Send a wrong token and a script in the title. Rejected.
#### Logged out, expired session, wrong role, and another user's data
- No user session. The route cannot be used as a member of an arbitrary team.
#### Double-submit and parallel requests
- Retry the same event. One link.
#### External service failing, timing out, and rate limiting
- A timeout from the database returns an error GitLab can retry without a duplicate.
#### New user with no data, and a user with lots of data
- One MR and several MRs both show on the issue.
#### Refresh mid-action, back button, and two tabs
- Refresh the issue after the event.

### UI checks

- Alignment, spacing, and control size on the GitLab link on the issue.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`INT-01`, `TEAM-04`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-03 Slack commands, mentions, and shortcuts

- **ID:** INT-03
- **Name:** Slack commands, mentions, and shortcuts
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/api/slack/command/route.ts`
- `app/api/slack/events/route.ts`
- `app/api/slack/interactivity/route.ts`
- `lib/services/slack-intake.ts`
- `lib/slack.ts`

### Expected behavior

Slack requests are signed and rejected when older than five minutes. The team is chosen by workspace id and optional channel id, then by SLACK_TEAM_SLUG. The Slack user must match a Verk member by email and acts as that member. Guests and strangers cannot create. /verk creates an issue, /verk customer: records a request, /verk assign and /verk status update an issue. An app mention creates an issue and replies in the thread. Slack's 3-second retry is ignored. The message shortcut creates an issue from the message. Without the signing secret the routes stay off.

### Acceptance criteria

- [ ] A signed /verk creates one issue.
- [ ] A stale timestamp is rejected.
- [ ] A retry does not create a second issue.
- [ ] An unknown email is refused.
- [ ] assign and status use the member's role.

### Test cases

#### Normal use
- Send /verk with a title and see the issue.
#### Empty, missing, whitespace-only, and very long input
- Send /verk with an empty title.
#### Wrong types, special characters, emoji, and non-English text
- Send a title with emoji and non-English text.
#### SQL injection, XSS, and path traversal
- Send a title of <script> and a bad signature. The bad signature is rejected. A good signature stores the title as text.
#### Logged out, expired session, wrong role, and another user's data
- A Slack user who is not a member cannot create. A guest cannot.
#### Double-submit and parallel requests
- Slack retries the event. One issue.
#### External service failing, timing out, and rate limiting
- A clock skew over five minutes is rejected. A down database returns an error Slack may retry.
#### New user with no data, and a user with lots of data
- The first command in a new mapping works. A busy channel still maps to one team.
#### Refresh mid-action, back button, and two tabs
- Refresh Slack. The Verk issue exists once.

### UI checks

- Alignment, spacing, and control size on Slack, plus the issue it creates.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No Verk modal.
- Keyboard: Not a Verk keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-01`, `TEAM-04`, `DEVOPS-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-04 Slack unfurls and channel notifications

- **ID:** INT-04
- **Name:** Slack unfurls and channel notifications
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `lib/slack-unfurl.ts`
- `lib/services/slack-unfurl.ts`
- `lib/services/notifications.ts`

### Expected behavior

When the Slack app has links:read and links:write, pasting a Verk issue URL unfurls it. Notifications for create, assign, status, and comments post once to the team's channel or SLACK_CHANNEL via the bot. If there is no bot, the team's incoming webhook is used. Never both. The message does not include secrets.

### Acceptance criteria

- [ ] Pasting an issue URL shows the title.
- [ ] A status change posts once.
- [ ] Bot and webhook are not both used.
- [ ] A URL for an issue the Slack mapping cannot see is not unfurled with private text.
- [ ] A muted in-app type does not have to suppress Slack; confirm and record.

### Test cases

#### Normal use
- Paste an issue URL in Slack and see the unfurl.
#### Empty, missing, whitespace-only, and very long input
- Paste a URL with no issue number.
#### Wrong types, special characters, emoji, and non-English text
- An emoji title unfurls as text.
#### SQL injection, XSS, and path traversal
- Paste a URL with a script in a query. The unfurl uses the issue, not the query.
#### Logged out, expired session, wrong role, and another user's data
- An issue the mapped team cannot access does not leak the title.
#### Double-submit and parallel requests
- Change status once. One Slack message.
#### External service failing, timing out, and rate limiting
- Slack 500 does not fail the issue save.
#### New user with no data, and a user with lots of data
- A team with no channel and no webhook skips the post.
#### Refresh mid-action, back button, and two tabs
- Refresh the issue. Slack does not get a second post.

### UI checks

- Alignment, spacing, and control size on a Slack message.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`INT-03`, `INBOX-01`

### Suspected bugs

- Confirm whether a notification preference also suppresses Slack. If it does not, record that as a bug or a note.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-05 Email intake

- **ID:** INT-05
- **Name:** Email intake
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `app/api/teams/[teamId]/email/route.ts`
- `lib/email-intake.ts`

### Expected behavior

POST /api/teams/{id}/email with Authorization Bearer EMAIL_INTAKE_TOKEN turns a provider payload into a backlog issue. The subject is the title with Re: and Fwd: removed. The body drops quoted replies and signatures. The sender is noted. A matching customer domain records a request; other domains create a customer; free webmail does not match. Auto-replies, bounces, no-reply, and lists are dropped with 200 so the provider does not retry. The same message id returns the same issue. The limit is 60 per minute per IP. Without the token the route is 404. Attachments are not imported. The body is plain text.

### Acceptance criteria

- [ ] A normal message creates one triage issue.
- [ ] A retry with the same message id does not create a second.
- [ ] An auto-reply creates nothing and returns 200.
- [ ] A wrong bearer is refused.
- [ ] HTML in the body is not executed.

### Test cases

#### Normal use
- Post a sample message and see the issue.
#### Empty, missing, whitespace-only, and very long input
- Post an empty subject.
#### Wrong types, special characters, emoji, and non-English text
- Post a subject with emoji and a non-English body.
#### SQL injection, XSS, and path traversal
- Post a subject of <script> and a bearer of ../. The script is text if accepted. A bad bearer is refused.
#### Logged out, expired session, wrong role, and another user's data
- No user session. The token is the authority. Any holder can file into that team id.
#### Double-submit and parallel requests
- Post the same message id twice. One issue.
#### External service failing, timing out, and rate limiting
- The 61st request in a minute is limited. A down database returns 500 so the provider can retry.
#### New user with no data, and a user with lots of data
- The first message from a new domain creates a customer. A gmail.com sender does not.
#### Refresh mid-action, back button, and two tabs
- Refresh is a new POST only if the provider sends it. The message id keeps it idempotent.

### UI checks

- Alignment, spacing, and control size on no page; the issue appears in triage.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-28`, `PLAN-12`, `DEVOPS-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-06 Sentry intake

- **ID:** INT-06
- **Name:** Sentry intake
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `app/api/teams/[teamId]/sentry/route.ts`
- `lib/sentry.ts`

### Expected behavior

POST /api/teams/{id}/sentry checks Sentry-Hook-Signature as HMAC-SHA256 of the raw body using SENTRY_WEBHOOK_SECRET. Only issue created and event_alert are handled. Other hooks return 200 and do nothing. fatal, error, warning, and the rest map to urgent, high, medium, and low. The Sentry link is attached. The Sentry issue id is the idempotency key. Without the secret the route is 404.

### Acceptance criteria

- [ ] A created hook files one issue.
- [ ] A repeat alert does not file a second.
- [ ] A bad signature is rejected.
- [ ] Assigned and resolved hooks do nothing.
- [ ] The priority matches the level.

### Test cases

#### Normal use
- Send a signed issue.created payload.
#### Empty, missing, whitespace-only, and very long input
- Send an empty body.
#### Wrong types, special characters, emoji, and non-English text
- A Sentry title with emoji is stored as text.
#### SQL injection, XSS, and path traversal
- Send a bad signature and a script in the title. Rejected.
#### Logged out, expired session, wrong role, and another user's data
- No user session. The secret is the authority for that team id.
#### Double-submit and parallel requests
- Send the same Sentry issue id twice. One Verk issue.
#### External service failing, timing out, and rate limiting
- A database error can be retried by Sentry without a duplicate because of the idempotency key.
#### New user with no data, and a user with lots of data
- The first alert and a later alert for the same id stay one issue.
#### Refresh mid-action, back button, and two tabs
- Refresh the Verk issue. It exists once.

### UI checks

- Alignment, spacing, and control size on the Sentry link on the created issue.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-28`, `DEVOPS-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-07 Linear import

- **ID:** INT-07
- **Name:** Linear import
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/settings/import/page.tsx`
- `components/import-settings-forms.tsx`
- `lib/import/linear-csv.ts`
- `lib/import/linear-pages.ts`
- `lib/services/import.ts`

### Expected behavior

Settings → Import loads a Linear CSV or calls the Linear API. Import maps statuses and stops at 2,000 issues. A member who can manage settings runs it. A bad file shows an error and does not half-create a team. Re-import behavior (duplicates versus new numbers) must be recorded from the service when tested.

### Acceptance criteria

- [ ] A small CSV creates the issues.
- [ ] A file over the cap stops at 2,000 and says so.
- [ ] A bad API key does not create issues.
- [ ] Statuses map onto Verk statuses.
- [ ] A guest cannot run it.

### Test cases

#### Normal use
- Import a two-row CSV and see both issues.
#### Empty, missing, whitespace-only, and very long input
- Upload an empty file.
#### Wrong types, special characters, emoji, and non-English text
- Import a title with emoji.
#### SQL injection, XSS, and path traversal
- Upload a CSV with a formula title and a script. The title is stored as text and a formula is neutralized if the exporter's rule is shared.
#### Logged out, expired session, wrong role, and another user's data
- A non-admin is refused if the action checks admin. Confirm the role.
#### Double-submit and parallel requests
- Double-click Import. One set of issues.
#### External service failing, timing out, and rate limiting
- A Linear API timeout stops the import and reports how far it got.
#### New user with no data, and a user with lots of data
- A new team imports into an empty backlog. A team with issues keeps its old numbers.
#### Refresh mid-action, back button, and two tabs
- Refresh during import. The result count matches the database.

### UI checks

- Alignment, spacing, and control size on the import settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The file input and the submit button are keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-01`, `TEAM-03`

### Suspected bugs

- None found. The 2,000 cap is in the Linear paging helper.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-08 Generic CSV import

- **ID:** INT-08
- **Name:** Generic CSV import
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/settings/import/csv/page.tsx`
- `components/csv-import.tsx`
- `lib/import/generic-csv.ts`
- `lib/services/import-generic.ts`

### Expected behavior

Settings → Import CSV uploads any CSV, maps columns to fields, previews rows, and then imports. Unknown statuses map through the helper's aliases (todo, in progress, and the rest). A bad row is reported and does not abort the rows that were valid, or the import is atomic. Record which when tested.

### Acceptance criteria

- [ ] Preview shows the mapped columns.
- [ ] Import creates one issue per valid row.
- [ ] An unmapped title column is refused.
- [ ] A guest cannot import.

### Test cases

#### Normal use
- Map Title and import two rows.
#### Empty, missing, whitespace-only, and very long input
- Upload a header-only file.
#### Wrong types, special characters, emoji, and non-English text
- Import emoji titles.
#### SQL injection, XSS, and path traversal
- Import a cell of =cmd and a cell of <script>. They are text, and a formula is not executed in Verk.
#### Logged out, expired session, wrong role, and another user's data
- A non-member cannot post the file to this team.
#### Double-submit and parallel requests
- Double-click Import. One set.
#### External service failing, timing out, and rate limiting
- A huge file fails with a clear error rather than a timeout that looks like success.
#### New user with no data, and a user with lots of data
- A new team and a full team both import.
#### Refresh mid-action, back button, and two tabs
- Refresh the preview. Back does not import twice.

### UI checks

- Alignment, spacing, and control size on the CSV import wizard.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The mapping step is a form, not a modal.
- Keyboard: Column selects are keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`INT-07`, `ISSUE-01`

### Suspected bugs

- components/settings-nav.tsx:77-80 also highlights the Linear import link on this page because /import is a prefix of /import/csv.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-09 Issue export

- **ID:** INT-09
- **Name:** Issue export
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/settings/export/page.tsx`
- `lib/export.ts`
- `lib/services/export.ts`
- `app/api/teams/[teamId]/export/route.ts`

### Expected behavior

GET /api/teams/{id}/export downloads issues as CSV or JSON. Members and above. The cap is 20,000 rows. Formula-like titles are neutralized. The file includes status, estimate, people, project, cycle, labels, parent, and timestamps. It does not include comments, attachments, or activity. archived=1 includes archived rows on this route. Guest scope applies. The download is audited.

### Acceptance criteria

- [ ] A member gets a CSV that includes a known issue.
- [ ] format=json returns JSON.
- [ ] A signed-out call is 401.
- [ ] A guest does not receive hidden issues.
- [ ] A formula title is prefixed so a spreadsheet does not execute it.

### Test cases

#### Normal use
- Download CSV and JSON and find a known issue.
#### Empty, missing, whitespace-only, and very long input
- Call the route with no query. The default is CSV of active issues.
#### Wrong types, special characters, emoji, and non-English text
- An emoji title round-trips.
#### SQL injection, XSS, and path traversal
- A title of =1+1 is neutralized. A title of <script> is a CSV field, not HTML.
#### Logged out, expired session, wrong role, and another user's data
- A signed-out call is 401. A guest's file is scoped. Another team is 403.
#### Double-submit and parallel requests
- Two downloads match.
#### External service failing, timing out, and rate limiting
- A database error does not return a 200 empty file.
#### New user with no data, and a user with lots of data
- A new team exports a header. A team at the cap truncates and says so.
#### Refresh mid-action, back button, and two tabs
- Refresh downloads again. The audit log shows both if each download is audited.

### UI checks

- Alignment, spacing, and control size on the export settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal. The result is a download.
- Keyboard: The format control and the download button are keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-03`, `SET-03`

### Suspected bugs

- The export query uses archived=1 while the issues page uses archived=true (app/t/[teamSlug]/issues/page.tsx:135). The two flags differ on purpose only if the export parser accepts 1. Confirm lib/services/export.ts.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-10 Outbound webhooks and delivery log

- **ID:** INT-10
- **Name:** Outbound webhooks and delivery log
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/settings/webhooks/page.tsx`
- `components/webhooks-form.tsx`
- `lib/services/webhooks.ts`
- `lib/webhook-delivery.ts`
- `lib/webhook-sign.ts`
- `app/api/teams/[teamId]/webhooks/route.ts`
- `app/api/teams/[teamId]/webhooks/[webhookId]/route.ts`

### Expected behavior

Admins create a webhook. The secret is shown once. Each delivery is logged with status and response. Failures retry with backoff. A team's overdue retries also run when it fires another event, and the daily cron sweeps the rest. The URL is refused when it is a private address unless WEBHOOK_ALLOW_PRIVATE=1. Create, delete, and toggle are audited. A member who is not an admin cannot manage them. The delivery does not include API secrets.

### Acceptance criteria

- [ ] A created webhook receives a signed test or the next event.
- [ ] A private IP is refused.
- [ ] A failed delivery is retried.
- [ ] Manual retry sends again.
- [ ] The secret is not shown a second time.

### Test cases

#### Normal use
- Create a webhook to a test server and change an issue.
#### Empty, missing, whitespace-only, and very long input
- Submit an empty URL.
#### Wrong types, special characters, emoji, and non-English text
- Submit a URL with a non-ASCII host. It is rejected or accepted as a valid URL.
#### SQL injection, XSS, and path traversal
- Submit http://127.0.0.1/ and a URL of file:///etc/passwd. Both refused.
#### Logged out, expired session, wrong role, and another user's data
- A member cannot create a webhook. A signed-out call is refused.
#### Double-submit and parallel requests
- Double-click Create. One webhook. A burst of events does not lose the signature.
#### External service failing, timing out, and rate limiting
- A receiver that times out is logged as a failure and retried later.
#### New user with no data, and a user with lots of data
- No webhooks shows the empty state. Many deliveries page.
#### Refresh mid-action, back button, and two tabs
- Disable in one tab. The other stops sending after refresh.

### UI checks

- Alignment, spacing, and control size on the webhooks settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The secret-once panel must be copyable and must not be the only place the URL can be recovered.
- Keyboard: The form is keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `JOB-01`, `TEAM-03`

### Suspected bugs

- None found in the SSRF description.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-11 REST hooks

- **ID:** INT-11
- **Name:** REST hooks
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `app/api/teams/[teamId]/hooks/route.ts`

### Expected behavior

POST /api/teams/{id}/hooks subscribes a URL and DELETE or a matching call unsubscribes it. The route returns a sample payload. It uses the same API key auth and the same SSRF guard as webhooks. A guest key cannot subscribe.

### Acceptance criteria

- [ ] A member key can subscribe and receives the sample.
- [ ] Unsubscribe removes it.
- [ ] A private URL is refused.
- [ ] A guest key is refused.
- [ ] A bad key is 401.

### Test cases

#### Normal use
- Subscribe and unsubscribe with a member key.
#### Empty, missing, whitespace-only, and very long input
- POST an empty URL.
#### Wrong types, special characters, emoji, and non-English text
- POST a URL with encoded non-ASCII.
#### SQL injection, XSS, and path traversal
- POST a link-local URL. Refused.
#### Logged out, expired session, wrong role, and another user's data
- A guest key is forbidden. No key is 401.
#### Double-submit and parallel requests
- Subscribe twice with the same URL. One subscription or two. Record which.
#### External service failing, timing out, and rate limiting
- A down database creates nothing.
#### New user with no data, and a user with lots of data
- The first hook and many hooks both list.
#### Refresh mid-action, back button, and two tabs
- Repeat unsubscribe. The second is a clean not-found.

### UI checks

- Alignment, spacing, and control size on no page; the hooks API.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`INT-10`, `INT-14`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-12 SCIM

- **ID:** INT-12
- **Name:** SCIM
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/api/scim/Users/route.ts`
- `app/api/scim/Users/[id]/route.ts`
- `app/api/scim/Groups/route.ts`
- `app/api/scim/Groups/[id]/route.ts`
- `app/api/scim/ServiceProviderConfig/route.ts`
- `app/api/scim/ResourceTypes/route.ts`
- `lib/scim.ts`
- `lib/services/scim-groups.ts`

### Expected behavior

All /api/scim routes require Authorization Bearer SCIM_TOKEN and return SCIM JSON. Users can be listed, created, replaced, patched, and deleted. active false or DELETE deactivates the user: sessions, password, OAuth, SAML, and API keys stop. Groups are teams. POST /Groups links an existing team and does not create one. PATCH add, remove, and replace members. New members are MEMBER. Owners are never removed or demoted. Unknown users are skipped. Without the token the routes are off. changePassword is advertised as unsupported. Bulk is unsupported.

### Acceptance criteria

- [ ] A valid user POST creates a user.
- [ ] Deactivate stops sign-in and keys.
- [ ] Group PATCH adds a member.
- [ ] An owner stays.
- [ ] A wrong bearer is 401.
- [ ] POST /Groups does not create a team.

### Test cases

#### Normal use
- Create a user, add them to a group, and sign in as them.
#### Empty, missing, whitespace-only, and very long input
- POST a user with no userName.
#### Wrong types, special characters, emoji, and non-English text
- Use a non-English display name.
#### SQL injection, XSS, and path traversal
- Send a filter of userName eq "<script>" and a path of ../. The filter is a comparison. The path 404s.
#### Logged out, expired session, wrong role, and another user's data
- No bearer is 401. The token is not a team role. A deactivated user cannot keep a JWT (lib/auth.ts jwt callback).
#### Double-submit and parallel requests
- PATCH the same member twice. One membership.
#### External service failing, timing out, and rate limiting
- A down database returns a SCIM error, not a partial member.
#### New user with no data, and a user with lots of data
- An empty directory lists zero users. A large directory pages.
#### Refresh mid-action, back button, and two tabs
- Deactivate in one request and refresh the user's tab. The next request is signed out.

### UI checks

- Alignment, spacing, and control size on no product page; SCIM JSON.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-02`, `TEAM-08`, `DEVOPS-01`

### Suspected bugs

- app/api/scim/ServiceProviderConfig/route.ts:10 advertises changePassword supported false, which matches the missing change-password feature (GAP-02).

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-13 OAuth apps

- **ID:** INT-13
- **Name:** OAuth apps
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/settings/oauth/page.tsx`
- `app/oauth/authorize/page.tsx`
- `app/api/oauth/token/route.ts`
- `components/oauth-settings.tsx`
- `lib/services/oauth.ts`
- `lib/actions/oauth.ts`

### Expected behavior

Admins register an OAuth app. The authorize page asks the signed-in user to allow it. POST /api/oauth/token exchanges a code with PKCE. Issued tokens are scoped API keys tied to the app, so revoking the app revokes them. Codes expire and are pruned by the daily cron. A bad redirect URI is refused. A guest cannot approve more than their role.

### Acceptance criteria

- [ ] The authorize page names the app.
- [ ] A valid code and verifier return a token.
- [ ] A reused code fails.
- [ ] A wrong verifier fails.
- [ ] Revoking the app stops the token.

### Test cases

#### Normal use
- Approve an app and exchange the code.
#### Empty, missing, whitespace-only, and very long input
- Open authorize with no client id. The page says it cannot authorize.
#### Wrong types, special characters, emoji, and non-English text
- An app name with emoji shows as text.
#### SQL injection, XSS, and path traversal
- Pass a redirect URI of javascript:alert(1) and a code of ../. Both refused.
#### Logged out, expired session, wrong role, and another user's data
- Signed out, authorize redirects to login. User A cannot approve as user B.
#### Double-submit and parallel requests
- Exchange the same code twice. The second fails.
#### External service failing, timing out, and rate limiting
- A down database does not issue a token.
#### New user with no data, and a user with lots of data
- The first app and many apps list in settings.
#### Refresh mid-action, back button, and two tabs
- Deny in one tab. The code in the other is useless.

### UI checks

- Alignment, spacing, and control size on OAuth settings and the authorize page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The authorize page is a full page, not a modal.
- Keyboard: Approve and deny are buttons.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`INT-14`, `AUTH-02`, `JOB-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## INT-14 API keys

- **ID:** INT-14
- **Name:** API keys
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/settings/api-keys/page.tsx`
- `components/api-keys-settings.tsx`
- `lib/services/api-keys.ts`
- `lib/actions/api-keys.ts`
- `lib/api-auth.ts`

### Expected behavior

A member creates a key shown once (verk_…). The key's role is GUEST, MEMBER, or ADMIN and cannot exceed the creator's current team role. Demoting the creator weakens the key. Removing the creator, or SCIM deactivating them, stops the key. Writes need MEMBER or higher. The key prefix is what the audit log stores. A key for team A does not work on team B.

### Acceptance criteria

- [ ] Create a member key and call the issues API.
- [ ] The full secret is not shown again.
- [ ] A guest key cannot create an issue.
- [ ] A key stops working when the creator is removed.
- [ ] A bad key is 401.

### Test cases

#### Normal use
- Create a key and list issues with it.
#### Empty, missing, whitespace-only, and very long input
- Create with an empty name.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji name. The prefix is still the identifier.
#### SQL injection, XSS, and path traversal
- Send Authorization Bearer <script> and a key of ../. 401.
#### Logged out, expired session, wrong role, and another user's data
- A guest key posting an issue is 403. No header is 401. User A's key does not read team B.
#### Double-submit and parallel requests
- Double-click Create. Two keys or one. Record which.
#### External service failing, timing out, and rate limiting
- A down database does not mint a key that was not stored.
#### New user with no data, and a user with lots of data
- A user with no keys sees the empty state. A user with many keys can revoke one.
#### Refresh mid-action, back button, and two tabs
- Revoke in one tab. The other request with that key fails.

### UI checks

- Alignment, spacing, and control size on the API keys settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The secret is shown once in a panel that can be copied.
- Keyboard: Create and revoke are buttons.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-03`, `AUTH-04`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## API-02 GraphQL

- **ID:** API-02
- **Name:** GraphQL
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/api/teams/[teamId]/graphql/route.ts`
- `lib/graphql/schema.ts`

### Expected behavior

POST /api/teams/{id}/graphql runs the schema in lib/graphql/schema.ts. Queries: issue, issues, projects, cycles, labels, members, workflowStatuses, initiatives, releases, views, documents, customers, projectDependencies. Mutations include createIssue, updateIssue, addComment, createInitiative, updateInitiative, createRelease, setIssueRelease, setCustomerValue, addProjectDependency, removeProjectDependency, createProject, createCycle, createLabel, archiveIssue, and restoreIssue. Several reads require MEMBER. Depth and size are limited. Automations and the audit log are not in this schema. Auth is the API key or session the route uses, and guest scope applies.

### Acceptance criteria

- [ ] A member key can query issues.
- [ ] A guest key is refused on a member-only field.
- [ ] A too-deep query is rejected.
- [ ] A bad query is a GraphQL error, not a 500 stack.
- [ ] Another team’s id is refused.

### Test cases

#### Normal use
- Query issues and compare one row to the REST issue.
#### Empty, missing, whitespace-only, and very long input
- POST an empty body and a query of {}.
#### Wrong types, special characters, emoji, and non-English text
- Query an issue whose title contains emoji.
#### SQL injection, XSS, and path traversal
- Send a query with a script tag in a string value and an introspection bomb. The string is data. The depth limit rejects the bomb.
#### Logged out, expired session, wrong role, and another user's data
- No key is 401. A guest key on projectDependencies is forbidden. Team B’s key does not read team A.
#### Double-submit and parallel requests
- Send two mutations in parallel. Both apply or one conflicts on revision.
#### External service failing, timing out, and rate limiting
- A down database returns an error in the GraphQL body or a 503, not a 200 with partial secret data.
#### New user with no data, and a user with lots of data
- A new team returns empty lists. A large team is paginated by the issue connection.
#### Refresh mid-action, back button, and two tabs
- Repeat the same query. Results match unless the data changed.

### UI checks

- Alignment, spacing, and control size on no page; the in-app API page may describe it.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`INT-14`, `ISSUE-01`

### Suspected bugs

- None found in the type definitions. Confirm the depth limit constant when testing.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## API-03 MCP server

- **ID:** API-03
- **Name:** MCP server
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/api/mcp/route.ts`
- `lib/mcp/server.ts`

### Expected behavior

POST /api/mcp is the MCP server. It requires a bearer API key. Tools cover issues (list, get, create, update, archive, restore, bulk, comments, relations, sub-issues, search, similar), planning (cycles, members, projects, labels, statuses, initiatives, releases, documents, customers, views, dependencies), AI summarize and triage, automations and audit for admin keys, and agent claim, heartbeat, result, and release. GUEST keys are read-only. Resources are verk://backlog and verk://cycles. The route is rate-limited. A prompt that asks the smaller agent to open a pull request is a different route (API-04).

### Acceptance criteria

- [ ] A member key lists issues.
- [ ] A guest key cannot create.
- [ ] An admin key can list the audit log.
- [ ] A bad key is rejected.
- [ ] Unknown tool names return an MCP error.

### Test cases

#### Normal use
- Call list_issues and get_issue with a member key.
#### Empty, missing, whitespace-only, and very long input
- Call create_issue with an empty title.
#### Wrong types, special characters, emoji, and non-English text
- Call create_issue with an emoji title.
#### SQL injection, XSS, and path traversal
- Call create_issue with a script-tag title and a filter of ' OR 1=1. The title is data. The filter is parsed or rejected.
#### Logged out, expired session, wrong role, and another user's data
- No key is 401. A guest key on create_issue fails. A key for team A does not accept team B’s id.
#### Double-submit and parallel requests
- Two creates with the same clientMutationId return one issue.
#### External service failing, timing out, and rate limiting
- A down database returns an MCP error. The 21st call in a minute from one IP is 429.
#### New user with no data, and a user with lots of data
- A new team returns an empty list. take is capped at 100.
#### Refresh mid-action, back button, and two tabs
- Repeat get_issue. The revision matches the page.

### UI checks

- Alignment, spacing, and control size on no page; configured in the MCP client.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`INT-14`, `ISSUE-01`

### Suspected bugs

- None found. The tool count in lib/mcp/server.ts is 47 registerTool calls.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## API-04 Issue prompt agent

- **ID:** API-04
- **Name:** Issue prompt agent
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/api/agent/route.ts`
- `lib/agent-json.ts`
- `lib/ai.ts`

### Expected behavior

POST /api/agent needs a bearer key and AI_API_KEY. The body is teamId and prompt. The model must reply with JSON describing create or update. GUEST keys are refused. Prompts that ask to open or merge a pull request are refused. Bad input is 400. An unusable model reply is 502. A model that takes longer than 15 seconds is 504. Without AI_API_KEY the route is off. The key’s role caps the write.

### Acceptance criteria

- [ ] A create prompt files one issue.
- [ ] A guest key is 403.
- [ ] A pull-request prompt is refused and files nothing.
- [ ] A slow model is 504.
- [ ] A bad JSON reply is 502 and does not half-write.

### Test cases

#### Normal use
- Send a prompt to create an issue titled by the prompt.
#### Empty, missing, whitespace-only, and very long input
- Send an empty prompt and a missing teamId.
#### Wrong types, special characters, emoji, and non-English text
- Send a prompt in another language.
#### SQL injection, XSS, and path traversal
- Send a prompt of <script> and one that says to merge a pull request. The script is data. The merge prompt is refused.
#### Logged out, expired session, wrong role, and another user's data
- No key is 401. A key for another team is refused.
#### Double-submit and parallel requests
- Send the same prompt twice. Two issues unless the client sends an idempotency key. Record which.
#### External service failing, timing out, and rate limiting
- Point the model at a closed port and expect 502 or 504. The 15-second cap is the timeout.
#### New user with no data, and a user with lots of data
- A new team gets issue 1. A busy team gets the next number.
#### Refresh mid-action, back button, and two tabs
- Refresh is a new POST. Two tabs can both create.

### UI checks

- Alignment, spacing, and control size on no page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`INT-14`, `DEVOPS-01`, `ISSUE-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## API-05 Coding-agent claims and next issue

- **ID:** API-05
- **Name:** Coding-agent claims and next issue
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/settings/agents/page.tsx`
- `lib/services/agent-claims.ts`
- `lib/actions/agents.ts`
- `app/api/teams/[teamId]/agent/claims/route.ts`
- `app/api/teams/[teamId]/agent/next/route.ts`

### Expected behavior

A member or agent takes a 30-minute lease, up to 4 hours, on an issue. The agent becomes the assignee and the issue moves to In progress when it was backlog or todo. Heartbeats extend the lease. Two agents cannot hold one issue. An agent holds at most 5. A quiet agent loses the lease. A finished claim posts the note as a comment. A failed or released claim returns the issue to Todo and clears the assignee. Admins can take an issue back, and that is audited. GET /api/teams/{id}/agent/next returns the next unblocked issue. Settings → Agents is admin-only.

### Acceptance criteria

- [ ] Claim moves the issue to In progress and sets the assignee.
- [ ] A second claim of the same issue fails.
- [ ] The sixth claim fails.
- [ ] Release returns it to Todo.
- [ ] A non-admin cannot open the settings page successfully for admin actions.

### Test cases

#### Normal use
- Claim an issue, heartbeat, and report done.
#### Empty, missing, whitespace-only, and very long input
- Claim with an empty issue id.
#### Wrong types, special characters, emoji, and non-English text
- Report a note with emoji.
#### SQL injection, XSS, and path traversal
- Report a note of <script>. The comment is text.
#### Logged out, expired session, wrong role, and another user's data
- A guest key cannot claim. Two keys claiming one issue: one wins.
#### Double-submit and parallel requests
- Two parallel claims: one 200 and one conflict.
#### External service failing, timing out, and rate limiting
- If the process dies, the lease expires and the issue is free. There is no separate queue service.
#### New user with no data, and a user with lots of data
- A team with no eligible issues returns an empty next. A team with a blocked issue skips it.
#### Refresh mid-action, back button, and two tabs
- Release in one tab. The other sees Todo after refresh.

### UI checks

- Alignment, spacing, and control size on the agents settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Admin actions are buttons.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-02`, `INT-14`, `TEAM-03`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## API-06 Agent discovery document

- **ID:** API-06
- **Name:** Agent discovery document
- **Priority:** P2
- **Status:** PASSED

### Files

- `app/.well-known/verk-agent.json/route.ts`
- `lib/agent-json.ts`

### Expected behavior

The well-known JSON describes the agent endpoints so a coding agent can find next, claim, and MCP without a human pasting every URL. It is public metadata and contains no secrets and no team data.

### Acceptance criteria

- [ ] GET returns JSON.
- [ ] The URLs match the real routes.
- [ ] The body has no AUTH_SECRET.
- [ ] It does not require a session.

### Test cases

#### Normal use
- GET the document and compare the paths to the routes.
#### Empty, missing, whitespace-only, and very long input
- GET with an empty query.
#### Wrong types, special characters, emoji, and non-English text
- There is no user text.
#### SQL injection, XSS, and path traversal
- A path of ../verk-agent.json does not read a file outside the route.
#### Logged out, expired session, wrong role, and another user's data
- The document is the same signed in and signed out.
#### Double-submit and parallel requests
- Two requests match.
#### External service failing, timing out, and rate limiting
- It does not call a third party.
#### New user with no data, and a user with lots of data
- It is the same on an empty database and a full one.
#### Refresh mid-action, back button, and two tabs
- Refresh returns the same shape.

### UI checks

- Alignment, spacing, and control size on a JSON document.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`API-05`, `API-03`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## API-07 VS Code extension

- **ID:** API-07
- **Name:** VS Code extension
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `extensions/vscode/extension.js`
- `extensions/vscode/package.json`

### Expected behavior

The extension asks for a Verk URL, a team id, and an API key, and stores them in VS Code settings. Create issue asks for a title and POSTs to /api/teams/{id}/issues with the key, then opens the issue URL. A missing setting sends the user through sign-in. A non-2xx shows the status. It does not implement the rest of the product.

### Acceptance criteria

- [ ] Sign in stores the three settings.
- [ ] Create opens the new issue.
- [ ] A wrong key shows the status and does not open a URL.
- [ ] The key is stored as a password input, not echoed in the prompt.
- [ ] An empty title does not POST.

### Test cases

#### Normal use
- Create an issue from the command and see it in the browser.
#### Empty, missing, whitespace-only, and very long input
- Dismiss the title prompt. Nothing is created.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji title.
#### SQL injection, XSS, and path traversal
- Use a title of <script>. It is the issue title.
#### Logged out, expired session, wrong role, and another user's data
- A guest key gets the API’s 403 and an error message.
#### Double-submit and parallel requests
- Run the command twice. Two issues if two titles were entered.
#### External service failing, timing out, and rate limiting
- A refused connection shows an error.
#### New user with no data, and a user with lots of data
- The first issue and a later one both open.
#### Refresh mid-action, back button, and two tabs
- Reload VS Code. The settings remain. The key is not printed in the information message.

### UI checks

- Alignment, spacing, and control size on VS Code input boxes.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- The prompts are VS Code dialogs.
- Keyboard: The commands are in the command palette.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`INT-14`, `ISSUE-01`

### Suspected bugs

- extensions/vscode/extension.js stores the API key in VS Code configuration (update apiKey). That is local, but it is not the OS keychain. Record it as a risk.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## SET-01 Workflow statuses

- **ID:** SET-01
- **Name:** Workflow statuses
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/settings/workflow/page.tsx`
- `components/workflow-editor.tsx`
- `components/workflow-settings-forms.tsx`
- `lib/actions/workflow.ts`
- `lib/services/workflow.ts`
- `app/api/teams/[teamId]/statuses/route.ts`
- `app/api/teams/[teamId]/statuses/[statusId]/route.ts`

### Expected behavior

Admins manage workflow statuses. A new status has a type (backlog, unstarted, started, completed, cancelled) which sets the coarse issue status. Statuses can be recolored, renamed, and reordered within a type. Deleting one moves its issues to another status of the same type. Every issue has a workflow status. The board columns come from this list. Members cannot edit. The API and MCP can list and create.

### Acceptance criteria

- [ ] Add a status and see it as a board column.
- [ ] Rename persists.
- [ ] Delete moves the issues.
- [ ] A member cannot edit.
- [ ] The last status of a type cannot be deleted if issues would have nowhere to go. Confirm the guard.

### Test cases

#### Normal use
- Add In review, move an issue onto it, and see the board column.
#### Empty, missing, whitespace-only, and very long input
- Save an empty name.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji name and a color.
#### SQL injection, XSS, and path traversal
- Use a name of <script>. It is text on the board.
#### Logged out, expired session, wrong role, and another user's data
- A member’s POST is refused. A signed-out call is refused.
#### Double-submit and parallel requests
- Double-click Add. One status.
#### External service failing, timing out, and rate limiting
- A failed delete leaves the issues on the old status.
#### New user with no data, and a user with lots of data
- A new team has the five defaults. A team with many statuses scrolls.
#### Refresh mid-action, back button, and two tabs
- Reorder in two tabs. Refresh shows one order.

### UI checks

- Alignment, spacing, and control size on the workflow settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- Delete asks which status receives the issues. That picker is part of the form.
- Keyboard: Rows are keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-04`, `TEAM-03`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## SET-02 Automations

- **ID:** SET-02
- **Name:** Automations
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/settings/automations/page.tsx`
- `components/automations-settings.tsx`
- `lib/automations.ts`
- `lib/services/automations.ts`
- `lib/actions/automations.ts`
- `app/api/teams/[teamId]/automations/route.ts`
- `app/api/teams/[teamId]/automations/[automationId]/route.ts`

### Expected behavior

Admins create rules: when an issue is created, changes status, is assigned, changes priority, or gets a label, and it matches conditions, do up to five actions (set status, priority, assignee, cycle, project, add or remove a label, comment, or notify). Conditions use the same filter engine as views. Actions write the issue directly and do not trigger another rule. A failing rule is skipped and logged. The cap is 50 rules. Create, toggle, and delete are audited. Members cannot edit. MCP can list them for an admin key.

### Acceptance criteria

- [ ] A matching create sets the field.
- [ ] A second rule does not fire from the first rule’s write.
- [ ] The 51st rule is refused.
- [ ] A bad action is skipped and the issue save still succeeds.
- [ ] A member cannot create a rule.

### Test cases

#### Normal use
- Create a rule that sets priority High on bugs, create a matching issue, and see the priority.
#### Empty, missing, whitespace-only, and very long input
- Save a rule with no action.
#### Wrong types, special characters, emoji, and non-English text
- Use an emoji in the comment action.
#### SQL injection, XSS, and path traversal
- Use a comment of <script>. The comment is text.
#### Logged out, expired session, wrong role, and another user's data
- A member cannot POST. A guest key cannot list them if the tool requires admin.
#### Double-submit and parallel requests
- Double-click Create. One rule. Two issues create in parallel and both get the action.
#### External service failing, timing out, and rate limiting
- A thrown action is logged and the create still returns the issue.
#### New user with no data, and a user with lots of data
- No rules shows the empty state. Fifty rules is the cap.
#### Refresh mid-action, back button, and two tabs
- Disable in one tab. The next issue in the other tab does not get the action.

### UI checks

- Alignment, spacing, and control size on the automations settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The builder is keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-01`, `TEAM-03`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## SET-03 Audit log, export, and retention

- **ID:** SET-03
- **Name:** Audit log, export, and retention
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/settings/audit/page.tsx`
- `lib/services/audit.ts`
- `lib/audit.ts`
- `lib/actions/retention.ts`
- `app/api/teams/[teamId]/audit/route.ts`
- `app/api/teams/[teamId]/audit/export/route.ts`

### Expected behavior

Admins can read the audit log: role changes, removals, invites, API keys, webhooks, team settings, and exports. Entries keep the person’s name as it was and store a key prefix, not a secret. Filter by action and date and page backward. Retention is 30 days to 2 years, or forever (0). The default is 365. The daily cron deletes older rows. Admins can download CSV. Members cannot read the log. Writing the log never blocks the action that caused it.

### Acceptance criteria

- [ ] A role change appears in the log.
- [ ] A key secret does not.
- [ ] A member gets 403.
- [ ] Shortening retention and running the prune removes old rows.
- [ ] CSV download matches the screen.

### Test cases

#### Normal use
- Change a role and find the row.
#### Empty, missing, whitespace-only, and very long input
- Filter with an empty action. The full page shows.
#### Wrong types, special characters, emoji, and non-English text
- Actor names with emoji render as text.
#### SQL injection, XSS, and path traversal
- Filter with a script tag. No row executes HTML.
#### Logged out, expired session, wrong role, and another user's data
- A member cannot open the page or the API. Another team’s id is refused.
#### Double-submit and parallel requests
- Two audited actions both appear.
#### External service failing, timing out, and rate limiting
- If the audit insert fails, the underlying action still commits. Confirm that.
#### New user with no data, and a user with lots of data
- A new team has an empty log. A long log pages.
#### Refresh mid-action, back button, and two tabs
- Refresh keeps the filter. Two tabs see the new row.

### UI checks

- Alignment, spacing, and control size on the audit settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Filters and paging are links or a form.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-03`, `JOB-01`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## SET-04 Appearance

- **ID:** SET-04
- **Name:** Appearance
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/t/[teamSlug]/settings/appearance/page.tsx`
- `components/appearance-settings.tsx`
- `components/theme-switch.tsx`
- `lib/appearance.ts`
- `app/layout.tsx`

### Expected behavior

Settings → Appearance, and the same controls on the account page, set light, dark, or system theme, one of seven accents, comfortable or compact density, and a higher-contrast option. They are personal and stored in the browser, applied by an inline script before first paint. The command palette can switch theme. They are not stored on the user row.

### Acceptance criteria

- [ ] Dark theme restyles the shell without a flash on reload.
- [ ] Accent and density persist in the browser.
- [ ] Another browser profile does not inherit them.
- [ ] System theme follows the OS.
- [ ] The contrast option changes borders and text, not only a class name.

### Test cases

#### Normal use
- Switch to dark, reload, and confirm there is no light flash.
#### Empty, missing, whitespace-only, and very long input
- There is no text field. Each control has a default.
#### Wrong types, special characters, emoji, and non-English text
- Locale labels change with SET-05. The stored values stay the English tokens.
#### SQL injection, XSS, and path traversal
- The script in app/layout.tsx is static. It does not read a query parameter into the DOM.
#### Logged out, expired session, wrong role, and another user's data
- The setting is local to the browser. User A and user B on one browser share it because it is not per account. Record that.
#### Double-submit and parallel requests
- Click dark twice. One class.
#### External service failing, timing out, and rate limiting
- If localStorage throws, the default light theme from the root layout still renders.
#### New user with no data, and a user with lots of data
- A new browser is light. A configured browser keeps the choice.
#### Refresh mid-action, back button, and two tabs
- Two tabs: changing one updates the other if they listen for storage, or on reload. Record which.

### UI checks

- Alignment, spacing, and control size on the appearance settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The theme choices are radio buttons or a listbox, and the palette can switch theme.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-11`

### Suspected bugs

- app/error.tsx and app/~offline/page.tsx hardcode a light gradient, so those two screens ignore this setting. The inline script itself is in app/layout.tsx.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## SET-05 Locales

- **ID:** SET-05
- **Name:** Locales
- **Priority:** P1
- **Status:** PASSED

### Files

- `lib/i18n.ts`
- `lib/server-locale.ts`
- `components/locale-provider.tsx`

### Expected behavior

The locale is a cookie, or Accept-Language on the first visit. The html lang attribute follows it. Shared vocabulary, the settings nav, and the list controls are translated. Long-form screens stay English. Unknown cookies fall back. The four locales are en, de, fr, and es.

### Acceptance criteria

- [ ] Choosing Deutsch translates the sidebar and settings nav.
- [ ] The issue description stays as written.
- [ ] A bad cookie falls back.
- [ ] The html element’s lang matches.

### Test cases

#### Normal use
- Set the locale to German and read the sidebar.
#### Empty, missing, whitespace-only, and very long input
- Set an empty cookie. Expect the Accept-Language match or English.
#### Wrong types, special characters, emoji, and non-English text
- Issue titles in another language are not translated by the catalog. They stay as authored.
#### SQL injection, XSS, and path traversal
- Set the cookie to <script>. It is ignored.
#### Logged out, expired session, wrong role, and another user's data
- The cookie is per browser, not a way to change another user’s account.
#### Double-submit and parallel requests
- Two tabs can set two cookies; the last write wins.
#### External service failing, timing out, and rate limiting
- There is no external translation service.
#### New user with no data, and a user with lots of data
- A new browser with fr Accept-Language starts in French if no cookie is set.
#### Refresh mid-action, back button, and two tabs
- Refresh keeps the cookie. Back does not reset it.

### UI checks

- Alignment, spacing, and control size on the appearance locale control and the sidebar.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The locale select is keyboard operable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`SET-04`

### Suspected bugs

- Long-form pages are English by design (README and lib/i18n.ts coverage). That is a limitation, not a missing key crash.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## SET-06 In-app API reference

- **ID:** SET-06
- **Name:** In-app API reference
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/settings/api/page.tsx`

### Expected behavior

The API page in the team explains how to create a key and call the API. It is documentation inside the app, separate from the marketing docs. It does not itself mint a key. A guest may be unable to reach settings; the page must not display someone else’s key.

### Acceptance criteria

- [ ] The page loads for a member and names the bearer scheme.
- [ ] It does not echo an existing key secret.
- [ ] Links to settings API keys work.
- [ ] A signed-out user is redirected.

### Test cases

#### Normal use
- Open the page and follow the link to API keys.
#### Empty, missing, whitespace-only, and very long input
- There is no form if the page is prose. Confirm.
#### Wrong types, special characters, emoji, and non-English text
- Code samples render as text.
#### SQL injection, XSS, and path traversal
- A query of <script> is not reflected.
#### Logged out, expired session, wrong role, and another user's data
- A guest or signed-out user cannot see another team’s page.
#### Double-submit and parallel requests
- Reload twice. The page is static.
#### External service failing, timing out, and rate limiting
- It does not call a third party.
#### New user with no data, and a user with lots of data
- A team with no keys and a team with keys see the same instructions.
#### Refresh mid-action, back button, and two tabs
- Refresh stays on the page.

### UI checks

- Alignment, spacing, and control size on the API settings page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The page is readable with headings and links.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`INT-14`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## SEC-02 Shared rate limiter

- **ID:** SEC-02
- **Name:** Shared rate limiter
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `lib/rate-limit.ts`
- `prisma/schema.prisma`

### Expected behavior

rateLimitShared upserts a RateLimitBucket row so every serverless instance shares the count. Auth uses 30 per minute. MCP, SCIM, SAML, Linear import, the GitHub webhook, Slack, the issue agent, and demo reset use 20 per minute per IP where those routes call it. The  limit’s next request is 429 or the route’s own throttle error. About 1 in 50 calls deletes expired rows. If the database throws, the limiter uses the in-memory map and allows the request rather than failing closed. The memory map is capped and prunes.

### Acceptance criteria

- [ ] The 21st MCP call from one IP in a minute is limited.
- [ ] A second IP is not.
- [ ] A database error does not take the route down.
- [ ] Expired buckets stop counting.
- [ ] The key is not a user-supplied string without a prefix.

### Test cases

#### Normal use
- Burst one limited route past its cap.
#### Empty, missing, whitespace-only, and very long input
- Send empty bodies. They still count.
#### Wrong types, special characters, emoji, and non-English text
- A weird path still uses the IP key, not the path as SQL.
#### SQL injection, XSS, and path traversal
- Confirm the key is passed as a parameter in SHARED_BUCKET_SQL, not concatenated.
#### Logged out, expired session, wrong role, and another user's data
- The limiter is not a role. It applies to anonymous webhook callers and to members.
#### Double-submit and parallel requests
- Parallel requests do not undercount, because the upsert is one statement.
#### External service failing, timing out, and rate limiting
- Stop the database and confirm the route still answers until the memory cap.
#### New user with no data, and a user with lots of data
- A fresh IP starts at zero.
#### Refresh mid-action, back button, and two tabs
- Wait for the window and confirm the next call succeeds.

### UI checks

- Alignment, spacing, and control size on 429 responses and inline throttle errors.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DATA-02`, `AUTH-16`

### Suspected bugs

- lib/rate-limit.ts:71-72 fails open when Postgres errors. On several instances that multiplies the cap for the duration of the outage.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## OBS-01 Application error page

- **ID:** OBS-01
- **Name:** Application error page
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/error.tsx`
- `app/global-error.tsx`

### Expected behavior

Uncaught render errors in a segment show Something went wrong, the digest when present, Try again, and a link to /t. The handler logs the error to the console. Try again calls the segment reset. A failure in the root layout uses app/global-error.tsx, which renders its own html and body, shows Application Error, and offers Reload application. That page does not link to /t.

### Acceptance criteria

- [ ] A thrown render shows this page.
- [ ] Try again recovers when the error was transient.
- [ ] The digest is visible when Next provides one.
- [ ] The page does not show the stack to the visitor.

### Test cases

#### Normal use
- Force a render error in a test build and see the page.
#### Empty, missing, whitespace-only, and very long input
- There is no input.
#### Wrong types, special characters, emoji, and non-English text
- The copy is English.
#### SQL injection, XSS, and path traversal
- Confirm the message does not echo request query HTML.
#### Logged out, expired session, wrong role, and another user's data
- The page is what a signed-in user sees. It links to /t, which may then redirect to login.
#### Double-submit and parallel requests
- Click Try again twice. One reset.
#### External service failing, timing out, and rate limiting
- If the error persists, the page returns.
#### New user with no data, and a user with lots of data
- It looks the same for a small page and a heavy page.
#### Refresh mid-action, back button, and two tabs
- Refresh runs the route again. Back leaves the error page.

### UI checks

- Alignment, spacing, and control size on the error page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Try again is a button. Go to teams is a link.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`SEC-01`

### Suspected bugs

- app/error.tsx:24-26 paints a hardcoded light gradient, so dark theme still shows a light page.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## OBS-02 Not-found page

- **ID:** OBS-02
- **Name:** Not-found page
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/not-found.tsx`

### Expected behavior

Unknown URLs and notFound() from a missing team or a non-member render This page isn't here, with a link to the team index when signed in and to login when signed out, plus a home link. The title is Page Not Found. A missing team and a team the user does not belong to look the same.

### Acceptance criteria

- [ ] A nonsense URL shows this page.
- [ ] A signed-in non-member sees Go to your teams.
- [ ] A signed-out visitor sees Log in.
- [ ] The page does not name the private team.

### Test cases

#### Normal use
- Open /does-not-exist and a missing team slug while signed in.
#### Empty, missing, whitespace-only, and very long input
- Open /t/%20.
#### Wrong types, special characters, emoji, and non-English text
- Open a slug of emoji.
#### SQL injection, XSS, and path traversal
- Open /t/'%20OR%201=1 and /..%2F..%2Fetc/passwd. Both are this page or a safe 404, not a file.
#### Logged out, expired session, wrong role, and another user's data
- Signed out, the button says Log in. User A opening user B’s team sees this page, not the issues.
#### Double-submit and parallel requests
- Reload twice. The page is stable.
#### External service failing, timing out, and rate limiting
- It does not call a third party except the session check.
#### New user with no data, and a user with lots of data
- It is the same for a new user and a user with many teams, aside from the button target.
#### Refresh mid-action, back button, and two tabs
- Back returns to the previous real page.

### UI checks

- Alignment, spacing, and control size on the not-found page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Both links are keyboard reachable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-04`

### Suspected bugs

- None found. The signed-in versus signed-out branch is in app/not-found.tsx.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## OBS-03 Loading states

- **ID:** OBS-03
- **Name:** Loading states
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `app/t/[teamSlug]/loading.tsx`

### Expected behavior

The team segment has a loading.tsx so navigations between team pages show a placeholder instead of a frozen sidebar. It should match the shell width and not shift the layout when the page arrives.

### Acceptance criteria

- [ ] A slow navigation shows the loading UI.
- [ ] It does not flash a wrong team’s data.
- [ ] It disappears when the page resolves.
- [ ] It is visible in both themes.

### Test cases

#### Normal use
- Throttle the network and move from issues to projects.
#### Empty, missing, whitespace-only, and very long input
- There is no input.
#### Wrong types, special characters, emoji, and non-English text
- The placeholder does not depend on user text.
#### SQL injection, XSS, and path traversal
- It does not echo the slug as HTML.
#### Logged out, expired session, wrong role, and another user's data
- A signed-out user is redirected before or instead of a team skeleton. Confirm which.
#### Double-submit and parallel requests
- Click two links quickly. The final page matches the final URL.
#### External service failing, timing out, and rate limiting
- A failed load becomes the error page, not an infinite skeleton.
#### New user with no data, and a user with lots of data
- A light page and a heavy page both settle.
#### Refresh mid-action, back button, and two tabs
- Back during loading lands on the previous page.

### UI checks

- Alignment, spacing, and control size on the team loading placeholder.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Focus is not trapped in the placeholder.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-02`

### Suspected bugs

- None found.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## OBS-04 Empty states

- **ID:** OBS-04
- **Name:** Empty states
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `components/empty-state.tsx`

### Expected behavior

Lists with no rows use the empty state component or an equivalent heading and explanation: issues, archive, drafts, inbox, views, labels, templates, webhooks, cycles, projects, and docs. The empty state tells the user the next action. It is not shown when a filter excluded real rows without saying that the filter is active.

### Acceptance criteria

- [ ] A new team’s issue list explains how to create.
- [ ] A filter with no matches is different from a team with no issues.
- [ ] The empty state has a working action where one exists.
- [ ] It wraps on a narrow screen.

### Test cases

#### Normal use
- Open issues on a new team.
#### Empty, missing, whitespace-only, and very long input
- Open a filter that matches nothing and confirm the copy mentions the filter.
#### Wrong types, special characters, emoji, and non-English text
- The copy is translated where the page uses the catalog.
#### SQL injection, XSS, and path traversal
- Empty states do not render raw HTML from the database.
#### Logged out, expired session, wrong role, and another user's data
- A guest with no visible issues sees the empty state, not another project’s rows.
#### Double-submit and parallel requests
- Create the first row. The empty state goes away.
#### External service failing, timing out, and rate limiting
- A failed fetch is the error page, not the empty state.
#### New user with no data, and a user with lots of data
- A team that later gains rows no longer shows the empty state.
#### Refresh mid-action, back button, and two tabs
- Refresh on an empty list stays empty. Two tabs: creating in one fills the other on refresh.

### UI checks

- Alignment, spacing, and control size on empty lists across the product.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The primary action inside the empty state is a link or a button.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-03`

### Suspected bugs

- None found. Each list should be checked; a list that renders a blank div is a bug against this item.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## A11Y-01 Keyboard access and semantics

- **ID:** A11Y-01
- **Name:** Keyboard access and semantics
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `components/ui/select-field.tsx`
- `components/app-sidebar.tsx`
- `components/app/keyboard-shell.tsx`

### Expected behavior

Interactive controls are buttons or links, or React Aria components. The team switcher exposes listbox semantics. Settings nav has an accessible name. Dialogs (palette, peek, conflict, shortcut help) close on Escape and return focus. The product is not fully keyboard-equivalent where board drag is the only move; the list pickers are the keyboard path. Focus rings use the accent ring classes.

### Acceptance criteria

- [ ] Tab reaches every control on the issue list and the new-issue form.
- [ ] Escape closes the palette.
- [ ] A select can be used without a pointer.
- [ ] Focus is visible in light and dark.
- [ ] Icon-only buttons have names.

### Test cases

#### Normal use
- Tab from the sidebar through the issue list to the create form using only the keyboard.
#### Empty, missing, whitespace-only, and very long input
- There is no special empty case beyond disabled buttons, which must not be focus traps.
#### Wrong types, special characters, emoji, and non-English text
- Locale strings with accents stay inside their controls.
#### SQL injection, XSS, and path traversal
- Labels are not HTML from the user.
#### Logged out, expired session, wrong role, and another user's data
- A guest’s keyboard path does not reveal admin buttons.
#### Double-submit and parallel requests
- Holding Tab does not skip the main content.
#### External service failing, timing out, and rate limiting
- If a script fails, native buttons still work.
#### New user with no data, and a user with lots of data
- A short form and a long settings form both have a visible focus order.
#### Refresh mid-action, back button, and two tabs
- Open a dialog and refresh. Focus starts at the top of the new page, not in a detached node.

### UI checks

- Alignment, spacing, and control size on the team shell.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- Dialogs trap focus.
- Keyboard: The checks above are the test.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`ISSUE-24`, `ISSUE-04`

### Suspected bugs

- Board drag (ISSUE-04) needs the list status picker as the keyboard equivalent. Confirm that picker is present.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## RESP-01 Responsive layout

- **ID:** RESP-01
- **Name:** Responsive layout
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `components/app-sidebar.tsx`
- `app/t/[teamSlug]/layout.tsx`
- `app/layout.tsx`

### Expected behavior

The team shell is a row with a sidebar and a scrolling main pane, using the dynamic viewport height. At 360px the sidebar must collapse, scroll, or become a drawer so the issue list is usable. At 768, 1024, and 1440 the main pane uses the remaining width. Marketing pages stack. Text does not overflow the viewport. Horizontal scroll is limited to tables and the timeline.

### Acceptance criteria

- [ ] At 360 the primary action is reachable.
- [ ] At 1440 the sidebar and the list sit side by side.
- [ ] The settings nav wraps.
- [ ] The board scrolls inside the page.
- [ ] No control is clipped by the viewport.

### Test cases

#### Normal use
- Resize from 1440 to 360 on the issues page and create an issue.
#### Empty, missing, whitespace-only, and very long input
- A long team name truncates in the switcher at 360.
#### Wrong types, special characters, emoji, and non-English text
- A German settings label wraps instead of overflowing.
#### SQL injection, XSS, and path traversal
- User content does not force a page-wide scrollbar by injecting a wide word. A long unbroken token should wrap or scroll inside its cell.
#### Logged out, expired session, wrong role, and another user's data
- The same layout rules apply to a guest.
#### Double-submit and parallel requests
- Rotate a phone-sized window twice. The height uses dvh so the bar is not hidden.
#### External service failing, timing out, and rate limiting
- Font load does not shift the header after first paint more than the appearance script already avoids.
#### New user with no data, and a user with lots of data
- An empty list and a long list both fit.
#### Refresh mid-action, back button, and two tabs
- Refresh at 360 stays usable.

### UI checks

- Alignment, spacing, and control size on the team shell and marketing pages.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- Popovers must stay on screen at 360.
- Keyboard: Browser zoom to 200% still reaches the create control.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-02`, `ISSUE-03`

### Suspected bugs

- None found in the shell. The board and the timeline are the likely overflow points to watch.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## SEO-01 Marketing site, robots, and sitemap

- **ID:** SEO-01
- **Name:** Marketing site, robots, and sitemap
- **Priority:** P2
- **Status:** PASSED

### Files

- `app/(marketing)/page.tsx`
- `app/(marketing)/docs/page.tsx`
- `app/(marketing)/about/page.tsx`
- `app/(marketing)/layout.tsx`
- `app/robots.ts`
- `app/sitemap.ts`
- `config/site.ts`

### Expected behavior

The marketing home, docs, and about pages are public. The root layout sets the title template, description, manifest, and icons. robots.ts allows /, /login, /onboarding, and /docs, and disallows /api/, /t/, /w/, and /~offline. The sitemap lists the base URL, /docs, /login, and /onboarding. The base is AUTH_URL or the demo host.

### Acceptance criteria

- [ ] The home page has a title and description.
- [ ] robots.txt disallows /t/.
- [ ] The sitemap URL uses AUTH_URL.
- [ ] Team pages are not listed.

### Test cases

#### Normal use
- Open /, /docs, and /about signed out.
#### Empty, missing, whitespace-only, and very long input
- Fetch /robots.txt and /sitemap.xml.
#### Wrong types, special characters, emoji, and non-English text
- Titles are English.
#### SQL injection, XSS, and path traversal
- A query on the home page is not reflected into the title.
#### Logged out, expired session, wrong role, and another user's data
- Signed-out visitors can read the marketing pages. Team pages still redirect.
#### Double-submit and parallel requests
- Reload. The sitemap lastModified is the request time, so it changes. That is what the code does.
#### External service failing, timing out, and rate limiting
- There is no third-party call required to render the home page besides optional Clarity.
#### New user with no data, and a user with lots of data
- The pages are static enough to render with an empty database.
#### Refresh mid-action, back button, and two tabs
- Back from docs returns home.

### UI checks

- Alignment, spacing, and control size on the marketing pages.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Links in the marketing nav are keyboard reachable.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DEVOPS-01`

### Suspected bugs

- app/sitemap.ts:6-31 omits /register, /privacy, /terms, and /about even though those pages are public. app/robots.ts allows /onboarding, which immediately requires a session.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## LEGAL-01 Privacy policy and terms

- **ID:** LEGAL-01
- **Name:** Privacy policy and terms
- **Priority:** P1
- **Status:** PASSED

### Files

- `app/(marketing)/privacy/page.tsx`
- `app/(marketing)/terms/page.tsx`

### Expected behavior

Privacy and terms are public pages with their own titles. The privacy page states that Verk has no built-in billing and no advertising network. They are linked from the marketing site. They do not require a session.

### Acceptance criteria

- [ ] Both pages render signed out.
- [ ] Each has a heading.
- [ ] The privacy page does not claim a payment processor exists.
- [ ] They are readable on a phone.

### Test cases

#### Normal use
- Open /privacy and /terms.
#### Empty, missing, whitespace-only, and very long input
- There is no form.
#### Wrong types, special characters, emoji, and non-English text
- The copy is English.
#### SQL injection, XSS, and path traversal
- The pages do not reflect a query into HTML.
#### Logged out, expired session, wrong role, and another user's data
- They are public.
#### Double-submit and parallel requests
- Reload twice.
#### External service failing, timing out, and rate limiting
- They do not call a third party.
#### New user with no data, and a user with lots of data
- They render the same for every visitor.
#### Refresh mid-action, back button, and two tabs
- Back returns to the previous page.

### UI checks

- Alignment, spacing, and control size on the privacy and terms pages.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Headings are in order.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`SEO-01`

### Suspected bugs

- None found. The no-billing sentence is in app/(marketing)/privacy/page.tsx.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## ANALYTICS-01 Microsoft Clarity

- **ID:** ANALYTICS-01
- **Name:** Microsoft Clarity
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `components/clarity-script.tsx`
- `components/clarity-identify.tsx`
- `lib/clarity.ts`

### Expected behavior

Clarity’s script is injected only when NEXT_PUBLIC_CLARITY_PROJECT_ID is set at build time. The identify call sends the user id, not the email, when the component is mounted in the team shell. Preview and private hosts are expected to leave the variable empty. The CSP allows clarity.ms. With the variable empty, no Clarity request is made.

### Acceptance criteria

- [ ] With the id unset, the document has no Clarity script.
- [ ] With the id set, the script src is clarity.ms.
- [ ] Identify does not send the password or the API key.
- [ ] A build without the variable cannot be turned on by a query string.

### Test cases

#### Normal use
- Load a build with the variable empty and confirm no request to clarity.ms.
#### Empty, missing, whitespace-only, and very long input
- There is no input.
#### Wrong types, special characters, emoji, and non-English text
- The user id is an opaque id.
#### SQL injection, XSS, and path traversal
- Confirm the script URL is not taken from the query string.
#### Logged out, expired session, wrong role, and another user's data
- A signed-out marketing page does not identify a user. A signed-in page identifies the session user only.
#### Double-submit and parallel requests
- Reload once. One script.
#### External service failing, timing out, and rate limiting
- If Clarity is blocked, the app still works.
#### New user with no data, and a user with lots of data
- It is the same for a new user and a busy team.
#### Refresh mid-action, back button, and two tabs
- Refresh does not duplicate identify into a second user.

### UI checks

- Alignment, spacing, and control size on no visible UI.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: The script does not change tab order.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`SEC-01`, `DEVOPS-01`

### Suspected bugs

- The project id is inlined at build time. A wrong id in a production build records real sessions. That is operational, not a code bug.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## LOG-01 Logging

- **ID:** LOG-01
- **Name:** Logging
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `lib/email.ts`
- `app/error.tsx`
- `lib/rate-limit.ts`

### Expected behavior

Invite mail logs a console info line when Resend is unset or when send fails, and that line includes the invite URL. The error page logs the error object. There is no separate log drain, request id, or structured logger. Audit history is SET-03, not this item. Secrets must not be logged. The invite URL is a bearer link, so writing it to logs is sensitive.

### Acceptance criteria

- [ ] A failed invite does not log the Resend API key.
- [ ] The error page logs on the server or the client as written.
- [ ] A successful request does not log the password.
- [ ] There is no log viewer in the product.

### Test cases

#### Normal use
- Trigger an invite with Resend unset and read the server log.
#### Empty, missing, whitespace-only, and very long input
- There is no input.
#### Wrong types, special characters, emoji, and non-English text
- A team name with emoji in the log line is fine.
#### SQL injection, XSS, and path traversal
- Confirm the log line does not include the password from a failed login.
#### Logged out, expired session, wrong role, and another user's data
- Logs are server-side. A member cannot read another team’s console.
#### Double-submit and parallel requests
- Two failed invites produce two lines.
#### External service failing, timing out, and rate limiting
- A thrown Resend error is caught and logged as info, and the action still returns the copy-link message.
#### New user with no data, and a user with lots of data
- A quiet server logs nothing on a normal page view.
#### Refresh mid-action, back button, and two tabs
- Refresh does not duplicate a client error log unless the error rethrows.

### UI checks

- Alignment, spacing, and control size on server logs.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`TEAM-06`, `OBS-01`

### Suspected bugs

- lib/email.ts logs the invite URL when mail is not sent. Anyone with log access can join the team until the invite expires.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## JOB-01 Daily maintenance cron

- **ID:** JOB-01
- **Name:** Daily maintenance cron
- **Priority:** P1
- **Status:** NOT STARTED

### Files

- `app/api/cron/cycles/route.ts`
- `vercel.json`

### Expected behavior

Vercel calls GET /api/cron/cycles daily at 06:00 UTC. If CRON_SECRET is unset the route returns 404. A wrong bearer is 401. A correct bearer advances due cycles, purges issues archived more than 30 days, snapshots running cycles, prunes the audit log by each team’s retention, prunes unused OAuth codes, retries due webhook deliveries, and prunes old delivery rows. The JSON body reports the counts. It does not run on a user click.

### Acceptance criteria

- [ ] No secret returns 404.
- [ ] A wrong bearer returns 401.
- [ ] A right bearer returns 200 and the count fields.
- [ ] An issue archived 31 days ago is deleted.
- [ ] An issue archived yesterday remains.

### Test cases

#### Normal use
- Call the route with the bearer on a disposable database.
#### Empty, missing, whitespace-only, and very long input
- Call it with an empty bearer.
#### Wrong types, special characters, emoji, and non-English text
- There is no user text.
#### SQL injection, XSS, and path traversal
- A bearer of <script> is 401. The SQL inside the job is not built from the query string.
#### Logged out, expired session, wrong role, and another user's data
- A signed-in browser without the bearer is 401. The route is not a team role.
#### Double-submit and parallel requests
- Two parallel calls must not double-advance a cycle. Record what the service does.
#### External service failing, timing out, and rate limiting
- A thrown step should not report success for the steps that did not run. Read the route: it awaits in sequence and will 500 on the first throw.
#### New user with no data, and a user with lots of data
- An empty database returns zeros. A busy database still finishes within the platform limit.
#### Refresh mid-action, back button, and two tabs
- Refresh with the bearer runs the job again. Steps should be idempotent.

### UI checks

- Alignment, spacing, and control size on no page; a JSON response.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`DEVOPS-01`, `ISSUE-08`, `SET-03`, `INT-10`, `PLAN-01`

### Suspected bugs

- The route has no per-step try/catch (app/api/cron/cycles/route.ts). The first thrown call aborts the later steps, including webhook retry and audit prune.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## JOB-02 Demo reset cron

- **ID:** JOB-02
- **Name:** Demo reset cron
- **Priority:** P2
- **Status:** NOT STARTED

### Files

- `app/api/cron/demo-reset/route.ts`
- `app/api/demo/reset/route.ts`
- `vercel.json`

### Expected behavior

The demo cron is scheduled at 12:00 UTC. It uses CRON_SECRET the same way as the cycles cron. POST /api/demo/reset requires DEMO_MODE and the x-demo-reset-secret header. It reseeds the shared demo data. On a private host with demo mode off, the reset does not run. The job is rate-limited with the other public routes.

### Acceptance criteria

- [ ] With demo mode off, the POST does not wipe a private team.
- [ ] With demo mode on and the right header, the demo team returns to seed data.
- [ ] A wrong header is refused.
- [ ] The cron 404s when CRON_SECRET is unset.
- [ ] A normal member cannot call it.

### Test cases

#### Normal use
- On a disposable demo database, call the reset and confirm the seed login works.
#### Empty, missing, whitespace-only, and very long input
- Call POST with an empty header.
#### Wrong types, special characters, emoji, and non-English text
- There is no user text.
#### SQL injection, XSS, and path traversal
- Send a script-tag secret. Refused.
#### Logged out, expired session, wrong role, and another user's data
- A signed-in owner without the header cannot reset.
#### Double-submit and parallel requests
- Two resets in parallel end on the seed data, not a half-wiped team.
#### External service failing, timing out, and rate limiting
- A down database does not report success.
#### New user with no data, and a user with lots of data
- The demo team is small. The reset must not touch a second team if the code is scoped. Confirm.
#### Refresh mid-action, back button, and two tabs
- Refresh the POST. It is safe to repeat.

### UI checks

- Alignment, spacing, and control size on no page.
- Long text, emoji, and non-English strings do not overflow or overlap neighboring controls.
- Light theme and dark theme. Where this screen uses the app theme, contrast mode still leaves text readable.
- Widths 360, 768, 1024, and 1440. No clipped primary action. Horizontal scroll only inside a table, board, or timeline.
- Loading, empty, error, success, disabled, hover, and focus are each visible and not stuck.
- No modal.
- Keyboard: Not a keyboard UI.
- The browser console has no errors on load, on success, and on the expected failure.

### Dependencies

`AUTH-14`, `JOB-01`, `DEVOPS-01`

### Suspected bugs

- Confirm the reset is scoped to the demo team and cannot see a team that happens to share the database. If it wipes the whole database, that is a bug.

### Results

- Bugs Found:
- Bugs Fixed:
- UI Issues Fixed:
- Files Changed:
- Notes:

## Assumptions

- This document replaces any earlier status values in SHIP_REPORT.md. Those verdicts are not carried forward. Every item is NOT STARTED because this pass did not test, fix, or run the app.
- Optional integrations are features. They exist in the code and stay off until the matching environment variable is set. Off is a supported state, not a missing page.
- A guest with an empty guestProjectIds list can see the whole team. That matches the membership comment in the schema. A non-empty list is the restriction.
- Sessions are JWTs (`lib/auth.config.ts`). The Prisma Session model is present for the adapter. Credentials login does not depend on a Session row.
- `archived=true` is the issue-list archive flag. Export may accept a different flag. Both are called out on ISSUE-08 and INT-09 rather than treated as one control.
- The issue-counter transaction waits 10 seconds and runs up to 20 seconds (`lib/services/issues.ts:440`). That limit is a risk, not a suspected logic bug.
- INTAKE_TOKEN and the webhook secrets are application secrets. Possession of the secret is the authorization for the team id in the URL. That is recorded on PLAN-18 and the intake features.
- Appearance is stored in the browser, not on the user. Two people who share a browser profile share a theme.
- Long-form screens staying in English is intentional. The locale catalog covers shared chrome.
- No route was exercised. Suspected bugs are from reading the cited lines only.
- Status-change rules on the triage page are ISSUE-32. They are not the triage intake rules in ISSUE-29. Named Ask forms share `/ask/{token}` with the single Ask link and stay inside PLAN-17.

## Risks

- `allowDangerousEmailAccountLinking` is true for GitHub, Google, and OIDC (`lib/auth.ts:150`, `:160`, `:177`). A provider account that can claim an email can attach to an existing password user.
- HSTS with preload is sent on every response, including local HTTP (`next.config.mjs:36-39`).
- The content security policy allows inline scripts (`next.config.mjs`).
- The shared rate limiter fails open to per-process memory when Postgres errors (`lib/rate-limit.ts:71-72`), so a database blip on several instances multiplies the cap.
- Sign-in trusts the first `x-forwarded-for` address (`app/api/auth/password/route.ts`).
- Invite URLs are written to the server log when Resend is unset or send fails (`lib/email.ts`).
- The daily cron aborts later steps if an earlier step throws (`app/api/cron/cycles/route.ts`). Webhook retry and audit prune then wait another day.
- Vercel Hobby runs each cron once a day. Webhook retries between those runs depend on some other event from the same team.
- Neon can sleep. The first request after idle is slow, and health will show that latency.
- Demo mode is a shared writable database. The reset job must stay scoped to that data.
- The VS Code extension stores the API key in editor settings (`extensions/vscode/extension.js`).
- Two-factor setup puts the account email in the login query string (`app/api/auth/password/route.ts:54-55`).

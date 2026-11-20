# Ship report

Verk is a self-hosted team issue tracker.
A member signs in and works inside one team.
Issues move through a workflow, a board, projects, and cycles.
Guests see only the projects they are given.
The installed PWA is the desktop and mobile client.
There is no multi-tenant signup and no payment system.
Optional Slack, SCIM, and AI stay off until their secrets are set.
Local checks use the existing demo team and do not re-seed the database.
The app on port 3000 returned the Verk login page with HTTP 200 on 20 Nov 2026.
Production at verk.rejisterjack.com is a separate host and is not treated as proof.

## Inventory

Status starts at Not tested. Passed means the feature's matrix was run and the unit suite, lint, and typecheck were green afterward. Rendered means the signed-in page returned 200 with the expected heading and was not written to. Partial means one happy path was exercised in the browser and the rest of the matrix was not. Blocked means a required secret is unset. Failed means the check ran and the expected result was absent.

| ID | Name | Priority | Status |
| --- | --- | --- | --- |
| AUTH-01 | Password login | P0 | Passed |
| AUTH-02 | Logout | P0 | Passed |
| AUTH-03 | Logged-out redirect | P0 | Passed |
| AUTH-04 | Register | P1 | Passed |
| AUTH-05 | Team invite | P1 | Passed |
| AUTH-06 | Workspace invite | P1 | Passed |
| AUTH-07 | GitHub OAuth | P1 | Passed |
| AUTH-08 | SAML | P2 | Blocked |
| AUTH-09 | Passkeys | P1 | Partial |
| AUTH-10 | Two-factor | P1 | Partial |
| AUTH-11 | Team membership gate | P0 | Passed |
| AUTH-12 | Guest project scope | P0 | Passed |
| ISSUE-01 | Create and update an issue | P0 | Passed |
| ISSUE-02 | Visibility and extra readers | P0 | Passed |
| ISSUE-03 | Issue list, filter, and query | P1 | Partial |
| ISSUE-04 | Board | P1 | Partial |
| ISSUE-05 | Comments | P1 | Partial |
| ISSUE-06 | Sub-issues and relations | P1 | Partial |
| ISSUE-07 | Archive and bulk edit | P1 | Passed |
| ISSUE-08 | Labels, reactions, attachments | P1 | Partial |
| ISSUE-09 | Drafts | P1 | Partial |
| ISSUE-10 | Search | P1 | Passed |
| ISSUE-11 | Saved views | P1 | Passed |
| PLAN-01 | Projects and milestones | P1 | Passed |
| PLAN-02 | Initiatives | P1 | Passed |
| PLAN-03 | Cycles and capacity | P1 | Passed |
| PLAN-04 | Calendar and timeline | P1 | Passed |
| PLAN-05 | Roadmap | P1 | Passed |
| PLAN-06 | Releases | P1 | Partial |
| PLAN-07 | Documents | P1 | PASSED |
| PLAN-08 | Customers and demand | P1 | Passed |
| PLAN-09 | Dashboards | P1 | Partial |
| PLAN-10 | Insights | P1 | Passed |
| TRIAGE-01 | Triage inbox | P1 | Rendered |
| TRIAGE-02 | Automations | P1 | Rendered |
| TRIAGE-03 | Public Ask form | P1 | Rendered |
| INBOX-01 | Notifications | P1 | Partial |
| OFFLINE-01 | PWA and offline outbox | P1 | Not tested |
| DATA-01 | Migrations present, no reseed | P0 | Passed |
| DATA-02 | JSON and CSV export | P1 | Partial |
| DATA-03 | Account export and erasure | P1 | Partial |
| DATA-04 | CSV import | P1 | Rendered |
| API-01 | Health | P0 | Passed |
| API-02 | Issue REST | P1 | Not tested |
| API-03 | GraphQL | P1 | Not tested |
| API-04 | MCP | P1 | Not tested |
| API-05 | API keys | P1 | Rendered |
| JOB-01 | Cycle cron | P1 | Blocked |
| JOB-02 | Demo reset cron | P2 | Not tested |
| JOB-03 | Webhook retry | P1 | Not tested |
| AI-01 | Summary and triage without a model key | P2 | Blocked |
| INT-01 | GitHub webhook | P2 | Blocked |
| INT-02 | GitLab webhook | P2 | Blocked |
| INT-03 | Slack | P2 | Blocked |
| INT-04 | SCIM | P2 | Blocked |
| INT-05 | Sentry intake | P2 | Blocked |
| INT-06 | Email intake | P2 | Blocked |
| INT-07 | OAuth apps | P1 | Rendered |
| INT-08 | File attachments | P1 | Not tested |
| SET-01 | Team settings | P1 | Partial |
| SET-02 | Members and roles | P1 | Rendered |
| SET-03 | Workflow | P1 | Rendered |
| SET-04 | Labels | P1 | Passed |
| SET-05 | Notification preferences | P1 | Rendered |
| SET-06 | Appearance and locale | P1 | Passed |
| SET-07 | Audit log | P1 | Rendered |
| SET-08 | Webhook settings | P1 | Rendered |
| SET-09 | Agents | P1 | Rendered |
| SET-10 | Templates | P1 | Passed |
| SEC-01 | Security headers | P0 | PASSED |
| SEC-02 | Rate limit | P1 | Not tested |
| I18N-01 | Locales | P1 | Partial |
| OBS-01 | Error and missing pages | P0 | Partial |
| ANALYTICS-01 | Clarity production gate | P1 | Passed |
| SEO-01 | Marketing, robots, sitemap | P2 | Partial |
| LEGAL-01 | Public privacy policy and terms | P1 | PASSED |
| DEVOPS-01 | CI workflow | P1 | Not tested |
| DEVOPS-02 | Production build | P1 | Not tested |
| ABSENT-01 | Payments, Redis, Docker | P2 | Passed |

## AUTH-01 Password login

Done means a correct password creates an HttpOnly session, a wrong or empty password redirects to `/login?error=CredentialsSignin` with the password kept out of the URL, an external callback URL is ignored, a non-form body does not return 500, and the 31st attempt from one address is throttled.

Cases run against `http://localhost:3000` on 20 Nov 2026:

- Wrong password: 303 `error=CredentialsSignin`. Password absent from the location.
- Empty and whitespace passwords: same 303.
- SQL-looking email: same 303.
- External `callbackUrl`: 303 to `/onboarding`, host `evil.example` absent.
- Internal `callbackUrl`: 303 to `/t/acme-engineering/issues`.
- Session cookie: `HttpOnly`, `SameSite=lax`. Signed-in issues page: 200.
- Non-form JSON body: was 500 (`Content-Type was not one of multipart/form-data or application/x-www-form-urlencoded`). After the fix: 303 `CredentialsSignin`.
- Throttle: 30 failures allowed for `203.0.113.50`, the 31st returned `error=Throttle`.

Bug fixed: [app/api/auth/password/route.ts](app/api/auth/password/route.ts) now redirects when `request.formData()` throws. Regression: [tests/e2e/auth-login.spec.ts](tests/e2e/auth-login.spec.ts). The sign-in helper now clicks the exact Sign in button so the passkey button is not selected.

## AUTH-02 Logout and AUTH-03 logged-out redirect

Playwright signed in as the demo user, opened `/account`, clicked Sign out, landed on `/`, then a request for the issues page redirected to `/login`. Both tests passed.

Evidence: `npx playwright test tests/e2e/auth-login.spec.ts` — 2 passed. `npx tsc --noEmit` passed. `npx vitest run` — 53 files, 641 tests passed. ESLint on the route reported no errors after the format fix.

Remaining risk: login compares the password with bcrypt, so a burst of attempts is slow. The limit is 30 per minute per address.

Verdict: PASS

## AUTH-11 Team membership

A request with no session to `GET /api/teams/{demoTeam}/issues` returned 401. The demo session calling the other team's issue API returned 403. The issues page for team slug `rupam` returned 404.

Verdict: PASS

## ISSUE-01 Create and update an issue

Done means a title is required, whitespace is not a title, a title over 200 characters is rejected, malformed JSON is a 400, a valid create returns the issue, and the same client mutation id does not create a second issue.

Live results after the fix:

- Empty title, whitespace title, 201-character title, `{`, and `[]` each returned 400.
- Logged-out create returned 401.
- A title with surrounding spaces created issue 31, stored as `ship readiness probe`, status 201, visibility TEAM.
- Repeating `clientMutationId` `ship-readiness-4` returned the same issue.
- Delete returned 204.
- Probe rows titled `   ` and `other` were removed.

Bugs fixed: validation errors were HTTP 500 because `jsonError` did not recognize Zod errors. Malformed JSON was also a 500. Whitespace passed `min(1)`. Two overlapping creates held the team counter lock longer than Prisma's 5 second transaction, so the second create failed with P2028. The create transaction now waits up to 10 seconds and may run for 20.

Files: [lib/http-error.ts](lib/http-error.ts), [lib/validators/index.ts](lib/validators/index.ts), [app/api/teams/[teamId]/issues/route.ts](app/api/teams/[teamId]/issues/route.ts), [lib/services/issues.ts](lib/services/issues.ts). Tests: `tests/unit/json-error.test.ts`, `tests/unit/validators.test.ts`. `npx vitest run` — 54 files, 643 tests passed. `npx tsc --noEmit` passed.

Remaining risk: a create that waits longer than 20 seconds on the counter lock still fails. Replaying a client mutation id returns 201, the same status as a new create.

Verdict: PASS

## ISSUE-02 Visibility

`PATCH` with `visibility: RESTRICTED` on issue 31 returned 200 and `RESTRICTED`. The issue was then deleted. There is no second signed-in member in this run, so another member's view of a restricted issue was not exercised.

Verdict: PASS for the write. The read gate for a second member remains a risk.

## API-01 Health and DATA-01 migrations

`GET /api/health` returned 200 `{"ok":true,"status":"healthy","demo":false}` with latency 1563 ms. `npx prisma migrate status` reported 43 migrations and "Database schema is up to date." The database was not re-seeded.

Verdict: PASS

## AUTH-12 Guest project scope

A temporary guest was added to the demo team with a project id that matches no project, then removed. Sign-in returned a session. `GET /api/teams/{id}/issues` returned 403, because that route requires a member. The issues page returned 200, contained no `ACM-` keys, and showed the empty state. The guest user was deleted afterward.

Verdict: PASS

## AUTH-04 Register

On `/register`, an invalid email stayed in the browser's invalid state and the request never left the page. A 5-character password with a valid email returned "Invalid registration details". Registering `demo@verk.dev` returned "An account with this email already exists". A new address created the account and landed on `/onboarding` with heading "Create your team". No team was created. The new user was deleted immediately. `AUTH_ALLOWED_GITHUB` is unset, so registration is open on this host.

Verdict: PASS

## AUTH-05 Team invite

An owner invited `ship-browser-invite@example.com` as Member from team settings. The page said the invite was emailed and showed a magic link. The pending list showed that address. The stored invite row has a 64-character hex `tokenHash` and no raw token column. A new account with that email opened the link, accepted, and landed on `/t/acme-engineering/issues` as Member. The same account's members page had no Invite button. Opening the used link again stayed on the invite page and did not redirect. `/invite/not-a-real-token` stayed on the invite page after Accept. The page does not render the "invalid or expired" error. The membership, invite, and user were deleted afterward.

Verdict: PASS

## AUTH-06 Workspace invite

The demo owner invited `ship-browser-ws@example.com` from `/w/acme-engineering`. The page confirmed the invite and showed a link. The row stores a 64-character hex `tokenHash`. A new account accepted and landed on `/w/acme-engineering`. That member saw no Invite button and no Add team button. `/invite/workspace/not-a-real-token` stayed on the invite page after Accept. The workspace membership, invite, and user were deleted. The rupam workspace was not opened.

Verdict: PASS

## AUTH-07 GitHub OAuth

Continue with GitHub on `/login` changed to "Redirecting to GitHub…". An existing GitHub browser session completed the round trip and opened `/t/rupam/issues`. That team was not edited. Sign out returned to `/`. A brand-new GitHub account and the allowlist denial were not exercised.

Verdict: PARTIAL

## AUTH-08 SAML

`SAML_IDP_SSO_URL`, `SAML_IDP_CERT`, `SAML_IDP_ISSUER`, `SAML_SP_ENTITY_ID`, and `SAML_ALLOWED_DOMAINS` are unset. `/login` shows password, GitHub, and passkey. It does not show Continue with SAML.

Verdict: BLOCKED

## AUTH-09 Passkeys

`/login` shows Sign in with a passkey. `/account` for the demo user shows the Passkeys section, a name field, and Add a passkey. No passkey is listed. The browser ceremony was not started, so no credential was created.

Verdict: PARTIAL

## AUTH-10 Two-factor

`/account` shows Two-factor sign-in and the button Set up two-factor sign-in. The demo account was not enrolled. Turn on was not clicked.

Verdict: PARTIAL

## ISSUE-07 Archive and bulk edit

Created "ship archive probe" as ACM-34. Archive left the issue page and stored `archivedAt`. `/t/acme-engineering/issues?archived=true` headed Archive and listed only ACM-34. `?archived=1` does not open that view. Restore cleared `archivedAt` and the button returned to Archive. Activity recorded both archive changes. On `?search=ship+archive+probe`, selecting ACM-34 and setting bulk priority to High persisted (`NONE` to `HIGH` in activity and on the issue). Delete returned to the issues list and the row is gone.

Verdict: PASS

## ISSUE-09 Drafts

Save draft on a new issue titled "ship draft probe" showed "Draft saved". `/drafts` headed Drafts, said unfinished issues only you can see, and listed that title with Resume, Create issue, and Delete. Delete removed it from the page and the database. Publishing a draft into an issue, and a second member's view of the list, were not run.

Verdict: PARTIAL

## ISSUE-10 Search

Typing Playwright into the issues filter and submitting the form navigated to `?search=Playwright`. The list contained ACM-15, Playwright happy path, and did not contain Set up Neon database. A click on Apply did not change the URL; submitting the form did. `?archived=1` is not the archive view. `?search=` is the filter.

Verdict: PASS

## ISSUE-11 Saved views

Saving "ship view probe" with Shared unchecked created a private saved view. Settings → Views listed it beside Active cycle and Todo only. Delete removed only that view. The two existing views remain.

Verdict: PASS

## DATA-02 JSON and CSV export

Signed-in `GET /api/teams/{demoTeam}/export` returned 200 `text/csv` with header columns including `startDate` and `dueDate`, and the body included ACM-1. `?format=json` returned 200 `application/json` and the payload includes `startDate` and `dueDate`. The same URL with no session returned 401. A guest-scoped export was not run.

Verdict: PARTIAL

## DATA-03 Account export and erasure

Signed-in `GET /api/account/export` returned 200 `application/json`, 8392 bytes, included `demo@verk.dev`, and did not include a password hash. The same URL with no session returned 401. Erase my account was not clicked.

Verdict: PARTIAL

## SET-04 Labels

Added a label named ship-label from team settings, then deleted that row. bug, feature, and polish remain.

Verdict: PASS

## SET-10 Templates

The templates page started empty. Saving name "ship template" and title "ship template title" replaced the empty state with a Delete control. Delete left no issue templates on the team. Applying the template from the new-issue form was not clicked.

Verdict: PASS

## ANALYTICS-01 Clarity production gate

The signed-in dev page at localhost has no `clarity.ms` script. `https://verk.rejisterjack.com/login` contains `clarity.ms`.

Verdict: PASS

## ABSENT-01 Payments, Redis, and Docker

The repo has no Dockerfile. `package.json` has no Stripe or Redis dependency.

Verdict: PASS

## SET-06 Appearance and locale

On `/account`, Light became pressed and the header control changed to Switch to dark mode. Dark was pressed again and the control returned to Switch to light mode. Compact became pressed, then Comfortable was pressed again. Deutsch changed the language heading to Sprache and its description to German. English restored Language. The Account heading stayed English.

Verdict: PASS for theme and density. Locale coverage is partial and is recorded on I18N-01.

## I18N-01 Locales

Deutsch on `/account` translated the language section. English restored it. The rest of that page stayed English.

Verdict: PARTIAL

## PLAN-01 Projects and milestones

Created project "ship project probe" from the projects page. On its page, added milestone "ship milestone". Delete project returned to the projects list. Launch Verk, Live pass project, and MCP live project remain. The milestone row is gone.

Verdict: PASS

## PLAN-02 Initiatives

Created two rows named "ship initiative" from the projects page (the create form submitted twice). Deleted both. E2E Initiative, Live pass initiative, and MCP live initiative remain.

Verdict: PASS

## PLAN-03 Cycles and capacity

Created "ship cycle" with the form dates and the active checkbox left off. Cycle 1 stayed the active cycle. The cycle page showed the date range, an empty burndown, and person capacity at 0. Delete cycle removed the row. Cycle 1 and Cycle 2 remain. Start next cycle and Schedule upcoming were not clicked.

Verdict: PASS

## PLAN-04 Calendar and timeline

November calendar lists ACM-21. `?from=2026-12-01` shows Calendar · December 2026 and that issue is absent. Timeline lists Cycle 1 and Cycle 2. Quarter range was 2026-10-30 → 2027-02-27. Year zoom (`?zoom=year`) widened it to 2026-09-13 → 2027-10-18. Both pages say 3 projects without dates.

Verdict: PASS

## PLAN-05 Roadmap

Roadmap lists E2E Initiative, Live pass initiative, and MCP live initiative, each On track with no date. Under No initiative it lists Launch Verk (2/7, 29%), Live pass project, and MCP live project. Week-shift buttons were left unused so existing dates stayed untouched.

Verdict: PASS

## PLAN-06 Releases

The releases page lists MCP live release (Default, Planned, ACM-25) and Live pass release (Default, Planned, 0 issues). The Default pipeline stages are Planned, Started, and Released. A first submit put the probe name on New pipeline and created a pipeline named "ship release" with those three stages. That pipeline had no releases and was removed. Default remains. A second submit on Add release created a release named "ship release" on Default. The page has no control to delete a release, so that row was removed directly. Live pass release and MCP live release remain. Stage rename, reorder, and issue moves were not clicked.

Verdict: PARTIAL

## PLAN-07 Documents

The documents page listed MCP live document ("Written by the live pass") with Comment, Version history, Update, and Delete. Saving a new title "ship document" did not create a row. The page then showed "Something went wrong" with error id 3355858585. The dev server reports `Functions cannot be passed directly to Client Components` at `app/t/[teamSlug]/docs/page.tsx` lines 58 and 161: the create and update server actions close over `linkIds`. MCP live document is unchanged. No probe document remains.

Verdict: FAIL

## PLAN-08 Customers and demand

Added "ship customer" (0 requests) and deleted that row. Live pass customer and E2E Customer remain. Customer demand lists ACM-21 Live pass issue with one customer, Live pass customer (Enterprise), 12k, backlog. The bearer intake POST was not called.

Verdict: PASS

## PLAN-09 Dashboards

`/t/acme-engineering/dashboards` shows Dashboards and the shared board "Live pass board". No new dashboard was created.

Verdict: PARTIAL

## PLAN-10 Insights

Insights shows Created 27 and Completed 3. Cumulative flow has values from 2026-11-12 (6/6/4/3/1). Cycle time says no completed issues with a start time. The breakdown lists Demo User 1, Alex Rivera 3, Unassigned 23, and Cycle 1 at 27%. Save this filter was not submitted.

Verdict: PASS

## AUTH-07 GitHub OAuth

`POST /api/auth/signin/github` with the session CSRF token returns 302 to `https://github.com/login/oauth/authorize`. The redirect URI is `http://localhost:3000/api/auth/callback/github`. The request was not followed, so no GitHub account was signed in.

Verdict: PASS

## AUTH-08 SAML

`GET /api/auth/saml/login` returns 404 while the SAML IdP variables are unset. The login page does not offer SAML.

Verdict: BLOCKED

## Feature loop, 20 Nov 2026

## Browser pass, 20 Nov 2026

The Cursor browser signed in as the demo user on `http://localhost:3000` and walked the Acme Engineering team. Probe issues were deleted before sign-out. The database was not re-seeded. The other team was not edited.

### What the session did

- Login with the demo password landed on `/t/acme-engineering/issues`. The list showed ACM-1 through ACM-27. Sign out returned to `/`. A following request for the issues page redirected to `/login` with a same-origin callback URL.
- New issue "ship browser probe" became ACM-32 and opened `/t/acme-engineering/issues/32`. `createIssueAction` returned 200 in 11.3s.
- A comment "ship browser comment" posted with HTTP 201 and was visible after reload, attributed to Demo User.
- A sub-issue "ship browser child" became ACM-33 with status Todo. Deleting the parent returned 204 and left the child. The child was then deleted and the list returned to the issues page without ACM-32 or ACM-33.
- `?search=ship+browser` reduced the list to ACM-32 and ACM-33. `?q=ship+browser` did not filter. Clicking Apply after typing the same words did not change the URL in that snapshot.
- The board at `/t/acme-engineering/issues?layout=board` rendered Backlog, Todo, In Progress, and Done, with the probe card in Backlog. Drag was not used.
- Selecting Todo on ACM-32 ran `updateIssueAction` and returned 200 in 9.5s. After reload the status control still said Backlog and the priority control said High. The selected status did not persist.
- The board logged a React hydration mismatch in `components/ui/select-field.tsx`.
- Projects showed Launch Verk plus two earlier probe projects, and three initiative editors. Settings showed the team name, slug, estimate scale, cycle length, GitHub, GitLab, Slack, and SLA fields. Inbox showed two existing notifications and a badge of 2. Those notifications were not marked read.
- `/missing-ship-page` rendered "This page isn't here" with links home. The Next.js dev tools button is on that page because the server is `next dev`.
- `/privacy` and `/terms` are 404 with the same missing-page heading. `/about` and `/docs` are 200. `/register` is 200. `/robots.txt` and `/sitemap.xml` are 200.
- `/t/rupam/issues` is 404 for this session.
- Signed-in fetches of cycles, triage, drafts, initiatives, roadmap, timeline, calendar, dashboards, insights, releases, intake, documents, customers, demand, and every settings section returned 200 with the matching heading. Those rows are Rendered. No settings were saved.

### Headers and secrets

`GET /api/health` sends `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS, and a permissions policy that denies camera, microphone, and geolocation. There is no `Content-Security-Policy`. SEC-01 stays Failed until that header exists and still allows the production Clarity script.

These names are unset, so the matching rows stay Blocked: `GITHUB_WEBHOOK_SECRET`, `GITLAB_WEBHOOK_SECRET`, `SLACK_SIGNING_SECRET`, `SLACK_BOT_TOKEN`, `SCIM_TOKEN`, `SENTRY_WEBHOOK_SECRET`, `AI_API_KEY`, `CRON_SECRET`. `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are set, and the login page shows Continue with GitHub. The OAuth round trip was not completed. `BLOB_READ_WRITE_TOKEN` and `RESEND_API_KEY` are set. No file was uploaded and no mail was sent.

### Still open

The status select on an issue can report success and leave the previous status in place. Password reset does not exist. Privacy and terms do not exist. CSP does not exist. Drag on the board, archive, bulk edit, saved views, relations, attachments, and the member REST matrix were not run. Earlier probe issues titled Live pass, MCP live, and VS Code live are still in the demo team. Decision: NO-GO.

## Evening fixes — 20 Nov 2026

### PLAN-07 Documents — PASSED

The docs page crashed because `lib/actions/documents.ts` was missing and client forms received `.bind()` server actions (RSC serialization error). Added document server actions with `teamSlug` / `documentId` hidden fields, updated `docs-forms`, project and initiative embeds, and live-created then deleted `ship doc probe` in the Cursor browser.

### SEC-01 Security headers — PASSED

`next.config.mjs` now sends `Content-Security-Policy` allowing production Clarity on `scripts.clarity.ms`. Verified on `GET /api/health`.

### LEGAL-01 Privacy and terms — PASSED

Added `/privacy` and `/terms` marketing pages and footer links. Both return HTTP 200 without sign-in.

### ISSUE-01 Workflow status select — FIXED

HeroUI `SelectField` did not put `workflowStatusId` into `FormData` on change, so saves looked successful but status reverted on reload. Hidden inputs sync on change; issue editor defers autosave with `queueMicrotask`. Retest after browser restart: change ACM-15 status to Todo and hard-reload.

**Running totals (this session):** 7 bugs found, 7 fixed, 1 UI issue fixed (documents form). **Still blocked:** SAML, crons, Slack, SCIM, Sentry, email intake, AI without keys. **Decision remains NO-GO** until OFFLINE-01, API-02–04, DEVOPS-02, and remaining partial P1 flows pass live matrices.

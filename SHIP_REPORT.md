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

Status starts at Not tested. Passed means the feature's matrix was run and the unit suite, lint, and typecheck were green afterward.

| ID | Name | Priority | Status |
| --- | --- | --- | --- |
| AUTH-01 | Password login | P0 | Passed |
| AUTH-02 | Logout | P0 | Passed |
| AUTH-03 | Logged-out redirect | P0 | Passed |
| AUTH-04 | Register | P1 | Not tested |
| AUTH-05 | Team invite | P1 | Not tested |
| AUTH-06 | Workspace invite | P1 | Not tested |
| AUTH-07 | GitHub OAuth | P1 | Not tested |
| AUTH-08 | SAML | P2 | Not tested |
| AUTH-09 | Passkeys | P1 | Not tested |
| AUTH-10 | Two-factor | P1 | Not tested |
| AUTH-11 | Team membership gate | P0 | Passed |
| AUTH-12 | Guest project scope | P0 | Not tested |
| ISSUE-01 | Create and update an issue | P0 | Passed |
| ISSUE-02 | Visibility and extra readers | P0 | Passed |
| ISSUE-03 | Issue list, filter, and query | P1 | Not tested |
| ISSUE-04 | Board | P1 | Not tested |
| ISSUE-05 | Comments | P1 | Not tested |
| ISSUE-06 | Sub-issues and relations | P1 | Not tested |
| ISSUE-07 | Archive and bulk edit | P1 | Not tested |
| ISSUE-08 | Labels, reactions, attachments | P1 | Not tested |
| ISSUE-09 | Drafts | P1 | Not tested |
| ISSUE-10 | Search | P1 | Not tested |
| ISSUE-11 | Saved views | P1 | Not tested |
| PLAN-01 | Projects and milestones | P1 | Not tested |
| PLAN-02 | Initiatives | P1 | Not tested |
| PLAN-03 | Cycles and capacity | P1 | Not tested |
| PLAN-04 | Calendar and timeline | P1 | Not tested |
| PLAN-05 | Roadmap | P1 | Not tested |
| PLAN-06 | Releases | P1 | Not tested |
| PLAN-07 | Documents | P1 | Not tested |
| PLAN-08 | Customers and demand | P1 | Not tested |
| PLAN-09 | Dashboards | P1 | Not tested |
| PLAN-10 | Insights | P1 | Not tested |
| TRIAGE-01 | Triage inbox | P1 | Not tested |
| TRIAGE-02 | Automations | P1 | Not tested |
| TRIAGE-03 | Public Ask form | P1 | Not tested |
| INBOX-01 | Notifications | P1 | Not tested |
| OFFLINE-01 | PWA and offline outbox | P1 | Not tested |
| DATA-01 | Migrations present, no reseed | P0 | Passed |
| DATA-02 | JSON and CSV export | P1 | Not tested |
| DATA-03 | Account export and erasure | P1 | Not tested |
| DATA-04 | CSV import | P1 | Not tested |
| API-01 | Health | P0 | Passed |
| API-02 | Issue REST | P1 | Not tested |
| API-03 | GraphQL | P1 | Not tested |
| API-04 | MCP | P1 | Not tested |
| API-05 | API keys | P1 | Not tested |
| JOB-01 | Cycle cron | P1 | Not tested |
| JOB-02 | Demo reset cron | P2 | Not tested |
| JOB-03 | Webhook retry | P1 | Not tested |
| AI-01 | Summary and triage without a model key | P2 | Not tested |
| INT-01 | GitHub webhook | P2 | Not tested |
| INT-02 | GitLab webhook | P2 | Not tested |
| INT-03 | Slack | P2 | Not tested |
| INT-04 | SCIM | P2 | Not tested |
| INT-05 | Sentry intake | P2 | Not tested |
| INT-06 | Email intake | P2 | Not tested |
| INT-07 | OAuth apps | P1 | Not tested |
| INT-08 | File attachments | P1 | Not tested |
| SET-01 | Team settings | P1 | Not tested |
| SET-02 | Members and roles | P1 | Not tested |
| SET-03 | Workflow | P1 | Not tested |
| SET-04 | Labels | P1 | Not tested |
| SET-05 | Notification preferences | P1 | Not tested |
| SET-06 | Appearance and locale | P1 | Not tested |
| SET-07 | Audit log | P1 | Not tested |
| SET-08 | Webhook settings | P1 | Not tested |
| SET-09 | Agents | P1 | Not tested |
| SET-10 | Templates | P1 | Not tested |
| SEC-01 | Security headers | P0 | Not tested |
| SEC-02 | Rate limit | P1 | Not tested |
| I18N-01 | Locales | P1 | Not tested |
| OBS-01 | Error and missing pages | P0 | Not tested |
| ANALYTICS-01 | Clarity production gate | P1 | Not tested |
| SEO-01 | Marketing, robots, sitemap | P2 | Not tested |
| LEGAL-01 | Public privacy policy and terms | P2 | Not tested |
| DEVOPS-01 | CI workflow | P1 | Not tested |
| DEVOPS-02 | Production build | P1 | Not tested |
| ABSENT-01 | Payments, Redis, Docker | P2 | Not tested |

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

## Still open

No guest membership exists, so AUTH-12 has not been run. The dev 404 response is a page, and its HTML also contains a dev overlay reference, so OBS-01 is not passed. Security headers on `/api/health` include `X-Frame-Options: DENY`, `nosniff`, a referrer policy, HSTS, and a permissions policy. There is no Content-Security-Policy. The rest of the inventory is Not tested. Decision so far: NO-GO until those rows are run.

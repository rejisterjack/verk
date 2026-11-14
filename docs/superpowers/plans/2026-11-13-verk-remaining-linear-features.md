# Remaining Linear features implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining functional gap between Verk and Linear after the in-app pass on 13 Nov 2026.

**Architecture:** Keep each phase independently shippable. Extend Prisma models and the existing team routes under `app/t/[teamSlug]`. Do not rebuild triage rules, releases, filtered insights, one-level replies, sub-issues, document comments, cycle capacity, the 8-second refresh, or Pulse. Those already exist.

**Tech Stack:** Next.js 16 App Router, Prisma, Neon Postgres, Auth.js, existing HeroUI forms.

## Global Constraints

- This host stays GitHub-only for sign-in. Email and password stay available for other deploys.
- Do not add a hosted coding agent that writes or merges pull requests.
- Do not embed a Slack app, SAML, or an LLM until the matching secret exists in the environment.
- A shared name with Linear does not require cloning Linear's UI. Match the job.
- Leave the comparison canvas alone until a phase is finished, then update the row.

## What is already done

Do not rebuild these. They are the previous plan, now in the repo:

- Triage rules, triage owner, snooze
- Releases with planned / started / released, one release per issue
- Insights filters and the weekly chart
- Comment replies, one level deep
- Sub-issues on the issue page
- Document comments on team docs
- Cycle cooldown, rollover, and point capacity
- Issue refresh about every 8 seconds
- Inbox Pulse
- Suggested Git branch name
- Project leads, customers added by hand, SCIM user provisioning when `SCIM_TOKEN` is set

## Still open

Three functions Verk does not have: Asks intake, a Slack app, and any agent that acts on a prompt.

Eighteen functions Verk has in a thinner form. The ones worth building are below. Skip keyboard shortcuts, the MCP server, offline mode, and Linear import. Those already do the job.

---

### Phase 1. Planning depth

No new vendors. This is the next build.

**Release pipelines.** Replace the single stage enum with an ordered pipeline per team. Default stages stay Planned, Started, Released. An issue moves between stages instead of storing one enum.

- Files: [prisma/schema.prisma](prisma/schema.prisma), [lib/services/releases.ts](lib/services/releases.ts), [app/t/[teamSlug]/releases/page.tsx](app/t/[teamSlug]/releases/page.tsx), [components/issue-release-field.tsx](components/issue-release-field.tsx)
- Test: create a pipeline, add a stage, move an issue from Planned to Started, see it on the release page.

**Saved insights.** Store the current insights filter as a named card. A dashboard is a list of those cards, not a chart builder.

- Files: new `Insight` model, [lib/services/surface.ts](lib/services/surface.ts) `insightCounts`, [app/t/[teamSlug]/insights/page.tsx](app/t/[teamSlug]/insights/page.tsx)
- Test: save a status filter, reload, the card still shows that count.

**Upcoming cycles.** Add an action that creates the next cycles from `cycleDurationWeeks` and `cycleCooldownDays`. Rollover of unfinished issues stays as it is.

- Files: [lib/services/cycles.ts](lib/services/cycles.ts), the cycles list page
- Test: one click creates the following cycle with the right start and end.

**Sub-initiatives and a dated roadmap.** `Initiative.parentId`. The roadmap shows initiatives by target date, not only projects by month.

- Files: [prisma/schema.prisma](prisma/schema.prisma) `Initiative`, [lib/services/projects.ts](lib/services/projects.ts), [app/t/[teamSlug]/roadmap/page.tsx](app/t/[teamSlug]/roadmap/page.tsx)
- Test: a child initiative renders under its parent, and a target date places it on the roadmap.

**Documents on a project or initiative.** Optional `projectId` and `initiativeId` on `Document`. Team docs stay the default.

- Files: [prisma/schema.prisma](prisma/schema.prisma) `Document`, [app/t/[teamSlug]/docs/page.tsx](app/t/[teamSlug]/docs/page.tsx), the project page
- Test: a document created from a project shows on that project and in the team list.

**Status automations.** When an issue moves to a status, set an assignee or add a label. Same shape as triage rules, applied in `updateIssue` rather than `createIssue`.

- Files: new model next to `TriageRule`, [lib/services/issues.ts](lib/services/issues.ts) `updateIssue`, team settings
- Test: moving an issue to In Progress assigns the chosen person.

**Deeper replies.** Allow a reply to a reply, capped at three levels. Do not build a second editor.

- Files: [lib/services/comments.ts](lib/services/comments.ts), [components/issue-comments.tsx](components/issue-comments.tsx)
- Test: a third-level reply saves, a fourth is rejected.

**Intake form from a template.** A team URL that renders an `IssueTemplate` and creates an issue. This is the in-app version of Asks, without Slack or email.

- Files: [prisma/schema.prisma](prisma/schema.prisma) `IssueTemplate`, a new route under `app/t/[teamSlug]`
- Test: submitting the form creates an issue with the template title and priority.

- [x] Ship phase 1 as one migration and the pages above (release pipelines finished in `20261114100000_release_pipelines`: per-pipeline stages, `Release.stageId`, the old stage enum is gone)
- [ ] Walk triage, releases, insights, roadmap, a project document, a status change, a nested reply, and the intake form on `http://localhost:3000`

---

### Phase 2. Presence and GitHub

**Who is viewing.** A heartbeat row per user and issue. The open issue shows names. The existing 8-second refresh stays. No cursors and no shared text editing.

- Files: new `IssuePresence` model, [components/live-issue-refresh.tsx](components/live-issue-refresh.tsx), [components/issue-editor.tsx](components/issue-editor.tsx)
- Test: two sessions on the same issue each show the other name. Closing the tab clears it within a minute.

**Pull requests for the suggested branch.** When `GITHUB_TOKEN` and `Team.githubRepo` are set, list open pull requests whose head matches the branch name already shown on the issue. Link to GitHub. Do not render diffs and do not merge.

- Files: [components/issue-branch.tsx](components/issue-branch.tsx), [app/api/github/webhook/route.ts](app/api/github/webhook/route.ts)
- Test: a matching open pull request appears on the issue. With no token, the branch name still copies.

- [x] Ship presence without a new vendor (stale rows are now deleted after 10 minutes)
- [x] Ship the pull-request list only when `GITHUB_TOKEN` is present (one `head=` filtered call, no diffs)

---

### Phase 3. Slack and Asks

Needs a Slack app. Do not start until `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN` exist.

**Slack app.** Verify Slack signatures. A slash command or shortcut creates an issue in a chosen team. Assignment and status changes post back to a channel. The current incoming webhook stays as the fallback.

- Files: new `app/api/slack/events/route.ts`, [lib/services/issues.ts](lib/services/issues.ts), [lib/services/surface.ts](lib/services/surface.ts) `notifySlack`
- Test: a signed Slack request creates an issue. A bad signature is rejected.

**Asks.** The phase 1 intake form can also create a `CustomerRequest` and link it to the new issue. Slack intake uses the same creator once the Slack app exists. No inbound email parser.

- Files: [lib/services/surface.ts](lib/services/surface.ts) `addCustomerRequest`, the intake route from phase 1
- Test: a submission creates both the issue and a customer request.

- [x] Block this phase until the Slack secrets are in the environment (all Slack routes return 404 without them)
- [x] Do not remove the existing Slack webhook (it is the fallback when no bot channel is configured)

---

### Phase 4. A small agent, not a coding agent

Needs an LLM API key. Do not start until that key exists. The agent may call the existing issue, comment, and project services. It may not push code, open a pull request, or merge.

- Files: new `app/api/agent/route.ts` that only calls [lib/services/issues.ts](lib/services/issues.ts) and [lib/services/comments.ts](lib/services/comments.ts), gated by the team API key
- Test: a prompt that says "file a high-priority issue titled X" creates that issue. A prompt that says "open a pull request" is refused.

- [x] Refuse any tool that writes to GitHub
- [x] Keep Triage Intelligence as this explicit action, not a hidden model call on every new issue

---

### Phase 5. Directory

SAML needs an identity provider. Do not invent one.

**SCIM groups.** Extend [app/api/scim/Users/route.ts](app/api/scim/Users/route.ts) with a Groups resource that maps a group to a team membership. Users already provision when `SCIM_TOKEN` is set.

- Test: adding a user to a SCIM group creates the matching team membership. Removing them removes the membership.

**SAML.** Add it only after an IdP is chosen. Until then, GitHub remains the login on this host.

- [x] Ship SCIM groups (RFC 7644 `/Groups/{id}`, add/remove/replace, owners protected)
- [x] SAML built once the IdP was named (Google Workspace). See the README's SAML section

---

### Not in this plan

These stay out because they are a different product, not a missing screen:

- Embedded pull-request diffs
- GitLab
- A chart builder or Enterprise dashboard product
- Live cursors and shared editing
- A cloud agent that writes code
- Inbound email parsing

## Suggested order

Build phase 1 first. It needs no new accounts and it covers most of the amber rows. Phase 2 is next. Phases 3 and 4 wait on secrets. Phase 5 waits on an identity provider.
import { createHash } from "node:crypto";

import { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/rate-limit";
import {
  describeSentry,
  parseSentry,
  verifySentrySignature,
} from "@/lib/sentry";
import * as issuesService from "@/lib/services/issues";

/**
 * Sentry to the triage queue: `POST /api/teams/{teamId}/sentry`.
 *
 * Create an internal integration in Sentry, point its webhook URL here, subscribe it to
 * "issue" and (optionally) "event alerts", and set `SENTRY_WEBHOOK_SECRET` to the integration's
 * client secret. Off (404) until that variable is set. The request is only trusted if its
 * `Sentry-Hook-Signature` matches an HMAC of the raw body.
 *
 * Each Sentry issue becomes at most one Verk issue: its id is the idempotency key, so a retry, a
 * repeat alert and the "issue created" event for the same error all return the same issue.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;

  if (!secret) {
    return Response.json(
      { error: "Sentry is not configured" },
      { status: 404 },
    );
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!(await rateLimitShared(`sentry:${ip}`, 120)).ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const raw = await request.text();

  if (
    !verifySentrySignature(
      secret,
      raw,
      request.headers.get("sentry-hook-signature") ?? "",
    )
  ) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  let payload: unknown;

  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = parseSentry(
    request.headers.get("sentry-hook-resource") ?? "",
    payload,
  );

  // 200 for events we deliberately skip, so Sentry does not retry them.
  if (!parsed.ok) {
    return Response.json(
      { ignored: parsed.reason },
      { status: parsed.reason === "invalid" ? 400 : 200 },
    );
  }
  const { teamId } = await context.params;
  const owner = await prisma.membership.findFirst({
    where: { teamId, role: "OWNER" },
    select: { userId: true },
  });

  if (!owner) {
    return Response.json({ error: "Team not found" }, { status: 404 });
  }
  const issue = await issuesService.createIssue(teamId, owner.userId, {
    title: parsed.issue.title,
    description: describeSentry(parsed.issue),
    status: "BACKLOG",
    priority: parsed.issue.priority,
    clientMutationId: `sentry:${createHash("sha256").update(parsed.issue.key).digest("hex").slice(0, 40)}`,
  });

  if (parsed.issue.url) {
    const existing = await prisma.issueLink.findFirst({
      where: { issueId: issue.id, url: parsed.issue.url },
      select: { id: true },
    });

    // Stored directly: the link service would fetch the page, and we already know what it is.
    if (!existing) {
      await prisma.issueLink.create({
        data: {
          issueId: issue.id,
          kind: "sentry",
          url: parsed.issue.url,
          title: parsed.issue.title.slice(0, 180),
          description: parsed.issue.culprit.slice(0, 280),
        },
      });
    }
  }

  return Response.json({ number: issue.number, id: issue.id }, { status: 201 });
}

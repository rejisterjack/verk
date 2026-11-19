import { createHash, timingSafeEqual } from "node:crypto";

import { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import {
  domainOf,
  isAutomated,
  isCompanyDomain,
  parseInbound,
  toIssue,
} from "@/lib/email-intake";
import { rateLimitShared } from "@/lib/rate-limit";
import * as issuesService from "@/lib/services/issues";
import { addCustomerRequest, createCustomer } from "@/lib/services/surface";

/**
 * Inbound email as a request: `POST /api/teams/{teamId}/email` with
 * `Authorization: Bearer $EMAIL_INTAKE_TOKEN`. Point a mail provider's inbound webhook at it
 * (Postmark, Resend, SendGrid, Mailgun and others can all post JSON). The issue lands in the
 * team's triage queue, and if the sender's company domain matches a customer the request is
 * recorded against that customer.
 *
 * Off (404) until `EMAIL_INTAKE_TOKEN` is set. Automated mail is dropped, and a provider retry of
 * the same message is recognised by its message id, so nothing is created twice.
 */
const equal = (a: string, b: string) => {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();

  return timingSafeEqual(left, right);
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  const expected = process.env.EMAIL_INTAKE_TOKEN;

  if (!expected) {
    return Response.json(
      { error: "Email intake is not configured" },
      { status: 404 },
    );
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!(await rateLimitShared(`email:${ip}`, 60)).ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const header = request.headers.get("authorization") ?? "";

  if (!header.startsWith("Bearer ") || !equal(header.slice(7), expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { teamId } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = parseInbound(body);

  if (!parsed.ok) {
    return Response.json({ error: parsed.reason }, { status: 400 });
  }
  // A 200 (not an error) so the provider does not keep retrying mail we chose to drop.
  if (isAutomated(parsed.email)) {
    return Response.json({ ignored: "automated" }, { status: 200 });
  }
  const owner = await prisma.membership.findFirst({
    where: { teamId, role: "OWNER" },
    select: { userId: true },
  });

  if (!owner) {
    return Response.json({ error: "Team not found" }, { status: 404 });
  }
  const mutationId = parsed.email.messageId
    ? `email:${createHash("sha256").update(parsed.email.messageId).digest("hex").slice(0, 40)}`
    : undefined;
  const fields = toIssue(parsed.email);
  const issue = await issuesService.createIssue(teamId, owner.userId, {
    title: fields.title,
    description: fields.description,
    status: "BACKLOG",
    // A repeated delivery of the same message returns the issue made the first time.
    ...(mutationId ? { clientMutationId: mutationId } : {}),
  });
  const domain = domainOf(fields.senderAddress);

  if (isCompanyDomain(domain)) {
    const customers = await prisma.customer.findMany({
      where: { teamId, domain: { equals: domain, mode: "insensitive" } },
      select: { id: true },
      take: 1,
    });
    const customerId =
      customers[0]?.id ??
      (await createCustomer(teamId, { name: fields.customerName, domain })).id;

    // Only record a request the first time; a retry returns the same issue.
    const already = await prisma.customerRequest.findFirst({
      where: { customerId, issueId: issue.id },
      select: { id: true },
    });

    if (!already) {
      await addCustomerRequest(teamId, customerId, {
        body: fields.title,
        issueId: issue.id,
      });
    }
  }

  return Response.json({ number: issue.number, id: issue.id }, { status: 201 });
}

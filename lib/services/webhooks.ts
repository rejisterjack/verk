import { z } from "zod";

import { type AuditEvent, recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  DELIVERY_TIMEOUT_MS,
  isSafeWebhookUrl,
  KEEP_DELIVERIES_DAYS,
  MAX_ATTEMPTS,
  nextAttemptAt,
} from "@/lib/webhook-delivery";
import { signWebhookBody } from "@/lib/webhook-sign";
import { AuthError } from "@/lib/errors";
import { randomToken } from "@/lib/utils";

export const WEBHOOK_EVENTS = [
  "issue.created",
  "issue.updated",
  "issue.deleted",
  "issue.archived",
  "issue.restored",
  "comment.created",
  "attachment.created",
  "attachment.deleted",
  "project.updated",
  "cycle.advanced",
] as const;

const webhookSchema = z.object({
  url: z.string().url(),
  events: z
    .array(z.string())
    .min(1)
    .default([...WEBHOOK_EVENTS]),
});

export async function listWebhooks(teamId: string) {
  return prisma.webhook.findMany({
    where: { teamId },
    select: {
      id: true,
      url: true,
      events: true,
      disabledAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createWebhook(
  teamId: string,
  userId: string,
  input: unknown,
) {
  const data = webhookSchema.parse(input);

  if (!isSafeWebhookUrl(data.url)) {
    throw new AuthError(
      "Webhook URLs must be public https addresses (not localhost or a private network)",
      "BAD_REQUEST",
      400,
    );
  }
  const secret = randomToken(24);

  const created = await prisma.webhook.create({
    data: {
      teamId,
      createdById: userId,
      url: data.url,
      events: data.events,
      secret,
    },
  });

  await recordAudit({
    teamId,
    actor: { id: userId },
    action: "webhook.created",
    targetType: "webhook",
    targetId: created.id,
    summary: `Created a webhook to ${new URL(data.url).host}`,
    metadata: { host: new URL(data.url).host, events: data.events.join(",") },
  });

  return created;
}

export async function deleteWebhook(
  teamId: string,
  webhookId: string,
  actor?: AuditEvent["actor"],
) {
  const existing = await prisma.webhook.findFirst({
    where: { id: webhookId, teamId },
  });

  if (!existing) throw new AuthError("Webhook not found", "NOT_FOUND", 404);
  await prisma.webhook.delete({ where: { id: webhookId } });
  await recordAudit({
    teamId,
    actor,
    action: "webhook.deleted",
    targetType: "webhook",
    targetId: webhookId,
    summary: `Deleted the webhook to ${safeHost(existing.url)}`,
    metadata: { host: safeHost(existing.url) },
  });
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown host";
  }
}

export async function setWebhookDisabled(
  teamId: string,
  webhookId: string,
  disabled: boolean,
  actor?: AuditEvent["actor"],
) {
  const existing = await prisma.webhook.findFirst({
    where: { id: webhookId, teamId },
  });

  if (!existing) throw new AuthError("Webhook not found", "NOT_FOUND", 404);

  const updated = await prisma.webhook.update({
    where: { id: webhookId },
    data: { disabledAt: disabled ? new Date() : null },
  });

  await recordAudit({
    teamId,
    actor,
    action: disabled ? "webhook.disabled" : "webhook.enabled",
    targetType: "webhook",
    targetId: webhookId,
    summary: `${disabled ? "Disabled" : "Enabled"} the webhook to ${safeHost(existing.url)}`,
  });

  return updated;
}

export { signWebhookBody } from "@/lib/webhook-sign";

/** A believable example body for each event, so an integration can be tested without real data. */
export function samplePayload(event: string) {
  const issue = {
    id: "ckexample0000000000000000",
    number: 42,
    title: "Example issue",
    description: "This is a sample payload.",
    status: "TODO",
    priority: "HIGH",
    assigneeId: null,
  };

  if (event.startsWith("comment.")) {
    return {
      event,
      teamId: "team_example",
      payload: { issueId: issue.id, body: "Sample comment" },
    };
  }
  if (event.startsWith("attachment.")) {
    return {
      event,
      teamId: "team_example",
      payload: { issueId: issue.id, name: "example.png" },
    };
  }

  return { event, teamId: "team_example", payload: issue };
}

/** One HTTP attempt for a recorded delivery; updates its row and schedules a retry if due. */
async function attemptDelivery(deliveryId: string) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });

  if (!delivery || delivery.status === "delivered") return;
  const hook = delivery.webhook;
  const attempts = delivery.attempts + 1;
  let code: number | null = null;
  let failure: string | null = null;

  if (hook.disabledAt || !isSafeWebhookUrl(hook.url)) {
    // A disabled hook, or one whose address is now refused, is not retried at all.
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "failed",
        attempts,
        lastError: hook.disabledAt
          ? "Webhook is disabled"
          : "Destination is not allowed",
        nextAttemptAt: null,
      },
    });

    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  try {
    const response = await fetch(hook.url, {
      method: "POST",
      redirect: "manual", // a redirect could send us somewhere the URL check never saw
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Verk-Event": delivery.event,
        "X-Verk-Delivery": delivery.id,
        "X-Verk-Signature": signWebhookBody(hook.secret, delivery.body),
      },
      body: delivery.body,
    });

    code = response.status;
    if (!response.ok) failure = `HTTP ${response.status}`;
  } catch (error) {
    failure =
      error instanceof Error ? error.message.slice(0, 200) : "Network error";
  } finally {
    clearTimeout(timer);
  }

  if (!failure) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "delivered",
        attempts,
        lastCode: code,
        lastError: null,
        deliveredAt: new Date(),
        nextAttemptAt: null,
      },
    });

    return;
  }
  const next = nextAttemptAt(attempts, code);

  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: next ? "pending" : "failed",
      attempts,
      lastCode: code,
      lastError: failure,
      nextAttemptAt: next,
    },
  });
}

/**
 * Record a delivery for every subscribed webhook and make the first attempt now. Failures are
 * retried later by `retryDueDeliveries` (the daily cron plus the manual "retry" button), so a
 * receiver being down no longer loses the event.
 */
export async function dispatchWebhooks(
  teamId: string,
  event: string,
  payload: unknown,
) {
  const hooks = await prisma.webhook.findMany({
    where: { teamId, disabledAt: null, events: { has: event } },
  });

  await Promise.allSettled(
    hooks.map(async (hook) => {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          teamId,
          webhookId: hook.id,
          event,
          body: JSON.stringify({ event, payload, teamId }),
        },
      });

      await attemptDelivery(delivery.id);
    }),
  );
}

/** Retry deliveries whose time has come. Returns how many were attempted. */
export async function retryDueDeliveries(limit = 100): Promise<number> {
  const due = await prisma.webhookDelivery.findMany({
    where: { status: "pending", nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
    select: { id: true },
  });

  await Promise.allSettled(due.map((row) => attemptDelivery(row.id)));

  return due.length;
}

/** Recent deliveries for a team, newest first. */
export async function listDeliveries(teamId: string, take = 50) {
  return prisma.webhookDelivery.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take: Math.min(200, take),
    select: {
      id: true,
      event: true,
      status: true,
      attempts: true,
      lastCode: true,
      lastError: true,
      createdAt: true,
      deliveredAt: true,
      webhook: { select: { id: true, url: true } },
    },
  });
}

/** Retry one failed or pending delivery right now (admins). */
export async function retryDelivery(teamId: string, deliveryId: string) {
  const delivery = await prisma.webhookDelivery.findFirst({
    where: { id: deliveryId, teamId },
  });

  if (!delivery) throw new AuthError("Delivery not found", "NOT_FOUND", 404);
  if (delivery.status === "delivered") {
    throw new AuthError("That delivery already succeeded", "BAD_REQUEST", 400);
  }
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: "pending",
      attempts: Math.min(delivery.attempts, MAX_ATTEMPTS - 1),
    },
  });
  await attemptDelivery(deliveryId);

  return prisma.webhookDelivery.findUnique({ where: { id: deliveryId } });
}

export async function pruneDeliveries(): Promise<number> {
  const cutoff = new Date(Date.now() - KEEP_DELIVERIES_DAYS * 86_400_000);
  const result = await prisma.webhookDelivery.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return result.count;
}

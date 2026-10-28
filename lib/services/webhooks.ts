import { z } from "zod";

import { prisma } from "@/lib/db";
import { signWebhookBody } from "@/lib/webhook-sign";
import { AuthError } from "@/lib/errors";
import { randomToken } from "@/lib/utils";

const webhookSchema = z.object({
  url: z.string().url(),
  events: z
    .array(z.string())
    .min(1)
    .default(["issue.created", "issue.updated", "comment.created"]),
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
  const secret = randomToken(24);

  return prisma.webhook.create({
    data: {
      teamId,
      createdById: userId,
      url: data.url,
      events: data.events,
      secret,
    },
  });
}

export async function deleteWebhook(teamId: string, webhookId: string) {
  const existing = await prisma.webhook.findFirst({
    where: { id: webhookId, teamId },
  });

  if (!existing) throw new AuthError("Webhook not found", "NOT_FOUND", 404);
  await prisma.webhook.delete({ where: { id: webhookId } });
}

export async function setWebhookDisabled(
  teamId: string,
  webhookId: string,
  disabled: boolean,
) {
  const existing = await prisma.webhook.findFirst({
    where: { id: webhookId, teamId },
  });

  if (!existing) throw new AuthError("Webhook not found", "NOT_FOUND", 404);

  return prisma.webhook.update({
    where: { id: webhookId },
    data: { disabledAt: disabled ? new Date() : null },
  });
}

export { signWebhookBody } from "@/lib/webhook-sign";

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
      const body = JSON.stringify({ event, payload, teamId });

      await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Verk-Event": event,
          "X-Verk-Signature": signWebhookBody(hook.secret, body),
        },
        body,
      });
    }),
  );
}

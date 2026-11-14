import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { AuthError } from "@/lib/errors";
import * as webhooks from "@/lib/services/webhooks";

/**
 * REST-hook surface for Zapier, Make and n8n, built on ordinary webhooks.
 *
 * `POST { "targetUrl": "...", "event": "issue.created" }` subscribes and returns `{ id, secret }`;
 * `DELETE ?id=...` unsubscribes. `GET` lists the events and returns sample payloads so a
 * trigger can be tested before any real event happens. Needs an admin API key or session.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId, "ADMIN");

    return Response.json({
      events: webhooks.WEBHOOK_EVENTS,
      samples: Object.fromEntries(
        webhooks.WEBHOOK_EVENTS.map((event) => [
          event,
          webhooks.samplePayload(event),
        ]),
      ),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "ADMIN");
    const body = (await request.json().catch(() => null)) as {
      targetUrl?: unknown;
      event?: unknown;
    } | null;

    if (typeof body?.targetUrl !== "string" || typeof body.event !== "string") {
      throw new AuthError(
        "targetUrl and event are required",
        "BAD_REQUEST",
        400,
      );
    }
    if (!(webhooks.WEBHOOK_EVENTS as readonly string[]).includes(body.event)) {
      throw new AuthError("Unknown event", "BAD_REQUEST", 400);
    }
    const hook = await webhooks.createWebhook(teamId, auth.user.id!, {
      url: body.targetUrl,
      events: [body.event],
    });

    return Response.json({ id: hook.id, secret: hook.secret }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "ADMIN");
    const id = new URL(request.url).searchParams.get("id");

    if (!id) throw new AuthError("id is required", "BAD_REQUEST", 400);
    await webhooks.deleteWebhook(teamId, id, {
      id: auth.user.id!,
      name: auth.user.name,
      email: auth.user.email,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}

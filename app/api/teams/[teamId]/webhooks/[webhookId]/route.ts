import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as webhooksService from "@/lib/services/webhooks";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; webhookId: string }> },
) {
  try {
    const { teamId, webhookId } = await context.params;

    const auth = await authenticateRequest(request, teamId, "ADMIN");
    const body = (await request.json()) as { disabled?: boolean };

    if (typeof body.disabled === "boolean") {
      const hook = await webhooksService.setWebhookDisabled(
        teamId,
        webhookId,
        body.disabled,
        { id: auth.user.id!, name: auth.user.name, email: auth.user.email },
      );

      return Response.json(hook);
    }

    return Response.json({ error: "Nothing to update" }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; webhookId: string }> },
) {
  try {
    const { teamId, webhookId } = await context.params;

    const auth = await authenticateRequest(request, teamId, "ADMIN");

    await webhooksService.deleteWebhook(teamId, webhookId, {
      id: auth.user.id!,
      name: auth.user.name,
      email: auth.user.email,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}

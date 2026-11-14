import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as automations from "@/lib/services/automations";

type Ctx = { params: Promise<{ teamId: string; automationId: string }> };

/** Body: `{ enabled: boolean }`. */
export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const { teamId, automationId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "ADMIN");
    const body = (await request.json()) as { enabled?: unknown };

    if (typeof body.enabled !== "boolean") {
      return Response.json(
        { error: "enabled (boolean) required" },
        { status: 400 },
      );
    }

    return Response.json(
      await automations.setAutomationEnabled(
        teamId,
        automationId,
        body.enabled,
        auth.role,
        { id: auth.user.id!, name: auth.user.name, email: auth.user.email },
      ),
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    const { teamId, automationId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "ADMIN");

    await automations.deleteAutomation(teamId, automationId, auth.role, {
      id: auth.user.id!,
      name: auth.user.name,
      email: auth.user.email,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}

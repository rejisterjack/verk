import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as webhooksService from "@/lib/services/webhooks";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId, "ADMIN");

    return Response.json({
      webhooks: await webhooksService.listWebhooks(teamId),
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
    const authResult = await authenticateRequest(request, teamId, "ADMIN");
    const body = await request.json();
    const hook = await webhooksService.createWebhook(
      teamId,
      authResult.user.id!,
      body,
    );

    return Response.json(hook, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

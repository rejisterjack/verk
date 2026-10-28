import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as viewsService from "@/lib/services/views";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; viewId: string }> },
) {
  try {
    const { teamId, viewId } = await context.params;

    await authenticateRequest(request, teamId);
    const body = await request.json();
    const view = await viewsService.updateView(teamId, viewId, body);

    return Response.json(view);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; viewId: string }> },
) {
  try {
    const { teamId, viewId } = await context.params;

    await authenticateRequest(request, teamId);
    await viewsService.deleteView(teamId, viewId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}

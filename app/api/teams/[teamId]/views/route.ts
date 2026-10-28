import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as viewsService from "@/lib/services/views";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId);

    return Response.json({ views: await viewsService.listViews(teamId) });
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

    await authenticateRequest(request, teamId);
    const body = await request.json();
    const view = await viewsService.createView(teamId, body);

    return Response.json(view, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

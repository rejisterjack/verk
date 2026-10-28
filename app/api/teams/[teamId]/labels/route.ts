import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as labelsService from "@/lib/services/labels";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId);

    return Response.json({ labels: await labelsService.listLabels(teamId) });
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

    await authenticateRequest(request, teamId, "MEMBER");
    const body = await request.json();
    const label = await labelsService.createLabel(teamId, body);

    return Response.json(label, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

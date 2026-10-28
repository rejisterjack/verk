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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId, "ADMIN");
    const body = (await request.json()) as { id?: string; name?: string; color?: string };

    if (!body.id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }
    const label = await labelsService.updateLabel(teamId, body.id, body);

    return Response.json(label);
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

    await authenticateRequest(request, teamId, "ADMIN");
    const body = (await request.json()) as { id?: string };

    if (!body.id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }
    await labelsService.deleteLabel(teamId, body.id);

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

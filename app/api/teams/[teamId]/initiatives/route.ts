import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import {
  createInitiative,
  listInitiatives,
  updateInitiative,
} from "@/lib/services/projects";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId, "GUEST");

    return Response.json({ initiatives: await listInitiatives(teamId) });
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

    return Response.json(await createInitiative(teamId, await request.json()), {
      status: 201,
    });
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

    await authenticateRequest(request, teamId, "MEMBER");
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      targetDate?: string | null;
      health?: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
    };

    if (!body.id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }
    const { id, ...patch } = body;

    return Response.json(await updateInitiative(teamId, id, patch));
  } catch (error) {
    return jsonError(error);
  }
}

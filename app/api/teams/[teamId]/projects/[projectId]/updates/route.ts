import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { addProjectUpdate, listProjectUpdates } from "@/lib/services/surface";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; projectId: string }> },
) {
  try {
    const { teamId, projectId } = await context.params;

    await authenticateRequest(request, teamId, "GUEST");

    return Response.json({
      updates: await listProjectUpdates(teamId, projectId),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; projectId: string }> },
) {
  try {
    const { teamId, projectId } = await context.params;
    const authResult = await authenticateRequest(request, teamId, "MEMBER");
    const body = await request.json();
    const update = await addProjectUpdate(
      teamId,
      projectId,
      authResult.user.id!,
      body,
    );

    return Response.json(update, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

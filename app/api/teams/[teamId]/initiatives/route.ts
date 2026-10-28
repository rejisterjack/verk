import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { listInitiatives } from "@/lib/services/projects";

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

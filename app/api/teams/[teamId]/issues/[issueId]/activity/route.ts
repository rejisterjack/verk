import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { listActivity } from "@/lib/services/surface";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;

    await authenticateRequest(request, teamId, "GUEST");

    return Response.json({ activity: await listActivity(teamId, issueId) });
  } catch (error) {
    return jsonError(error);
  }
}

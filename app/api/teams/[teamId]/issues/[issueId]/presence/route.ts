import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as presence from "@/lib/services/presence";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;
    const authResult = await authenticateRequest(request, teamId, "GUEST");
    const viewers = await presence.listPresence(issueId, authResult.user.id!);

    return Response.json({ viewers });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;
    const authResult = await authenticateRequest(request, teamId, "GUEST");

    await presence.beatPresence(issueId, authResult.user.id!);
    const viewers = await presence.listPresence(issueId, authResult.user.id!);

    return Response.json({ viewers });
  } catch (error) {
    return jsonError(error);
  }
}

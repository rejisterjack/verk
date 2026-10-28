import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { toggleReaction } from "@/lib/services/surface";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const authResult = await authenticateRequest(request, teamId, "GUEST");
    const body = (await request.json()) as { commentId?: string; emoji?: string };

    if (!body.commentId || !body.emoji) {
      return Response.json({ error: "commentId and emoji required" }, { status: 400 });
    }
    const result = await toggleReaction(
      teamId,
      body.commentId,
      authResult.user.id!,
      body.emoji,
    );

    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

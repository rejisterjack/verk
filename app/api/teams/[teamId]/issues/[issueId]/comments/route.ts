import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as commentsService from "@/lib/services/comments";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;

    await authenticateRequest(request, teamId);
    const comments = await commentsService.listComments(teamId, issueId);

    return Response.json({ comments });
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
    const authResult = await authenticateRequest(request, teamId);
    const body = await request.json();
    const comment = await commentsService.addComment(
      teamId,
      issueId,
      authResult.user.id!,
      body,
    );

    return Response.json(comment, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

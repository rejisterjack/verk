import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as commentsService from "@/lib/services/comments";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;

    await authenticateRequest(request, teamId, "GUEST");
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
    const authResult = await authenticateRequest(request, teamId, "GUEST");
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const authResult = await authenticateRequest(request, teamId, "GUEST");
    const body = (await request.json()) as { commentId?: string };

    if (!body.commentId) {
      return Response.json({ error: "commentId required" }, { status: 400 });
    }
    await commentsService.deleteComment(
      teamId,
      body.commentId,
      authResult.user.id!,
      authResult.role,
    );

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

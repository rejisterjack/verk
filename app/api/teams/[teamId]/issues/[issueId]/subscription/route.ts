import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import {
  ensureSubscribed,
  isSubscribed,
  unsubscribe,
} from "@/lib/services/notifications";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;
    const authResult = await authenticateRequest(request, teamId);
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, teamId },
    });

    if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);

    return Response.json({
      subscribed: await isSubscribed(issueId, authResult.user.id!),
    });
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

    await ensureSubscribed(issueId, authResult.user.id!);

    return Response.json({ subscribed: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;
    const authResult = await authenticateRequest(request, teamId);

    await unsubscribe(issueId, authResult.user.id!);

    return Response.json({ subscribed: false });
  } catch (error) {
    return jsonError(error);
  }
}

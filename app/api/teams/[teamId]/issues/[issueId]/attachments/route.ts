import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as attachmentsService from "@/lib/services/attachments";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;

    await authenticateRequest(request, teamId);
    const attachments = await attachmentsService.listAttachments(
      teamId,
      issueId,
    );

    return Response.json({ attachments });
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
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "file required" }, { status: 400 });
    }

    const attachment = await attachmentsService.createAttachment(
      teamId,
      issueId,
      authResult.user.id!,
      file,
    );

    return Response.json(attachment, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

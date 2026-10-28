import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as labelsService from "@/lib/services/labels";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;

    await authenticateRequest(request, teamId);
    const body = (await request.json()) as { labelIds?: string[] };

    await labelsService.setIssueLabels(teamId, issueId, body.labelIds ?? []);

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as draftsService from "@/lib/services/drafts";

/** Your own drafts in this team (drafts are private to their author). */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "MEMBER");

    return Response.json({
      drafts: await draftsService.listDrafts(teamId, auth.user.id!),
    });
  } catch (error) {
    return jsonError(error);
  }
}

/** Save a draft: `{ fields, draftId? }`. The offline queue uses this to sync drafts. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "MEMBER");
    const body = (await request.json()) as {
      fields?: unknown;
      draftId?: string | null;
    };
    const draft = await draftsService.saveDraft(
      teamId,
      auth.user.id!,
      body.fields ?? {},
      body.draftId ?? null,
    );

    return Response.json({ id: draft.id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

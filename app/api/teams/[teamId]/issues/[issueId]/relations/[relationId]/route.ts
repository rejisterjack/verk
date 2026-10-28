import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as relationsService from "@/lib/services/relations";

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ teamId: string; issueId: string; relationId: string }>;
  },
) {
  try {
    const { teamId, relationId } = await context.params;

    await authenticateRequest(request, teamId);
    await relationsService.removeRelation(teamId, relationId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}

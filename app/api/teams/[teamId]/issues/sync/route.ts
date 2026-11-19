import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as issuesService from "@/lib/services/issues";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    const auth = await authenticateRequest(request, teamId, "GUEST");
    const since = new URL(request.url).searchParams.get("since");

    if (!since) {
      return Response.json(
        { error: "since query param required", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    const result = await issuesService.syncIssues(teamId, since, auth.user.id);

    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { findSimilarIssues } from "@/lib/services/relations";

/** `GET ?title=...&exclude=<issueId>`: issues that look like the title, best match first. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId, "GUEST");
    const url = new URL(request.url);
    const similar = await findSimilarIssues(
      teamId,
      (url.searchParams.get("title") ?? "").slice(0, 200),
      { excludeId: url.searchParams.get("exclude") ?? undefined },
    );

    return Response.json({ similar });
  } catch (error) {
    return jsonError(error);
  }
}

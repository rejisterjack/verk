import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { MAX_QUERY_LENGTH } from "@/lib/search";
import { searchTeam } from "@/lib/services/search";

/**
 * `GET ?q=login assignee:me status:todo&limit=20`
 * Searches issues (title, description and comments), projects, initiatives, docs, customers,
 * cycles and people. Operators: assignee, creator, status, priority, label, project, cycle, type.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "GUEST");
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").slice(0, MAX_QUERY_LENGTH);
    const limit = Math.min(
      50,
      Math.max(1, Number(url.searchParams.get("limit")) || 20),
    );

    return Response.json(
      await searchTeam(teamId, auth.team.slug, q, {
        userId: auth.user.id,
        limit,
      }),
    );
  } catch (error) {
    return jsonError(error);
  }
}

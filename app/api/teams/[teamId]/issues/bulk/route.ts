import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { AuthError } from "@/lib/errors";
import * as issuesService from "@/lib/services/issues";

/**
 * Apply one action to many issues.
 * Body: `{ ids: string[], action?: "update" | "archive" | "restore" | "delete", patch?: {...} }`.
 * Always answers 200 with `{ ok: string[], failed: { id, error }[] }` so the client can show
 * which rows failed. A malformed body is a 400.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId);
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new AuthError("Body must be valid JSON", "BAD_REQUEST", 400);
    }
    const result = await issuesService.bulkUpdateIssues(
      teamId,
      body,
      auth.role,
      auth.user.id!,
    );

    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as issuesService from "@/lib/services/issues";

type Ctx = { params: Promise<{ teamId: string; issueId: string }> };

/** Archive an issue. It disappears from lists and boards but can be restored. */
export async function POST(request: NextRequest, context: Ctx) {
  try {
    const { teamId, issueId } = await context.params;
    const auth = await authenticateRequest(request, teamId);
    const issue = await issuesService.archiveIssue(
      teamId,
      issueId,
      auth.role,
      auth.user.id!,
    );

    return Response.json(issue);
  } catch (error) {
    return jsonError(error);
  }
}

/** Restore an archived issue. */
export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    const { teamId, issueId } = await context.params;
    const auth = await authenticateRequest(request, teamId);
    const issue = await issuesService.restoreIssue(
      teamId,
      issueId,
      auth.role,
      auth.user.id!,
    );

    return Response.json(issue);
  } catch (error) {
    return jsonError(error);
  }
}

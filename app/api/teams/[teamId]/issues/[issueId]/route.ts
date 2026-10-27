import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as issuesService from "@/lib/services/issues";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;

    await authenticateRequest(request, teamId);
    const issue = await issuesService.getIssueById(teamId, issueId);

    if (!issue) {
      return Response.json(
        { error: "Not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return Response.json(issue);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;
    const authResult = await authenticateRequest(request, teamId);
    const body = await request.json();

    if (
      body.status &&
      body.order !== undefined &&
      Object.keys(body).length <= 3
    ) {
      const issue = await issuesService.reorderIssue(teamId, {
        issueId,
        status: body.status,
        order: body.order,
      });

      return Response.json(issue);
    }
    const issue = await issuesService.updateIssue(
      teamId,
      issueId,
      body,
      authResult.role,
      authResult.user.id!,
    );

    return Response.json(issue);
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

    await issuesService.deleteIssue(
      teamId,
      issueId,
      authResult.role,
      authResult.user.id!,
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}

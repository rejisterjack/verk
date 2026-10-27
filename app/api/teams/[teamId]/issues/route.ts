import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as issuesService from "@/lib/services/issues";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId);
    const url = new URL(request.url);
    const status = url.searchParams.getAll("status");
    const result = await issuesService.listIssues(teamId, {
      status:
        status.length === 1 ? status[0] : status.length ? status : undefined,
      priority: url.searchParams.get("priority") ?? undefined,
      cycleId: url.searchParams.get("cycleId") ?? undefined,
      assigneeId: url.searchParams.get("assigneeId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      take: url.searchParams.get("take") ?? undefined,
    });

    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const authResult = await authenticateRequest(request, teamId);
    const body = await request.json();
    const issue = await issuesService.createIssue(
      teamId,
      authResult.user.id!,
      body,
    );

    return Response.json(issue, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

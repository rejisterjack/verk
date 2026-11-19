import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { AuthError } from "@/lib/errors";
import * as subIssues from "@/lib/services/sub-issues";

type Ctx = { params: Promise<{ teamId: string; issueId: string }> };

/** The parent, the live sub-issues and how many are finished. */
export async function GET(request: NextRequest, context: Ctx) {
  try {
    const { teamId, issueId } = await context.params;

    await authenticateRequest(request, teamId, "GUEST");

    return Response.json(await subIssues.listSubIssues(teamId, issueId));
  } catch (error) {
    return jsonError(error);
  }
}

/** Create a sub-issue. Body is a normal issue body; project, cycle and labels are inherited. */
export async function POST(request: NextRequest, context: Ctx) {
  try {
    const { teamId, issueId } = await context.params;
    const auth = await authenticateRequest(request, teamId);
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new AuthError("Body must be valid JSON", "BAD_REQUEST", 400);
    }
    const issue = await subIssues.createSubIssue(
      teamId,
      issueId,
      auth.user.id!,
      typeof body === "object" && body ? (body as Record<string, unknown>) : {},
    );

    return Response.json(issue, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

/** Move this issue under a new parent. Body: `{ parentId: string | null }` (null clears it). */
export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const { teamId, issueId } = await context.params;
    const auth = await authenticateRequest(request, teamId);
    const body = (await request.json().catch(() => null)) as {
      parentId?: string | null;
    } | null;

    if (!body || !("parentId" in body)) {
      throw new AuthError("parentId is required", "BAD_REQUEST", 400);
    }
    const issue = await subIssues.setParent(
      teamId,
      issueId,
      body.parentId ?? null,
      auth.role,
      auth.user.id!,
    );

    return Response.json(issue);
  } catch (error) {
    return jsonError(error);
  }
}

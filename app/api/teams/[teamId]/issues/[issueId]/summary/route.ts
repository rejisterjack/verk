import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { summarizeIssue } from "@/lib/ai";
import { rateLimitShared } from "@/lib/rate-limit";
import { canSeeIssue } from "@/lib/services/guest-scope";
import * as comments from "@/lib/services/comments";
import * as issues from "@/lib/services/issues";

/**
 * `GET`: a short summary of the issue and its discussion. Uses the configured model, or a plain
 * extract (first sentences plus the latest comment) when there is none. Read-only.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "GUEST");
    const limited = await rateLimitShared(
      `summary:${auth.user.id}`,
      20,
      60_000,
    );

    if (!limited.ok) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }
    const issue = await issues.getIssueById(teamId, issueId);

    if (!issue || !(await canSeeIssue(teamId, auth.user.id, issue))) {
      return Response.json(
        { error: "Not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    const thread = await comments.listComments(teamId, issueId);

    return Response.json(
      await summarizeIssue({
        title: issue.title,
        description: issue.description,
        comments: thread,
      }),
    );
  } catch (error) {
    return jsonError(error);
  }
}

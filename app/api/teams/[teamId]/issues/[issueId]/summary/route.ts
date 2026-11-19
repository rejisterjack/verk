import { NextRequest } from "next/server";

import { createHash } from "node:crypto";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { summarizeIssue } from "@/lib/ai";
import { prisma } from "@/lib/db";
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
    const hash = createHash("sha256")
      .update(`${issue.title}\n${issue.description}`)
      .digest("hex");

    if (issue.summaryText && issue.summaryHash === hash) {
      return Response.json({
        summary: issue.summaryText,
        source: "cache",
      });
    }
    const thread = await comments.listComments(teamId, issueId);
    const result = await summarizeIssue({
      title: issue.title,
      description: issue.description,
      comments: thread,
    });
    const source = result.source === "extract" ? "keyword" : result.source;

    await prisma.issue.update({
      where: { id: issue.id },
      data: { summaryText: result.summary, summaryHash: hash },
    });

    return Response.json({ summary: result.summary, source });
  } catch (error) {
    return jsonError(error);
  }
}

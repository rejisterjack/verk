import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { addIssueLink, listIssueLinks } from "@/lib/services/surface";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;

    await authenticateRequest(request, teamId, "GUEST");

    return Response.json({ links: await listIssueLinks(teamId, issueId) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;

    await authenticateRequest(request, teamId, "MEMBER");
    const link = await addIssueLink(teamId, issueId, await request.json());

    return Response.json(link, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

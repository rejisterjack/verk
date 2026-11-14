import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { listMatchingPulls } from "@/lib/github-pulls";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const authResult = await authenticateRequest(request, teamId, "GUEST");
    const branch = new URL(request.url).searchParams.get("branch") ?? "";
    const repo = authResult.team.githubRepo;

    if (!repo || !branch) return Response.json({ pulls: [] });
    const pulls = await listMatchingPulls(repo, branch);

    return Response.json({ pulls });
  } catch (error) {
    return jsonError(error);
  }
}

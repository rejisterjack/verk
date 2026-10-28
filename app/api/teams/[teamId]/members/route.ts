import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as membersService from "@/lib/services/members";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId);
    const members = await membersService.listMembers(teamId);

    return Response.json({ members });
  } catch (error) {
    return jsonError(error);
  }
}

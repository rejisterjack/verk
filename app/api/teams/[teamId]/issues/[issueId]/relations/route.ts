import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as relationsService from "@/lib/services/relations";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; issueId: string }> },
) {
  try {
    const { teamId, issueId } = await context.params;

    await authenticateRequest(request, teamId);
    const relations = await relationsService.listRelations(teamId, issueId);

    return Response.json({ relations });
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

    await authenticateRequest(request, teamId);
    const body = await request.json();
    const relation = await relationsService.addRelation(teamId, issueId, body);

    return Response.json(relation, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

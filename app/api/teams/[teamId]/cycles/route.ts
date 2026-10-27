import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as cyclesService from "@/lib/services/cycles";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId);
    const cycles = await cyclesService.listCycles(teamId);

    return Response.json({ cycles });
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
    const cycle = await cyclesService.createCycle(
      teamId,
      body,
      authResult.role,
    );

    return Response.json(cycle, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

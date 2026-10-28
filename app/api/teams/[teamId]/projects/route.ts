import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as projectsService from "@/lib/services/projects";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId);

    return Response.json({
      projects: await projectsService.listProjects(teamId),
    });
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

    await authenticateRequest(request, teamId, "MEMBER");
    const body = await request.json();
    const project = await projectsService.createProject(teamId, body);

    return Response.json(project, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as releases from "@/lib/services/releases";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId, "GUEST");
    const issueId = new URL(request.url).searchParams.get("issueId");
    const [list, pipelines, selected] = await Promise.all([
      releases.listReleases(teamId),
      releases.ensurePipelines(teamId),
      issueId ? releases.listIssueRelease(issueId) : Promise.resolve(null),
    ]);

    return Response.json({
      releases: list.map((release) => ({
        id: release.id,
        name: release.name,
        pipelineId: release.pipelineId,
        stageId: release.stageId,
      })),
      pipelines: pipelines.map((pipeline) => ({
        id: pipeline.id,
        name: pipeline.name,
        stages: pipeline.stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
        })),
      })),
      selectedId: selected?.releaseId ?? null,
      stageId: selected?.stageId ?? null,
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

    await authenticateRequest(request, teamId);
    const body = await request.json();
    const release = await releases.createRelease(teamId, body);

    return Response.json(release, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId);
    const body = (await request.json()) as {
      issueId?: string;
      releaseId?: string | null;
      stageId?: string | null;
    };

    if (!body.issueId) {
      return Response.json({ error: "issueId required" }, { status: 400 });
    }
    const selected = await releases.setIssueRelease(
      teamId,
      body.issueId,
      body.releaseId ?? null,
      body.stageId,
    );

    return Response.json({ selected });
  } catch (error) {
    return jsonError(error);
  }
}

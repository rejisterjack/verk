import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";

const releaseSchema = z.object({
  name: z.string().min(1).max(120),
  targetDate: z.coerce.date().nullable().optional(),
  pipelineId: z.string().min(1).optional(),
  stageId: z.string().min(1).optional(),
});

const DEFAULT_STAGES = ["Planned", "Started", "Released"];

/** Move `id` one slot inside `ids`. Returns the new order (unchanged at the edges). */
export function reorderIds(
  ids: string[],
  id: string,
  direction: "up" | "down",
): string[] {
  const index = ids.indexOf(id);

  if (index === -1) return ids;
  const swap = direction === "up" ? index - 1 : index + 1;

  if (swap < 0 || swap >= ids.length) return ids;
  const next = [...ids];

  [next[index], next[swap]] = [next[swap]!, next[index]!];

  return next;
}

function listPipelinesWithStages(teamId: string) {
  return prisma.pipeline.findMany({
    where: { teamId },
    include: { stages: { orderBy: [{ position: "asc" }, { name: "asc" }] } },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}

/** Every team has at least one pipeline, and every pipeline has at least one stage. */
export async function ensurePipelines(teamId: string) {
  let pipelines = await listPipelinesWithStages(teamId);

  if (!pipelines.length) {
    await prisma.pipeline.create({
      data: { teamId, name: "Default", position: 0 },
    });
    pipelines = await listPipelinesWithStages(teamId);
  }

  const bare = pipelines.filter((pipeline) => pipeline.stages.length === 0);

  if (bare.length) {
    for (const pipeline of bare) {
      await prisma.pipelineStage.createMany({
        data: DEFAULT_STAGES.map((name, position) => ({
          teamId,
          pipelineId: pipeline.id,
          name,
          position,
        })),
        skipDuplicates: true,
      });
    }
    pipelines = await listPipelinesWithStages(teamId);
  }

  return pipelines;
}

export async function createPipeline(teamId: string, name: string) {
  const label = name.trim();

  if (!label)
    throw new AuthError("Pipeline name is required", "BAD_REQUEST", 400);
  const last = await prisma.pipeline.aggregate({
    where: { teamId },
    _max: { position: true },
  });
  const pipeline = await prisma.pipeline.create({
    data: { teamId, name: label, position: (last._max.position ?? -1) + 1 },
  });

  await prisma.pipelineStage.createMany({
    data: DEFAULT_STAGES.map((stage, position) => ({
      teamId,
      pipelineId: pipeline.id,
      name: stage,
      position,
    })),
  });

  return pipeline;
}

export async function listStages(teamId: string, pipelineId: string) {
  return prisma.pipelineStage.findMany({
    where: { teamId, pipelineId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
}

async function findPipeline(teamId: string, pipelineId: string) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, teamId },
  });

  if (!pipeline) throw new AuthError("Pipeline not found", "NOT_FOUND", 404);

  return pipeline;
}

export async function addPipelineStage(
  teamId: string,
  pipelineId: string,
  name: string,
) {
  const label = name.trim();

  if (!label) throw new AuthError("Stage name is required", "BAD_REQUEST", 400);
  await findPipeline(teamId, pipelineId);
  const duplicate = await prisma.pipelineStage.findFirst({
    where: { pipelineId, name: label },
  });

  if (duplicate) {
    throw new AuthError(
      "A stage with that name already exists",
      "CONFLICT",
      409,
    );
  }
  const last = await prisma.pipelineStage.aggregate({
    where: { pipelineId },
    _max: { position: true },
  });

  return prisma.pipelineStage.create({
    data: {
      teamId,
      pipelineId,
      name: label,
      position: (last._max.position ?? -1) + 1,
    },
  });
}

async function findStage(teamId: string, stageId: string) {
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, teamId },
  });

  if (!stage) throw new AuthError("Stage not found", "NOT_FOUND", 404);

  return stage;
}

export async function renamePipelineStage(
  teamId: string,
  stageId: string,
  name: string,
) {
  const label = name.trim();

  if (!label) throw new AuthError("Stage name is required", "BAD_REQUEST", 400);
  const stage = await findStage(teamId, stageId);
  const duplicate = await prisma.pipelineStage.findFirst({
    where: { pipelineId: stage.pipelineId, name: label, NOT: { id: stageId } },
  });

  if (duplicate) {
    throw new AuthError(
      "A stage with that name already exists",
      "CONFLICT",
      409,
    );
  }

  return prisma.pipelineStage.update({
    where: { id: stageId },
    data: { name: label },
  });
}

/** Deleting a stage moves its issues and releases to the first remaining stage. */
export async function deletePipelineStage(teamId: string, stageId: string) {
  const stage = await findStage(teamId, stageId);
  const siblings = await prisma.pipelineStage.findMany({
    where: { pipelineId: stage.pipelineId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  if (siblings.length <= 1) {
    throw new AuthError(
      "A pipeline needs at least one stage",
      "BAD_REQUEST",
      400,
    );
  }
  const fallback = siblings.find((item) => item.id !== stageId)!;

  await prisma.$transaction([
    prisma.issueRelease.updateMany({
      where: { stageId },
      data: { stageId: fallback.id },
    }),
    prisma.release.updateMany({
      where: { stageId },
      data: { stageId: fallback.id },
    }),
    prisma.pipelineStage.delete({ where: { id: stageId } }),
    ...siblings
      .filter((item) => item.id !== stageId)
      .map((item, position) =>
        prisma.pipelineStage.update({
          where: { id: item.id },
          data: { position },
        }),
      ),
  ]);

  return { movedTo: fallback.id };
}

export async function movePipelineStage(
  teamId: string,
  stageId: string,
  direction: "up" | "down",
) {
  const stage = await findStage(teamId, stageId);
  const siblings = await prisma.pipelineStage.findMany({
    where: { pipelineId: stage.pipelineId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  const order = reorderIds(
    siblings.map((item) => item.id),
    stageId,
    direction,
  );

  await prisma.$transaction(
    order.map((id, position) =>
      prisma.pipelineStage.update({ where: { id }, data: { position } }),
    ),
  );
}

export async function listReleases(teamId: string) {
  await ensurePipelines(teamId);

  return prisma.release.findMany({
    where: { teamId },
    include: {
      pipeline: { select: { id: true, name: true } },
      stage: true,
      issues: {
        include: {
          issue: {
            select: { id: true, number: true, title: true, status: true },
          },
          stage: true,
        },
      },
    },
    orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }],
  });
}

export async function createRelease(teamId: string, input: unknown) {
  const data = releaseSchema.parse(input);
  const pipelines = await ensurePipelines(teamId);
  const pipeline = data.pipelineId
    ? pipelines.find((item) => item.id === data.pipelineId)
    : pipelines[0];

  if (!pipeline) throw new AuthError("Pipeline not found", "NOT_FOUND", 404);
  const stage = data.stageId
    ? pipeline.stages.find((item) => item.id === data.stageId)
    : pipeline.stages[0];

  if (!stage) {
    throw new AuthError(
      "Stage does not belong to that pipeline",
      "BAD_REQUEST",
      400,
    );
  }

  return prisma.release.create({
    data: {
      teamId,
      pipelineId: pipeline.id,
      stageId: stage.id,
      name: data.name,
      targetDate: data.targetDate ?? null,
    },
  });
}

export async function updateRelease(
  teamId: string,
  releaseId: string,
  input: unknown,
) {
  const existing = await prisma.release.findFirst({
    where: { id: releaseId, teamId },
  });

  if (!existing) throw new AuthError("Release not found", "NOT_FOUND", 404);
  const data = releaseSchema.partial().parse(input);

  if (data.stageId) {
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: data.stageId,
        teamId,
        pipelineId: existing.pipelineId,
      },
    });

    if (!stage) {
      throw new AuthError(
        "Stage does not belong to this release's pipeline",
        "BAD_REQUEST",
        400,
      );
    }
  }

  return prisma.release.update({
    where: { id: releaseId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.targetDate !== undefined ? { targetDate: data.targetDate } : {}),
      ...(data.stageId !== undefined ? { stageId: data.stageId } : {}),
    },
  });
}

export async function deleteRelease(teamId: string, releaseId: string) {
  const existing = await prisma.release.findFirst({
    where: { id: releaseId, teamId },
  });

  if (!existing) throw new AuthError("Release not found", "NOT_FOUND", 404);
  await prisma.release.delete({ where: { id: releaseId } });
}

export async function setIssueRelease(
  teamId: string,
  issueId: string,
  releaseId: string | null,
  stageId?: string | null,
) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);

  if (!releaseId) {
    await prisma.issueRelease.deleteMany({ where: { issueId } });

    return null;
  }

  const release = await prisma.release.findFirst({
    where: { id: releaseId, teamId },
  });

  if (!release) throw new AuthError("Release not found", "NOT_FOUND", 404);
  const stages = release.pipelineId
    ? await listStages(teamId, release.pipelineId)
    : [];
  let stage = stages[0] ?? null;

  if (stageId) {
    const requested = stages.find((item) => item.id === stageId);

    if (!requested) {
      throw new AuthError(
        "Stage does not belong to this release's pipeline",
        "BAD_REQUEST",
        400,
      );
    }
    stage = requested;
  }

  await prisma.$transaction([
    prisma.issueRelease.deleteMany({ where: { issueId } }),
    prisma.issueRelease.create({
      data: { issueId, releaseId, stageId: stage?.id ?? null },
    }),
  ]);

  return { releaseId, stageId: stage?.id ?? null };
}

export async function listIssueRelease(issueId: string) {
  return prisma.issueRelease.findFirst({
    where: { issueId },
    select: { releaseId: true, stageId: true },
  });
}

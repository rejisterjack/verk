-- Release pipelines: a release belongs to one pipeline and sits on one of its stages.
-- Replaces the hardcoded ReleaseStage enum with Release.stageId.

-- 1. Stage names are unique per pipeline, not per team.
DROP INDEX IF EXISTS "PipelineStage_teamId_name_key";

-- 2. Every team that has any pipeline data gets at least one pipeline.
INSERT INTO "Pipeline" ("id", "teamId", "name", "position", "createdAt")
SELECT md5(random()::text || t."id"), t."id", 'Default', 0, CURRENT_TIMESTAMP
FROM "Team" t
WHERE NOT EXISTS (SELECT 1 FROM "Pipeline" p WHERE p."teamId" = t."id")
  AND (
    EXISTS (SELECT 1 FROM "Release" r WHERE r."teamId" = t."id")
    OR EXISTS (SELECT 1 FROM "PipelineStage" s WHERE s."teamId" = t."id")
  );

-- 3. Orphan stages and releases move to the team's first pipeline.
UPDATE "PipelineStage" s
SET "pipelineId" = (
  SELECT p."id" FROM "Pipeline" p
  WHERE p."teamId" = s."teamId"
  ORDER BY p."position", p."createdAt"
  LIMIT 1
)
WHERE s."pipelineId" IS NULL;

UPDATE "Release" r
SET "pipelineId" = (
  SELECT p."id" FROM "Pipeline" p
  WHERE p."teamId" = r."teamId"
  ORDER BY p."position", p."createdAt"
  LIMIT 1
)
WHERE r."pipelineId" IS NULL;

-- 4. Any pipeline that has no stages gets the three defaults.
INSERT INTO "PipelineStage" ("id", "teamId", "pipelineId", "name", "position")
SELECT md5(random()::text || p."id" || n."name"), p."teamId", p."id", n."name", n."pos"
FROM "Pipeline" p
CROSS JOIN (VALUES ('Planned', 0), ('Started', 1), ('Released', 2)) AS n("name", "pos")
WHERE NOT EXISTS (SELECT 1 FROM "PipelineStage" s WHERE s."pipelineId" = p."id");

-- 5. New column, backfilled from the old enum by stage order inside the pipeline.
--    PLANNED  -> the first stage
--    STARTED  -> the second stage (or the last one if the pipeline has only one)
--    RELEASED -> the LAST stage, so a released release never appears to be back at the start,
--                whatever the pipeline length.
ALTER TABLE "Release" ADD COLUMN "stageId" TEXT;

UPDATE "Release" r
SET "stageId" = (
  SELECT ranked."id"
  FROM (
    SELECT s."id",
           row_number() OVER (ORDER BY s."position", s."name") - 1 AS idx,
           count(*)     OVER ()                                   AS total
    FROM "PipelineStage" s
    WHERE s."pipelineId" = r."pipelineId"
  ) ranked
  WHERE ranked.idx = CASE r."stage"::text
    WHEN 'PLANNED' THEN 0
    WHEN 'STARTED' THEN LEAST(1, ranked.total - 1)
    ELSE ranked.total - 1
  END
)
WHERE r."pipelineId" IS NOT NULL;

-- Safety net: anything still unmapped falls back to the first stage.
UPDATE "Release" r
SET "stageId" = (
  SELECT s."id" FROM "PipelineStage" s
  WHERE s."pipelineId" = r."pipelineId"
  ORDER BY s."position", s."name"
  LIMIT 1
)
WHERE r."stageId" IS NULL AND r."pipelineId" IS NOT NULL;

-- 6. Drop the enum column and type.
ALTER TABLE "Release" DROP COLUMN "stage";
DROP TYPE "ReleaseStage";

-- 7. Constraints and indexes.
CREATE UNIQUE INDEX "PipelineStage_pipelineId_name_key" ON "PipelineStage"("pipelineId", "name");
CREATE INDEX "Release_stageId_idx" ON "Release"("stageId");
ALTER TABLE "Release"
  ADD CONSTRAINT "Release_stageId_fkey"
  FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
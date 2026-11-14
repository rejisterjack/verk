-- AlterTable
ALTER TABLE "StatusRule" ADD COLUMN "setPriority" "Priority";
ALTER TABLE "StatusRule" ADD COLUMN "setCycleId" TEXT;
ALTER TABLE "StatusRule" ADD COLUMN "commentBody" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WorkflowStatus" ADD COLUMN "statusRuleId" TEXT;
ALTER TABLE "IssueLink" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IssueTemplate" ADD COLUMN "labelId" TEXT;

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Pipeline" ("id", "teamId", "name", "position", "createdAt")
SELECT md5(random()::text || "id"), "id", 'Default', 0, CURRENT_TIMESTAMP FROM "Team";

ALTER TABLE "PipelineStage" ADD COLUMN "pipelineId" TEXT;
UPDATE "PipelineStage" AS stage
SET "pipelineId" = pipeline."id"
FROM "Pipeline" AS pipeline
WHERE pipeline."teamId" = stage."teamId";

ALTER TABLE "Release" ADD COLUMN "pipelineId" TEXT;
UPDATE "Release" AS release
SET "pipelineId" = pipeline."id"
FROM "Pipeline" AS pipeline
WHERE pipeline."teamId" = release."teamId";

CREATE INDEX "Pipeline_teamId_idx" ON "Pipeline"("teamId");
CREATE INDEX "PipelineStage_pipelineId_idx" ON "PipelineStage"("pipelineId");
CREATE INDEX "Release_pipelineId_idx" ON "Release"("pipelineId");
CREATE INDEX "StatusRule_setCycleId_idx" ON "StatusRule"("setCycleId");
CREATE INDEX "WorkflowStatus_statusRuleId_idx" ON "WorkflowStatus"("statusRuleId");
CREATE INDEX "IssueTemplate_labelId_idx" ON "IssueTemplate"("labelId");

ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Release" ADD CONSTRAINT "Release_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StatusRule" ADD CONSTRAINT "StatusRule_setCycleId_fkey" FOREIGN KEY ("setCycleId") REFERENCES "Cycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowStatus" ADD CONSTRAINT "WorkflowStatus_statusRuleId_fkey" FOREIGN KEY ("statusRuleId") REFERENCES "StatusRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IssueTemplate" ADD CONSTRAINT "IssueTemplate_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE SET NULL ON UPDATE CASCADE;

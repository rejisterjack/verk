-- AlterTable
ALTER TABLE "Team" ADD COLUMN "githubRepo" TEXT;
ALTER TABLE "Team" ADD COLUMN "slaHours" JSONB;

-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Initiative_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "initiativeId" TEXT;
ALTER TABLE "Issue" ADD COLUMN "workflowStatusId" TEXT;

-- CreateIndex
CREATE INDEX "Initiative_teamId_idx" ON "Initiative"("teamId");
CREATE INDEX "Project_initiativeId_idx" ON "Project"("initiativeId");
CREATE INDEX "Issue_workflowStatusId_idx" ON "Issue"("workflowStatusId");

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_workflowStatusId_fkey" FOREIGN KEY ("workflowStatusId") REFERENCES "WorkflowStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill workflow status from the fixed enum
UPDATE "Issue" AS i
SET "workflowStatusId" = w.id
FROM "WorkflowStatus" AS w
WHERE w."teamId" = i."teamId"
  AND w.key = CASE i.status
    WHEN 'BACKLOG' THEN 'backlog'
    WHEN 'TODO' THEN 'todo'
    WHEN 'IN_PROGRESS' THEN 'in_progress'
    WHEN 'DONE' THEN 'done'
    WHEN 'CANCELLED' THEN 'canceled'
  END;

-- Issue archive: archived issues are hidden from lists, boards and counts but keep their id,
-- number, comments and history, and can be restored.
ALTER TABLE "Issue" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Issue" ADD COLUMN "archivedById" TEXT;

CREATE INDEX "Issue_teamId_archivedAt_idx" ON "Issue"("teamId", "archivedAt");
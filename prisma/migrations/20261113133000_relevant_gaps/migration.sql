-- AlterTable
ALTER TABLE "Initiative" ADD COLUMN "parentId" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Document" ADD COLUMN "initiativeId" TEXT;

-- AlterTable
ALTER TABLE "IssueRelease" ADD COLUMN "stageId" TEXT;

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedInsight" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filterJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusRule" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "fromStatus" "IssueStatus" NOT NULL,
    "setAssigneeId" TEXT,
    "addLabelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuePresence" (
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuePresence_pkey" PRIMARY KEY ("issueId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_teamId_name_key" ON "PipelineStage"("teamId", "name");
CREATE INDEX "PipelineStage_teamId_idx" ON "PipelineStage"("teamId");
CREATE INDEX "Initiative_parentId_idx" ON "Initiative"("parentId");
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");
CREATE INDEX "Document_initiativeId_idx" ON "Document"("initiativeId");
CREATE INDEX "IssueRelease_stageId_idx" ON "IssueRelease"("stageId");
CREATE INDEX "SavedInsight_teamId_idx" ON "SavedInsight"("teamId");
CREATE INDEX "StatusRule_teamId_idx" ON "StatusRule"("teamId");
CREATE INDEX "IssuePresence_seenAt_idx" ON "IssuePresence"("seenAt");

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueRelease" ADD CONSTRAINT "IssueRelease_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SavedInsight" ADD CONSTRAINT "SavedInsight_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StatusRule" ADD CONSTRAINT "StatusRule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StatusRule" ADD CONSTRAINT "StatusRule_setAssigneeId_fkey" FOREIGN KEY ("setAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StatusRule" ADD CONSTRAINT "StatusRule_addLabelId_fkey" FOREIGN KEY ("addLabelId") REFERENCES "Label"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IssuePresence" ADD CONSTRAINT "IssuePresence_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssuePresence" ADD CONSTRAINT "IssuePresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "parentId" TEXT;

-- AlterTable
ALTER TABLE "Cycle" ADD COLUMN "capacityPoints" INTEGER;

-- CreateEnum
CREATE TYPE "ReleaseStage" AS ENUM ('PLANNED', 'STARTED', 'RELEASED');

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "stage" "ReleaseStage" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueRelease" (
    "issueId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,

    CONSTRAINT "IssueRelease_pkey" PRIMARY KEY ("issueId","releaseId")
);

-- CreateTable
CREATE TABLE "TriageRule" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "titleContains" TEXT NOT NULL DEFAULT '',
    "priority" "Priority",
    "labelId" TEXT,
    "setAssigneeId" TEXT,
    "setStatus" "IssueStatus",
    "addLabelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriageRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentComment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Release_teamId_idx" ON "Release"("teamId");

-- CreateIndex
CREATE INDEX "IssueRelease_releaseId_idx" ON "IssueRelease"("releaseId");

-- CreateIndex
CREATE INDEX "TriageRule_teamId_idx" ON "TriageRule"("teamId");

-- CreateIndex
CREATE INDEX "DocumentComment_documentId_idx" ON "DocumentComment"("documentId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueRelease" ADD CONSTRAINT "IssueRelease_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueRelease" ADD CONSTRAINT "IssueRelease_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageRule" ADD CONSTRAINT "TriageRule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageRule" ADD CONSTRAINT "TriageRule_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageRule" ADD CONSTRAINT "TriageRule_addLabelId_fkey" FOREIGN KEY ("addLabelId") REFERENCES "Label"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageRule" ADD CONSTRAINT "TriageRule_setAssigneeId_fkey" FOREIGN KEY ("setAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

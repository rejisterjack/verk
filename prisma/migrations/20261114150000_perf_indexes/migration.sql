-- DropIndex
DROP INDEX "Comment_issueId_idx";

-- DropIndex
DROP INDEX "IssueActivity_issueId_idx";

-- CreateIndex
CREATE INDEX "Comment_issueId_createdAt_idx" ON "Comment"("issueId", "createdAt");

-- CreateIndex
CREATE INDEX "Issue_teamId_assigneeId_status_idx" ON "Issue"("teamId", "assigneeId", "status");

-- CreateIndex
CREATE INDEX "Issue_teamId_projectId_status_idx" ON "Issue"("teamId", "projectId", "status");

-- CreateIndex
CREATE INDEX "IssueActivity_issueId_createdAt_idx" ON "IssueActivity"("issueId", "createdAt");


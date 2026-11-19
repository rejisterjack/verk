-- Planned start, restricted visibility, and stored summaries.
ALTER TABLE "Issue" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "Issue" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'TEAM';
ALTER TABLE "Issue" ADD COLUMN "summaryText" TEXT;
ALTER TABLE "Issue" ADD COLUMN "summaryHash" TEXT;

-- Directory id, triage auto-apply, and SCIM group roles.
ALTER TABLE "User" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "User_externalId_key" ON "User"("externalId");
ALTER TABLE "Team" ADD COLUMN "triageAutoApply" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Team" ADD COLUMN "scimGroupRoles" JSONB;

-- Required fields before a workflow status can be entered.
ALTER TABLE "WorkflowStatus" ADD COLUMN "requiredFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Latest check and deployment reported by GitHub or GitLab.
ALTER TABLE "IssueLink" ADD COLUMN "checkName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IssueLink" ADD COLUMN "checkStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IssueLink" ADD COLUMN "checkUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IssueLink" ADD COLUMN "deployEnvironment" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IssueLink" ADD COLUMN "deployStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IssueLink" ADD COLUMN "deployUrl" TEXT NOT NULL DEFAULT '';

CREATE TABLE "IssueReader" (
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "IssueReader_pkey" PRIMARY KEY ("issueId","userId")
);
CREATE INDEX "IssueReader_userId_idx" ON "IssueReader"("userId");
ALTER TABLE "IssueReader" ADD CONSTRAINT "IssueReader_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueReader" ADD CONSTRAINT "IssueReader_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CycleCapacity" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "daysOff" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CycleCapacity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CycleCapacity_cycleId_userId_key" ON "CycleCapacity"("cycleId", "userId");
CREATE INDEX "CycleCapacity_userId_idx" ON "CycleCapacity"("userId");
ALTER TABLE "CycleCapacity" ADD CONSTRAINT "CycleCapacity_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CycleCapacity" ADD CONSTRAINT "CycleCapacity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectTeam" (
    "projectId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    CONSTRAINT "ProjectTeam_pkey" PRIMARY KEY ("projectId","teamId")
);
CREATE INDEX "ProjectTeam_teamId_idx" ON "ProjectTeam"("teamId");
ALTER TABLE "ProjectTeam" ADD CONSTRAINT "ProjectTeam_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTeam" ADD CONSTRAINT "ProjectTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "KeyResult" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "KeyResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "KeyResult_initiativeId_idx" ON "KeyResult"("initiativeId");
ALTER TABLE "KeyResult" ADD CONSTRAINT "KeyResult_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Dashboard" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Dashboard_teamId_idx" ON "Dashboard"("teamId");
CREATE INDEX "Dashboard_ownerId_idx" ON "Dashboard"("ownerId");
ALTER TABLE "Dashboard" ADD CONSTRAINT "Dashboard_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Dashboard" ADD CONSTRAINT "Dashboard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DashboardWidget" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "insightReportId" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DashboardWidget_dashboardId_idx" ON "DashboardWidget"("dashboardId");
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AskForm" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "heading" TEXT NOT NULL DEFAULT '',
    "fields" JSONB NOT NULL,
    "showIf" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AskForm_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AskForm_tokenHash_key" ON "AskForm"("tokenHash");
CREATE INDEX "AskForm_teamId_idx" ON "AskForm"("teamId");
ALTER TABLE "AskForm" ADD CONSTRAINT "AskForm_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

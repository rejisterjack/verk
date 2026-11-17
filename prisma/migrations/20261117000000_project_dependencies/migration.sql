-- Project dependencies ("A depends on B") and customer value (tier + annual revenue).

CREATE TABLE "ProjectDependency" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "dependsOnId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProjectDependency_pkey" PRIMARY KEY ("id"),
  -- A project cannot wait on itself. Longer cycles are refused in application code.
  CONSTRAINT "ProjectDependency_not_self" CHECK ("projectId" <> "dependsOnId")
);

CREATE UNIQUE INDEX "ProjectDependency_projectId_dependsOnId_key"
  ON "ProjectDependency"("projectId", "dependsOnId");
CREATE INDEX "ProjectDependency_teamId_idx" ON "ProjectDependency"("teamId");
CREATE INDEX "ProjectDependency_dependsOnId_idx" ON "ProjectDependency"("dependsOnId");

ALTER TABLE "ProjectDependency"
  ADD CONSTRAINT "ProjectDependency_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDependency"
  ADD CONSTRAINT "ProjectDependency_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDependency"
  ADD CONSTRAINT "ProjectDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Customer"
  ADD COLUMN "tier" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "arr" INTEGER NOT NULL DEFAULT 0;
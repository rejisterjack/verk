-- Team options: finish a parent when its last open sub-issue finishes, and copy project,
-- cycle and labels from the parent onto new sub-issues.
ALTER TABLE "Team" ADD COLUMN "autoCloseParent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Team" ADD COLUMN "subIssueInherit" BOOLEAN NOT NULL DEFAULT true;

-- Native sub-issues: an issue has at most one parent. Until now a sub-issue was a CHILD
-- relation row; `Issue.parentId` becomes the single source of truth.
ALTER TABLE "Issue" ADD COLUMN "parentId" TEXT;

CREATE INDEX "Issue_parentId_idx" ON "Issue"("parentId");

ALTER TABLE "Issue"
  ADD CONSTRAINT "Issue_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Issue"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill from the old relations. `CHILD` rows run parent -> child. If an issue somehow had
-- several parents, the oldest relation wins.
UPDATE "Issue" AS i
SET "parentId" = r."fromIssueId"
FROM (
  SELECT DISTINCT ON ("toIssueId") "toIssueId", "fromIssueId"
  FROM "IssueRelation"
  WHERE "type" = 'CHILD'
  ORDER BY "toIssueId", "createdAt"
) AS r
WHERE i."id" = r."toIssueId" AND i."id" <> r."fromIssueId";

-- Old data could contain a two-issue loop (A child of B and B child of A). Break it.
UPDATE "Issue" AS a
SET "parentId" = NULL
FROM "Issue" AS b
WHERE a."parentId" = b."id" AND b."parentId" = a."id";

-- The relation rows are redundant now.
DELETE FROM "IssueRelation" WHERE "type" IN ('PARENT', 'CHILD');
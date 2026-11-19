-- Real lifecycle timestamps (so charts do not rely on `updatedAt`) and per-day cycle snapshots.
ALTER TABLE "Issue" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "Issue" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "Issue" ADD COLUMN "canceledAt" TIMESTAMP(3);

CREATE INDEX "Issue_cycleId_completedAt_idx" ON "Issue"("cycleId", "completedAt");

CREATE TABLE "CycleSnapshot" (
  "cycleId" TEXT NOT NULL,
  "day" TIMESTAMP(3) NOT NULL,
  "scopePoints" INTEGER NOT NULL DEFAULT 0,
  "scopeIssues" INTEGER NOT NULL DEFAULT 0,
  "donePoints" INTEGER NOT NULL DEFAULT 0,
  "doneIssues" INTEGER NOT NULL DEFAULT 0,
  "startedIssues" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "CycleSnapshot_pkey" PRIMARY KEY ("cycleId", "day")
);

ALTER TABLE "CycleSnapshot"
  ADD CONSTRAINT "CycleSnapshot_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from the activity log: the last time each issue's status changed to a state.
UPDATE "Issue" AS i
SET "completedAt" = a."at"
FROM (
  SELECT "issueId", MAX("createdAt") AS "at"
  FROM "IssueActivity"
  WHERE "field" = 'status' AND "toValue" = 'DONE'
  GROUP BY "issueId"
) AS a
WHERE i."id" = a."issueId" AND i."status" = 'DONE';

UPDATE "Issue" AS i
SET "canceledAt" = a."at"
FROM (
  SELECT "issueId", MAX("createdAt") AS "at"
  FROM "IssueActivity"
  WHERE "field" = 'status' AND "toValue" = 'CANCELLED'
  GROUP BY "issueId"
) AS a
WHERE i."id" = a."issueId" AND i."status" = 'CANCELLED';

UPDATE "Issue" AS i
SET "startedAt" = a."at"
FROM (
  SELECT "issueId", MIN("createdAt") AS "at"
  FROM "IssueActivity"
  WHERE "field" = 'status' AND "toValue" = 'IN_PROGRESS'
  GROUP BY "issueId"
) AS a
WHERE i."id" = a."issueId" AND i."status" IN ('IN_PROGRESS', 'DONE');

-- Done / cancelled issues with no history: fall back to the last time they changed.
UPDATE "Issue" SET "completedAt" = "updatedAt" WHERE "status" = 'DONE' AND "completedAt" IS NULL;
UPDATE "Issue" SET "canceledAt" = "updatedAt" WHERE "status" = 'CANCELLED' AND "canceledAt" IS NULL;
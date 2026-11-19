-- The previous migration stored visibility as text. Prisma expects the enum.
CREATE TYPE "IssueVisibility" AS ENUM ('TEAM', 'RESTRICTED');

ALTER TABLE "Issue" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "Issue"
  ALTER COLUMN "visibility" TYPE "IssueVisibility"
  USING "visibility"::"IssueVisibility";
ALTER TABLE "Issue" ALTER COLUMN "visibility" SET DEFAULT 'TEAM';

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Team" ADD COLUMN "parentId" TEXT;

-- AlterTable
ALTER TABLE "SavedView" ADD COLUMN "shared" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SavedView" ADD COLUMN "ownerId" TEXT;

-- AlterTable
ALTER TABLE "IssueLink" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Team_parentId_idx" ON "Team"("parentId");
CREATE INDEX "SavedView_ownerId_idx" ON "SavedView"("ownerId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Issue_teamId_updatedAt_idx" ON "Issue"("teamId", "updatedAt");

-- CreateTable
CREATE TABLE "MutationReceipt" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "clientMutationId" TEXT NOT NULL,
    "issueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutationReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueDeletion" (
    "issueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueDeletion_pkey" PRIMARY KEY ("issueId")
);

-- CreateIndex
CREATE INDEX "MutationReceipt_teamId_idx" ON "MutationReceipt"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "MutationReceipt_teamId_clientMutationId_key" ON "MutationReceipt"("teamId", "clientMutationId");

-- CreateIndex
CREATE INDEX "IssueDeletion_teamId_deletedAt_idx" ON "IssueDeletion"("teamId", "deletedAt");

-- AddForeignKey
ALTER TABLE "MutationReceipt" ADD CONSTRAINT "MutationReceipt_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueDeletion" ADD CONSTRAINT "IssueDeletion_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

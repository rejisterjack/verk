-- CreateTable
CREATE TABLE "InsightReport" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "measure" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "filter" TEXT NOT NULL DEFAULT '',
    "shared" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsightReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsightReport_teamId_shared_idx" ON "InsightReport"("teamId", "shared");

-- CreateIndex
CREATE INDEX "InsightReport_ownerId_idx" ON "InsightReport"("ownerId");

-- AddForeignKey
ALTER TABLE "InsightReport" ADD CONSTRAINT "InsightReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightReport" ADD CONSTRAINT "InsightReport_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "AgentClaim" (
    "issueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "agentUserId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'active',
    "leaseExpiresAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "resultUrl" TEXT NOT NULL DEFAULT '',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentClaim_pkey" PRIMARY KEY ("issueId")
);

-- CreateIndex
CREATE INDEX "AgentClaim_agentUserId_state_idx" ON "AgentClaim"("agentUserId", "state");

-- CreateIndex
CREATE INDEX "AgentClaim_teamId_state_idx" ON "AgentClaim"("teamId", "state");

-- AddForeignKey
ALTER TABLE "AgentClaim" ADD CONSTRAINT "AgentClaim_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentClaim" ADD CONSTRAINT "AgentClaim_agentUserId_fkey" FOREIGN KEY ("agentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


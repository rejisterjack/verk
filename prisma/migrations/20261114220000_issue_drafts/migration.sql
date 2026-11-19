-- Private unfinished issues.
CREATE TABLE "IssueDraft" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IssueDraft_teamId_userId_updatedAt_idx" ON "IssueDraft"("teamId", "userId", "updatedAt");

ALTER TABLE "IssueDraft" ADD CONSTRAINT "IssueDraft_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueDraft" ADD CONSTRAINT "IssueDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

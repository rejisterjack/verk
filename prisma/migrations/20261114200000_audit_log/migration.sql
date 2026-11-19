-- Audit trail for settings, members, API keys and webhooks.
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT '',
    "targetId" TEXT,
    "summary" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_teamId_createdAt_idx" ON "AuditLog"("teamId", "createdAt");
CREATE INDEX "AuditLog_teamId_action_idx" ON "AuditLog"("teamId", "action");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
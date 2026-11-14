-- API keys get their own role so they no longer always act as ADMIN.
-- Existing keys are backfilled to ADMIN (their previous behaviour) so nothing breaks;
-- keys created from now on default to MEMBER.
ALTER TABLE "ApiKey" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "ApiKey" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
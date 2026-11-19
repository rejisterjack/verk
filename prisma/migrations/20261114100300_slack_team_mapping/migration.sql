-- Map a Slack workspace (and optionally one channel) to a Verk team.
-- A NULL channel means "any channel in that Slack workspace".
ALTER TABLE "Team" ADD COLUMN "slackTeamId" TEXT;
ALTER TABLE "Team" ADD COLUMN "slackChannelId" TEXT;

CREATE UNIQUE INDEX "Team_slackTeamId_slackChannelId_key" ON "Team"("slackTeamId", "slackChannelId");
CREATE INDEX "Team_slackTeamId_idx" ON "Team"("slackTeamId");
-- OAuth apps (authorization code + PKCE).
ALTER TABLE "ApiKey" ADD COLUMN "oauthAppId" TEXT;
CREATE INDEX "ApiKey_oauthAppId_idx" ON "ApiKey"("oauthAppId");

CREATE TABLE "OAuthApp" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT,
    "redirectUris" TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthApp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthApp_clientId_key" ON "OAuthApp"("clientId");
CREATE INDEX "OAuthApp_teamId_idx" ON "OAuthApp"("teamId");

CREATE TABLE "OAuthCode" (
    "codeHash" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthCode_pkey" PRIMARY KEY ("codeHash")
);

CREATE INDEX "OAuthCode_expiresAt_idx" ON "OAuthCode"("expiresAt");

ALTER TABLE "OAuthApp" ADD CONSTRAINT "OAuthApp_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthCode" ADD CONSTRAINT "OAuthCode_appId_fkey" FOREIGN KEY ("appId") REFERENCES "OAuthApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_oauthAppId_fkey" FOREIGN KEY ("oauthAppId") REFERENCES "OAuthApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

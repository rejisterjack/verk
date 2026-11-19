-- SAML assertion ids and request ids already seen, so a captured response can't be replayed.
CREATE TABLE "SamlSeen" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SamlSeen_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "SamlSeen_expiresAt_idx" ON "SamlSeen"("expiresAt");

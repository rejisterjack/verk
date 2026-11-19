-- Public ask links.
CREATE TABLE "AskLink" (
    "teamId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "heading" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AskLink_pkey" PRIMARY KEY ("teamId")
);

CREATE UNIQUE INDEX "AskLink_tokenHash_key" ON "AskLink"("tokenHash");

ALTER TABLE "AskLink" ADD CONSTRAINT "AskLink_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TOTP two-factor sign-in.
CREATE TABLE "TwoFactor" (
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "recoveryHashes" TEXT[],
    "lastStep" INTEGER NOT NULL DEFAULT 0,
    "enabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactor_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "TwoFactor" ADD CONSTRAINT "TwoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

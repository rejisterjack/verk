-- Guests can be limited to specific projects.
ALTER TABLE "Membership" ADD COLUMN "guestProjectIds" TEXT[];

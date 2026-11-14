-- Per-team estimate scales. The Estimate enum keeps every value it had, plus 4 and 16 so the
-- exponential (1, 2, 4, 8, 16) and linear (1..5) scales are complete. Existing estimates are
-- untouched; a team's scale only decides which values the forms offer.
ALTER TYPE "Estimate" ADD VALUE 'FOUR';
ALTER TYPE "Estimate" ADD VALUE 'SIXTEEN';

ALTER TABLE "Team" ADD COLUMN "estimateScale" TEXT NOT NULL DEFAULT 'fibonacci';
-- Per-user favorites (starred issues, projects, cycles, docs, views, initiatives).
CREATE TABLE "Favorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "folder" TEXT,
  "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Favorite_userId_teamId_kind_targetId_key"
  ON "Favorite"("userId", "teamId", "kind", "targetId");
CREATE INDEX "Favorite_userId_teamId_position_idx"
  ON "Favorite"("userId", "teamId", "position");

ALTER TABLE "Favorite"
  ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite"
  ADD CONSTRAINT "Favorite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing pinned views become favorites for their owner so the sidebar looks the same.
INSERT INTO "Favorite" ("id", "userId", "teamId", "kind", "targetId", "position")
SELECT
  'fav_' || "id",
  "ownerId",
  "teamId",
  'view',
  "id",
  EXTRACT(EPOCH FROM "createdAt")
FROM "SavedView"
WHERE "pinned" = true AND "ownerId" IS NOT NULL
ON CONFLICT DO NOTHING;
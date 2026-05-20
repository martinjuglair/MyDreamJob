-- Add level-based reward fields
ALTER TABLE "RewardPrize" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "RewardPrize" ADD COLUMN "unlockedAt" TIMESTAMP(3);
ALTER TABLE "RewardPrize" ADD COLUMN "claimed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RewardPrize" ADD COLUMN "claimedAt" TIMESTAMP(3);

-- Auto-assign existing prizes to incremental levels (oldest = lowest level)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM "RewardPrize"
)
UPDATE "RewardPrize"
SET "level" = (numbered.rn + 1)::int
FROM numbered
WHERE "RewardPrize".id = numbered.id;

-- Drop the legacy weight column
ALTER TABLE "RewardPrize" DROP COLUMN "weight";

-- Index for fast level lookups
CREATE INDEX "RewardPrize_level_idx" ON "RewardPrize"("level");

import { prisma } from "@/lib/db";

/**
 * Returns the list of prizes whose `level` is now reached but
 * which haven't been marked unlocked yet. Sets `unlockedAt` on them.
 * Returns the newly-unlocked prizes (for UI celebration).
 */
export async function unlockPrizesForLevel(currentLevel: number) {
  // Find active prizes at or below current level that haven't been unlocked
  const toUnlock = await prisma.rewardPrize.findMany({
    where: {
      active: true,
      level: { lte: currentLevel },
      unlockedAt: null,
    },
    orderBy: { level: "asc" },
  });

  if (toUnlock.length === 0) return [];

  await prisma.rewardPrize.updateMany({
    where: { id: { in: toUnlock.map((p) => p.id) } },
    data: { unlockedAt: new Date() },
  });

  // Return enriched objects with the new unlock timestamp
  const now = new Date();
  return toUnlock.map((p) => ({ ...p, unlockedAt: now }));
}

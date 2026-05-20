/**
 * Reset script — wipes jobs, XP, and prize unlocks, but keeps:
 *   - CV
 *   - Reward prize configuration (label, emoji, level…)
 *
 * Run with: node --import tsx --env-file=.env scripts/reset.ts
 */
import { prisma } from "../src/lib/db";

async function reset() {
  console.log("Resetting ALL test data (incl. CV)...");

  const [jobs, xp, spins, cvs] = await Promise.all([
    prisma.job.deleteMany(),
    prisma.xpEvent.deleteMany(),
    prisma.spinResult.deleteMany(),
    prisma.cV.deleteMany(),
  ]);

  const prizes = await prisma.rewardPrize.updateMany({
    data: { unlockedAt: null, claimed: false, claimedAt: null },
  });

  console.log(`✓ Deleted ${jobs.count} jobs`);
  console.log(`✓ Deleted ${xp.count} XP events`);
  console.log(`✓ Deleted ${spins.count} spins`);
  console.log(`✓ Deleted ${cvs.count} CVs`);
  console.log(`✓ Reset ${prizes.count} prize unlock states`);

  const remainingPrizes = await prisma.rewardPrize.findMany({
    orderBy: { level: "asc" },
    select: { label: true, level: true, emoji: true },
  });
  console.log(`\n→ ${remainingPrizes.length} prize(s) kept:`);
  for (const p of remainingPrizes) {
    console.log(`   Niveau ${p.level} · ${p.emoji || "🎁"} ${p.label}`);
  }
}

reset()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

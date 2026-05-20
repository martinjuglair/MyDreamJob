/**
 * Reset script — wipes jobs, XP, and prize unlocks, but keeps:
 *   - CV
 *   - Reward prize configuration (label, emoji, level…)
 *
 * Run with: node --import tsx --env-file=.env scripts/reset.ts
 */
import { prisma } from "../src/lib/db";

async function reset() {
  console.log("Resetting test data...");

  const [jobs, xp, spins] = await Promise.all([
    prisma.job.deleteMany(),
    prisma.xpEvent.deleteMany(),
    prisma.spinResult.deleteMany(),
  ]);

  const prizes = await prisma.rewardPrize.updateMany({
    data: { unlockedAt: null, claimed: false, claimedAt: null },
  });

  console.log(`✓ Deleted ${jobs.count} jobs`);
  console.log(`✓ Deleted ${xp.count} XP events`);
  console.log(`✓ Deleted ${spins.count} spins`);
  console.log(`✓ Reset ${prizes.count} prize unlock states`);

  // Final state
  const remaining = await Promise.all([
    prisma.cV.count(),
    prisma.rewardPrize.findMany({
      orderBy: { level: "asc" },
      select: { label: true, level: true },
    }),
  ]);
  console.log(`\n→ ${remaining[0]} CV(s) kept`);
  console.log(`→ ${remaining[1].length} prize(s) kept:`);
  for (const p of remaining[1]) {
    console.log(`   Niveau ${p.level} · ${p.label}`);
  }
}

reset()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

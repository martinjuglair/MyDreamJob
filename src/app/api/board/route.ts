import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { awardStatusXp, getTotalXp, levelFromXp } from "@/lib/xp";
import { unlockPrizesForLevel } from "@/lib/rewards";

export async function PATCH(request: NextRequest) {
  const { jobId, status } = await request.json();

  const updateData: Record<string, unknown> = {
    status,
    statusUpdatedAt: new Date(),
  };

  if (status === "APPLIED") {
    updateData.appliedAt = new Date();
  }

  // Snapshot BEFORE: total XP & level
  const totalBefore = await getTotalXp();
  const levelBefore = levelFromXp(totalBefore).level;

  const job = await prisma.job.update({
    where: { id: jobId },
    data: updateData,
  });

  // Award XP for the new status (idempotent: no farming)
  const xpGained = await awardStatusXp(
    jobId,
    status,
    `${job.role} chez ${job.company}`
  );

  const totalAfter = totalBefore + xpGained;
  const levelAfter = levelFromXp(totalAfter).level;
  const leveledUp = levelAfter > levelBefore;

  // If we leveled up, check for newly-unlocked prizes
  const newlyUnlockedPrizes = leveledUp ? await unlockPrizesForLevel(levelAfter) : [];

  return NextResponse.json({
    ...job,
    xpGained,
    totalXp: totalAfter,
    level: levelAfter,
    leveledUp,
    newlyUnlockedPrizes,
  });
}

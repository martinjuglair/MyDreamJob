import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTotalXp, levelFromXp } from "@/lib/xp";
import { unlockPrizesForLevel } from "@/lib/rewards";

export async function GET() {
  const prizes = await prisma.rewardPrize.findMany({
    orderBy: [{ level: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(prizes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { label, emoji, color, level } = body;

  const prize = await prisma.rewardPrize.create({
    data: {
      label,
      emoji: emoji || null,
      color: color || "#f59e0b",
      level: Math.max(2, parseInt(level) || 2),
    },
  });

  // If user is already at or above this level, unlock immediately
  const totalXp = await getTotalXp();
  const currentLevel = levelFromXp(totalXp).level;
  if (currentLevel >= prize.level) {
    await unlockPrizesForLevel(currentLevel);
  }

  return NextResponse.json(prize);
}

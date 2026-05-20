import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const prize = await prisma.rewardPrize.findUnique({ where: { id } });
  if (!prize) {
    return NextResponse.json({ error: "Cadeau introuvable" }, { status: 404 });
  }
  if (!prize.unlockedAt) {
    return NextResponse.json(
      { error: "Cadeau pas encore débloqué" },
      { status: 400 }
    );
  }
  if (prize.claimed) {
    return NextResponse.json({ error: "Déjà réclamé" }, { status: 400 });
  }

  const updated = await prisma.rewardPrize.update({
    where: { id },
    data: { claimed: true, claimedAt: new Date() },
  });

  return NextResponse.json(updated);
}

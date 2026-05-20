import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Delete any associated legacy spin results first
  await prisma.spinResult.deleteMany({ where: { prizeId: id } });
  await prisma.rewardPrize.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (typeof body.label === "string") data.label = body.label;
  if (typeof body.emoji === "string") data.emoji = body.emoji || null;
  if (typeof body.color === "string") data.color = body.color;
  if (typeof body.level === "number") data.level = Math.max(2, body.level);
  if (typeof body.active === "boolean") data.active = body.active;

  const updated = await prisma.rewardPrize.update({ where: { id }, data });
  return NextResponse.json(updated);
}

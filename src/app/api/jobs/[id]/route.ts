import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { spinResult: { include: { prize: true } } },
  });

  if (!job) {
    return NextResponse.json({ error: "Job non trouvé" }, { status: 404 });
  }

  return NextResponse.json(job);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};

  if (body.status !== undefined) {
    updateData.status = body.status;
    updateData.statusUpdatedAt = new Date();
    if (body.status === "APPLIED") {
      updateData.appliedAt = new Date();
    }
  }
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.analysis !== undefined) updateData.analysis = body.analysis;
  if (body.matchResult !== undefined) updateData.matchResult = body.matchResult;
  if (body.adaptedCvText !== undefined)
    updateData.adaptedCvText = body.adaptedCvText;
  if (body.interviewPrep !== undefined)
    updateData.interviewPrep = body.interviewPrep;

  const job = await prisma.job.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(job);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

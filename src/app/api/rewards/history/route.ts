import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const history = await prisma.spinResult.findMany({
    include: {
      prize: true,
      job: { select: { company: true, role: true } },
    },
    orderBy: { spunAt: "desc" },
  });
  return NextResponse.json(history);
}

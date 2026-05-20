import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: { spinResult: true },
  });
  return NextResponse.json(jobs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, company, role, location, salary, rawContent, analysis } = body;

  const job = await prisma.job.create({
    data: {
      url,
      company: company || "Entreprise inconnue",
      role: role || "Poste non identifié",
      location,
      salary,
      rawContent: rawContent || "",
      analysis,
      scrapedAt: new Date(),
    },
  });

  return NextResponse.json(job);
}

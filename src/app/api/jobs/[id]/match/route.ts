import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/ai/provider";
import { generateText } from "ai";
import {
  matchCvSystemPrompt,
  matchCvUserPrompt,
} from "@/lib/ai/prompts/match-cv";
import { formatCvForPrompt } from "@/lib/ai/format-cv";
import type { StructuredCv } from "@/lib/ai/prompts/structure-cv";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Job non trouvé" }, { status: 404 });
  }

  const cv = await prisma.cV.findFirst({ orderBy: { createdAt: "desc" } });
  if (!cv) {
    return NextResponse.json(
      { error: "Aucun CV uploadé. Uploade ton CV d'abord." },
      { status: 400 }
    );
  }

  try {
    const model = getModel();
    const cvText = formatCvForPrompt(
      cv.structuredData as StructuredCv | null,
      cv.extractedText
    );
    const { text } = await generateText({
      model,
      system: matchCvSystemPrompt,
      prompt: matchCvUserPrompt(cvText, job.rawContent),
      temperature: 0.3,
    });

    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    const matchResult = JSON.parse(cleaned);

    const updated = await prisma.job.update({
      where: { id },
      data: { matchResult },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Match error:", e);
    return NextResponse.json(
      { error: "Erreur lors du matching" },
      { status: 500 }
    );
  }
}

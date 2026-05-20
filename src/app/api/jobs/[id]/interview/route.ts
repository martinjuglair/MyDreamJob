import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/ai/provider";
import { generateText } from "ai";
import {
  interviewPrepSystemPrompt,
  interviewPrepUserPrompt,
} from "@/lib/ai/prompts/interview-prep";
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
      { error: "Aucun CV uploadé" },
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
      system: interviewPrepSystemPrompt,
      prompt: interviewPrepUserPrompt(cvText, job.rawContent),
      temperature: 0.5,
    });

    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    const interviewPrep = JSON.parse(cleaned);

    const updated = await prisma.job.update({
      where: { id },
      data: { interviewPrep },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Interview prep error:", e);
    return NextResponse.json(
      { error: "Erreur lors de la préparation" },
      { status: 500 }
    );
  }
}

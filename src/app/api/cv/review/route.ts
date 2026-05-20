import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/ai/provider";
import { generateText } from "ai";
import {
  reviewCvSystemPrompt,
  reviewCvUserPrompt,
} from "@/lib/ai/prompts/review-cv";
import { formatCvForPrompt } from "@/lib/ai/format-cv";
import type { StructuredCv } from "@/lib/ai/prompts/structure-cv";

export async function POST() {
  const cv = await prisma.cV.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!cv || !cv.extractedText) {
    return NextResponse.json(
      { error: "Aucun CV trouvé. Uploade ton CV d'abord." },
      { status: 404 }
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
      system: reviewCvSystemPrompt,
      prompt: reviewCvUserPrompt(cvText),
      temperature: 0.3,
    });

    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    const review = JSON.parse(cleaned);

    return NextResponse.json(review);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("CV review error:", message);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse du CV", detail: message },
      { status: 500 }
    );
  }
}

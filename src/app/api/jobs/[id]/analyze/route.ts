import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/ai/provider";
import { generateText } from "ai";
import { readFile as readStorageFile } from "@/lib/storage";
import {
  analyzeJobSystemPrompt,
  analyzeJobUserPrompt,
  analyzeWithCvSystemPrompt,
  analyzeWithCvUserPrompt,
} from "@/lib/ai/prompts/analyze-job";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });

  if (!job) {
    return NextResponse.json({ error: "Job non trouvé" }, { status: 404 });
  }

  try {
    const model = getModel();
    const cv = await prisma.cV.findFirst({ orderBy: { createdAt: "desc" } });

    let analysisText: string;

    // Try to attach the CV PDF for richer analysis. If unreachable
    // (e.g. CV uploaded long ago + filesystem reset), fall back gracefully
    // to text-only analysis using extractedText we have in DB.
    let pdfBuffer: Buffer | null = null;
    if (cv?.fileUrl) {
      try {
        // Normalize legacy keys like "/uploads/cv-XXX.pdf" → "uploads/cv-XXX.pdf"
        const key = cv.fileUrl.startsWith("/")
          ? cv.fileUrl.slice(1)
          : cv.fileUrl;
        pdfBuffer = await readStorageFile(key);
      } catch (e) {
        console.warn(
          `CV file unavailable (${cv.fileUrl}). Falling back to text-only analysis.`,
          e instanceof Error ? e.message : e
        );
      }
    }

    if (pdfBuffer) {
      const pdfBase64 = pdfBuffer.toString("base64");
      const { text } = await generateText({
        model,
        system: analyzeWithCvSystemPrompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "file", data: pdfBase64, mediaType: "application/pdf" },
              { type: "text", text: analyzeWithCvUserPrompt(job.rawContent) },
            ],
          },
        ],
        temperature: 0.3,
      });
      analysisText = text;
    } else {
      const { text } = await generateText({
        model,
        system: analyzeJobSystemPrompt,
        prompt: analyzeJobUserPrompt(job.rawContent),
        temperature: 0.3,
      });
      analysisText = text;
    }

    const cleaned = analysisText.replace(/```json\n?|```\n?/g, "").trim();
    const analysis = JSON.parse(cleaned);

    const updateData: Record<string, unknown> = { analysis };
    if (analysis.company) updateData.company = analysis.company;
    if (analysis.role) updateData.role = analysis.role;
    if (analysis.location) updateData.location = analysis.location;
    if (analysis.salary) updateData.salary = analysis.salary;

    if (analysis.score != null) {
      updateData.matchResult = {
        score: analysis.score,
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        recommendations: analysis.recommendations || [],
        overallAssessment: analysis.overallAssessment || "",
        cvFormFeedback: analysis.cvFormFeedback || "",
      };
    }

    const updated = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Analysis error:", message);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse", detail: message },
      { status: 500 }
    );
  }
}

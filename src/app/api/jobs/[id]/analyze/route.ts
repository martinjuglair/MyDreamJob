import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/ai/provider";
import { generateText } from "ai";
import { readFile as readStorageFile } from "@/lib/storage";
import {
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

  // Require a CV — the analysis is only meaningful with the candidate's PDF
  const cv = await prisma.cV.findFirst({ orderBy: { createdAt: "desc" } });
  if (!cv || !cv.fileUrl) {
    return NextResponse.json(
      { error: "Aucun CV uploadé. Va dans 'Mon CV' pour en uploader un." },
      { status: 400 }
    );
  }

  // Try to read the CV PDF from storage
  let pdfBuffer: Buffer;
  try {
    const key = cv.fileUrl.startsWith("/") ? cv.fileUrl.slice(1) : cv.fileUrl;
    pdfBuffer = await readStorageFile(key);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`CV file unreachable (key=${cv.fileUrl}):`, message);
    return NextResponse.json(
      {
        error:
          "Ton CV PDF n'est plus accessible. Va dans 'Mon CV', supprime-le et ré-uploade-le.",
        detail: message,
      },
      { status: 422 }
    );
  }

  try {
    const model = getModel();
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
    const analysisText = text;

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

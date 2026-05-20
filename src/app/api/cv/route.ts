import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractText, getDocumentProxy } from "unpdf";
import { saveFile } from "@/lib/storage";
import { getModel } from "@/lib/ai/provider";
import { generateText } from "ai";
import {
  structureCvSystemPrompt,
  structureCvUserPrompt,
  type StructuredCv,
} from "@/lib/ai/prompts/structure-cv";

export const maxDuration = 60;

export async function GET() {
  const cv = await prisma.cV.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!cv) {
    return NextResponse.json(null);
  }

  return NextResponse.json(cv);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || !file.name.endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Un fichier PDF est requis" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Save via storage abstraction (filesystem in dev, Supabase Storage in prod)
  const fileKey = await saveFile(file.name, buffer, "application/pdf");

  // ── Step 1: Extract raw text ──────────────────────────────────────
  let extractedText = "";
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    extractedText = text;
  } catch (e) {
    console.error("PDF extraction error:", e);
    return NextResponse.json(
      { error: "Impossible d'extraire le texte du PDF" },
      { status: 422 }
    );
  }

  // ── Step 2: Structure the CV with AI ──────────────────────────────
  let structuredData: StructuredCv | null = null;
  try {
    const model = getModel();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    const { text: aiResponse } = await generateText({
      model,
      system: structureCvSystemPrompt,
      prompt: structureCvUserPrompt(extractedText),
      temperature: 0.1, // Very low — we want accurate extraction, not creativity
      abortSignal: controller.signal,
    });

    clearTimeout(timeout);

    const cleaned = aiResponse.replace(/```json\n?|```\n?/g, "").trim();
    structuredData = JSON.parse(cleaned) as StructuredCv;
    console.log(
      "CV structured successfully:",
      structuredData.name,
      `— ${structuredData.experiences?.length ?? 0} experiences,`,
      `${structuredData.education?.length ?? 0} educations`
    );
  } catch (e) {
    // Non-blocking: if structuring fails, we still save the raw text
    console.error("CV structuring error:", e instanceof Error ? e.message : e);
  }

  // ── Step 3: Save to DB ────────────────────────────────────────────
  const cv = await prisma.cV.create({
    data: {
      fileName: file.name,
      fileUrl: fileKey, // storage key (works with both backends)
      extractedText,
      ...(structuredData
        ? { structuredData: JSON.parse(JSON.stringify(structuredData)) }
        : {}),
    },
  });

  return NextResponse.json(cv);
}

export async function DELETE() {
  await prisma.cV.deleteMany();
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/ai/provider";
import { generateText } from "ai";
import type { JobAnalysis } from "@/lib/ai/prompts/adapt-cv";
import {
  perfectCvSystemPrompt,
  perfectCvUserPrompt,
  type PerfectCvData,
} from "@/lib/ai/prompts/perfect-cv";
import { formatCvForPrompt } from "@/lib/ai/format-cv";
import type { StructuredCv } from "@/lib/ai/prompts/structure-cv";

// Allow up to 120s for this heavy AI call (default is 60s)
export const maxDuration = 120;

/**
 * Normalize a company name for fuzzy comparison.
 * Strips accents, punctuation, lowercases, removes legal suffixes.
 */
function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove accents
    .replace(/\b(sas|sarl|sa|sasu|eurl|ltd|inc|gmbh|ag|llc|corp|company|cie|co)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Validate the AI response matches PerfectCvData structure.
 * CRITICAL: rejects experiences whose company is not in the original CV.
 */
function validatePerfectCv(raw: unknown, originalCvText: string): PerfectCvData {
  const data = raw as Record<string, unknown>;
  const cvNormalized = normalizeCompany(originalCvText);

  // Profile
  const profile = data?.profile as Record<string, unknown> | undefined;
  const summary = typeof profile?.summary === "string" ? profile.summary.trim() : "";

  // Experience — cap bullets to 4 per exp to stay on 1 page
  const rawExp = Array.isArray(data?.experience) ? data.experience : [];
  const experience = rawExp
    .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
    .map((e) => ({
      title: String(e.title || "").trim(),
      company: String(e.company || "").trim(),
      location: typeof e.location === "string" ? e.location.trim() : undefined,
      period: String(e.period || "").trim(),
      bullets: Array.isArray(e.bullets)
        ? e.bullets.filter((b): b is string => typeof b === "string" && b.trim().length > 0).map(b => b.trim()).slice(0, 4)
        : [],
    }))
    .filter((e) => {
      // Reject empty, "undefined", "null" company values
      if (!e.title || !e.company) return false;
      const companyLower = e.company.toLowerCase().trim();
      if (companyLower === "undefined" || companyLower === "null") {
        console.warn(`[Perfect CV] Rejected experience with invalid company: "${e.company}"`);
        return false;
      }
      return true;
    })
    // ⚡ FILTER OUT HALLUCINATED COMPANIES: only keep those that appear in original CV
    .filter((e) => {
      const companyNorm = normalizeCompany(e.company);
      if (companyNorm.length < 3) return true; // too short to match reliably, let it pass
      const found = cvNormalized.includes(companyNorm);
      if (!found) {
        console.warn(`[Perfect CV] Rejected hallucinated company: "${e.company}"`);
      }
      return found;
    });

  // Education
  const rawEdu = Array.isArray(data?.education) ? data.education : [];
  const education = rawEdu
    .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
    .map((e) => ({
      degree: String(e.degree || "").trim(),
      school: String(e.school || "").trim(),
      year: String(e.year || "").trim(),
      details: typeof e.details === "string" ? e.details.trim() : undefined,
    }))
    .filter((e) => e.degree && e.school);

  // Skills
  const rawSkills = data?.skills as Record<string, unknown> | undefined;
  const toStringArray = (val: unknown): string[] =>
    Array.isArray(val)
      ? val.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map(s => s.trim())
      : [];

  // Cap skills to fit sidebar on 1 page (aligned with prompt limits)
  const skills = {
    hard: toStringArray(rawSkills?.hard).slice(0, 8),
    soft: toStringArray(rawSkills?.soft).slice(0, 5),
    tools: toStringArray(rawSkills?.tools).slice(0, 6),
  };

  // Languages
  const rawLangs = Array.isArray(data?.languages) ? data.languages : [];
  const languages = rawLangs
    .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
    .map((l) => ({
      language: String(l.language || "").trim(),
      level: String(l.level || "").trim(),
    }))
    .filter((l) => l.language && l.level);

  return {
    profile: { summary },
    experience,
    education,
    skills,
    languages: languages.slice(0, 3),
  };
}

// ── Route ─────────────────────────────────────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Job non trouvé" }, { status: 404 });
  }

  // Load CV
  const cv = await prisma.cV.findFirst({ orderBy: { createdAt: "desc" } });
  if (!cv || !cv.extractedText) {
    return NextResponse.json(
      { error: "Aucun CV trouvé. Uploade ton CV d'abord." },
      { status: 404 }
    );
  }

  try {
    const model = getModel();
    const analysis: JobAnalysis | null = job.analysis
      ? (job.analysis as JobAnalysis)
      : null;

    // Abort after 90s to avoid hanging forever
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    const { text } = await generateText({
      model,
      system: perfectCvSystemPrompt,
      prompt: perfectCvUserPrompt(
        formatCvForPrompt(cv.structuredData as StructuredCv | null, cv.extractedText),
        analysis,
        job.rawContent,
      ),
      temperature: 0.4,
      abortSignal: controller.signal,
    });

    clearTimeout(timeout);

    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse perfect CV response:", cleaned.slice(0, 500));
      return NextResponse.json(
        { error: "L'IA a renvoyé un JSON invalide. Réessaie." },
        { status: 502 }
      );
    }

    const cvTextForValidation = formatCvForPrompt(
      cv.structuredData as StructuredCv | null,
      cv.extractedText
    );
    const perfectCv = validatePerfectCv(parsed, cvTextForValidation);

    const updated = await prisma.job.update({
      where: { id },
      data: { perfectCvData: JSON.parse(JSON.stringify(perfectCv)) },
    });

    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Perfect CV error:", message);
    return NextResponse.json(
      { error: "Erreur lors de la génération du CV parfait", detail: message },
      { status: 500 }
    );
  }
}

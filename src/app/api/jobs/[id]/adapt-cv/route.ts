import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/ai/provider";
import { generateText } from "ai";
import {
  adaptCvSystemPrompt,
  adaptCvUserPrompt,
  type JobAnalysis,
} from "@/lib/ai/prompts/adapt-cv";
import { formatCvForPrompt } from "@/lib/ai/format-cv";
import type { StructuredCv } from "@/lib/ai/prompts/structure-cv";

// ── Character limits matching modify-pdf.py zone constraints ──────────
const TASK_MAX_CHARS = 30;
const TRAIT_MAX_CHARS = 14;
const EXP_LIMITS = [
  { roleMax: 45, subtitleMax: 45 },  // Optilia (large zone, 4 lines)
  { roleMax: 50, subtitleMax: 0 },   // Babac'cool (1 line)
  { roleMax: 40, subtitleMax: 0 },   // 20 Minutes (very tight)
  { roleMax: 45, subtitleMax: 0 },   // Suez (1 line)
  { roleMax: 50, subtitleMax: 0 },   // Calzedonia (1 line)
];

/**
 * Validate and normalize the AI response to match the expected schema.
 * Ensures all character constraints are respected (soft enforcement —
 * modify-pdf.py has hard truncation as safety net).
 */
function validateAdaptations(raw: unknown): {
  traits: string[];
  featuredJob: { tasks: string[] };
  experiences: { role: string; subtitle?: string }[];
} {
  const data = raw as Record<string, unknown>;

  // ── Traits ──────────────────────────────────────────────────────────
  let traits: string[] = [];
  if (Array.isArray(data?.traits)) {
    traits = data.traits
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim())
      .slice(0, 2);
  }
  // Enforce single-word, max chars (trim excess rather than failing)
  traits = traits.map((t) => {
    // Take first word only
    const word = t.split(/[\s-]+/)[0] || t;
    return word.length > TRAIT_MAX_CHARS
      ? word.slice(0, TRAIT_MAX_CHARS)
      : word;
  });
  // Ensure we have exactly 2 traits (fallback to originals)
  while (traits.length < 2) {
    traits.push(traits.length === 0 ? "Empathique" : "Performante");
  }

  // ── Tasks ───────────────────────────────────────────────────────────
  let tasks: string[] = [];
  const featured = data?.featuredJob as Record<string, unknown> | undefined;
  if (featured && Array.isArray(featured.tasks)) {
    tasks = featured.tasks
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => {
        const trimmed = t.trim();
        return trimmed.length > TASK_MAX_CHARS
          ? trimmed.slice(0, TASK_MAX_CHARS - 1) + "…"
          : trimmed;
      })
      .slice(0, 6);
  }
  // Ensure we have exactly 6 tasks (pad with originals if needed)
  const defaultTasks = [
    "Gestion portefeuille client",
    "Cycle de vente",
    "Relation client",
    "Négociation commerciale",
    "Développement activité",
    "Identification enjeux clients",
  ];
  while (tasks.length < 6) {
    tasks.push(defaultTasks[tasks.length] || "—");
  }

  // ── Experiences ─────────────────────────────────────────────────────
  let experiences: { role: string; subtitle?: string }[] = [];
  if (Array.isArray(data?.experiences)) {
    experiences = data.experiences
      .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
      .map((e, i) => {
        const limits = EXP_LIMITS[i] || { roleMax: 50, subtitleMax: 0 };
        let role = String(e.role || "").trim();
        if (role.length > limits.roleMax) {
          role = role.slice(0, limits.roleMax - 1) + "…";
        }

        const result: { role: string; subtitle?: string } = { role };

        // Only first experience (Optilia) can have subtitle
        if (i === 0 && limits.subtitleMax > 0 && e.subtitle) {
          let subtitle = String(e.subtitle).trim();
          if (subtitle.length > limits.subtitleMax) {
            subtitle = subtitle.slice(0, limits.subtitleMax - 1) + "…";
          }
          if (subtitle) result.subtitle = subtitle;
        }

        return result;
      })
      .slice(0, 5);
  }
  // Ensure we have 5 experiences (pad with originals)
  const defaultExperiences = [
    { role: "Chargée de développement commercial", subtitle: "Encadrement d'un commercial" },
    { role: "Community manager" },
    { role: "Assistante commerciale" },
    { role: "Assistante communication" },
    { role: "Conseillère de vente" },
  ];
  while (experiences.length < 5) {
    experiences.push(defaultExperiences[experiences.length] || { role: "—" });
  }

  return {
    traits,
    featuredJob: { tasks },
    experiences,
  };
}

// ── Route handler ─────────────────────────────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Load job with analysis
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Job non trouvé" }, { status: 404 });
  }

  // Load CV (most recent)
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

    // Parse job analysis if available
    const analysis: JobAnalysis | null = job.analysis
      ? (job.analysis as JobAnalysis)
      : null;

    const { text } = await generateText({
      model,
      system: adaptCvSystemPrompt,
      prompt: adaptCvUserPrompt(
        formatCvForPrompt(cv.structuredData as StructuredCv | null, cv.extractedText),
        analysis,
        job.rawContent,
      ),
      temperature: 0.3, // Lower = more deterministic keyword matching
    });

    // Clean any markdown wrapping
    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", cleaned.slice(0, 500));
      return NextResponse.json(
        { error: "L'IA a renvoyé un JSON invalide. Réessaie." },
        { status: 502 }
      );
    }

    // Validate and normalize — enforces all constraints
    const adaptations = validateAdaptations(parsed);

    // Store the validated JSON
    const updated = await prisma.job.update({
      where: { id },
      data: { adaptedCvText: JSON.stringify(adaptations) },
    });

    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Adapt CV error:", message);
    return NextResponse.json(
      { error: "Erreur lors de l'adaptation du CV", detail: message },
      { status: 500 }
    );
  }
}

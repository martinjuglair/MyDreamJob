import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Preflight for cross-origin bookmarklet fetch */
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Receives JSON POST from the bookmarklet (cross-origin fetch).
 * Creates the job and returns { id } so the bookmarklet can navigate.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body.url || null;
    const title = body.title || "";
    const company = body.company || "";
    const text = body.text || "";

    const role = title || extractFirst(text, "role");
    const companyName = company || extractFirst(text, "company");

    const job = await prisma.job.create({
      data: {
        url,
        company: companyName || "Entreprise inconnue",
        role: role || "Poste importé",
        rawContent: text,
        scrapedAt: new Date(),
      },
    });

    return NextResponse.json({ id: job.id }, { headers: CORS_HEADERS });
  } catch (e) {
    console.error("Import error:", e);
    return NextResponse.json(
      { error: "Erreur lors de l'import" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function extractFirst(text: string, field: "role" | "company"): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Skip common LinkedIn/site navigation noise
  const noise =
    /^(skip|passer|page|accueil|avis|connexion|recherch|0\s|mon\s|emplois|messagerie|notification|postuler|détail|lieu|description|type|essayer|pour les)/i;

  if (field === "role") {
    for (const line of lines) {
      if (line.length > 5 && line.length < 100 && /[A-ZÀ-Ü]/.test(line[0])) {
        if (!noise.test(line)) return line;
      }
    }
  }

  if (field === "company") {
    for (const line of lines) {
      if (line.length > 1 && line.length < 60) {
        if (!noise.test(line)) return line;
      }
    }
  }

  return "";
}

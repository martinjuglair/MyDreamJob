import type { StructuredCv } from "./prompts/structure-cv";

/** Returns true if a string is a real value, not "undefined"/"null"/empty. */
function isValidValue(v: string | undefined | null): v is string {
  if (!v) return false;
  const trimmed = v.trim().toLowerCase();
  return trimmed.length > 0 && trimmed !== "undefined" && trimmed !== "null";
}

/**
 * Format structured CV data into clean, readable text for AI prompts.
 * Falls back to raw extractedText if no structured data available.
 */
export function formatCvForPrompt(
  structuredData: StructuredCv | null | undefined,
  extractedText: string
): string {
  if (!structuredData) {
    return extractedText;
  }

  const s = structuredData;
  const lines: string[] = [];

  // Header
  if (s.name) lines.push(`NOM : ${s.name}`);
  if (s.age) lines.push(`ÂGE : ${s.age}`);
  if (s.email) lines.push(`EMAIL : ${s.email}`);
  if (s.phone) lines.push(`TÉLÉPHONE : ${s.phone}`);
  if (s.degree) lines.push(`DIPLÔME : ${s.degree}`);
  if (s.license) lines.push(`PERMIS : ${s.license}`);

  // Traits
  if (s.traits?.length) {
    lines.push(`\nQUALITÉS : ${s.traits.join(", ")}`);
  }

  // Current job — only emit if we have a real company name
  if (s.currentJob && isValidValue(s.currentJob.company)) {
    lines.push(`\n═══ POSTE ACTUEL ═══`);
    lines.push(`${s.currentJob.role} chez ${s.currentJob.company}`);
    lines.push(`Période : ${s.currentJob.period}`);
    if (s.currentJob.tasks?.length) {
      lines.push(`Missions :`);
      for (const t of s.currentJob.tasks) {
        lines.push(`- ${t}`);
      }
    }
  } else if (s.currentJob) {
    // Degraded mode: structurer failed to find the company.
    // Include the raw extracted text so downstream prompts can still find it.
    lines.push(`\n═══ POSTE ACTUEL (entreprise à identifier dans le texte brut ci-dessous) ═══`);
    lines.push(`${s.currentJob.role || "Poste actuel"}`);
    if (s.currentJob.period) lines.push(`Période : ${s.currentJob.period}`);
    if (s.currentJob.tasks?.length) {
      lines.push(`Missions :`);
      for (const t of s.currentJob.tasks) {
        lines.push(`- ${t}`);
      }
    }
    lines.push(`\n── TEXTE BRUT DU CV (pour retrouver le nom de l'entreprise actuelle) ──`);
    lines.push(extractedText);
  }

  // Past experiences
  if (s.experiences?.length) {
    lines.push(`\n═══ EXPÉRIENCES PASSÉES ═══`);
    for (const exp of s.experiences) {
      lines.push(`\n${exp.role} — ${exp.company} (${exp.period})`);
      if (exp.subtitle) lines.push(`  ${exp.subtitle}`);
      if (exp.tasks?.length) {
        for (const t of exp.tasks) {
          lines.push(`  - ${t}`);
        }
      }
    }
  }

  // Education
  if (s.education?.length) {
    lines.push(`\n═══ FORMATION ═══`);
    for (const edu of s.education) {
      const field = edu.field ? ` — ${edu.field}` : "";
      lines.push(`${edu.degree}, ${edu.school} (${edu.year})${field}`);
    }
  }

  // Skills
  if (s.skills?.length) {
    lines.push(`\nCOMPÉTENCES : ${s.skills.join(", ")}`);
  }

  // Languages
  if (s.languages?.length) {
    lines.push(`\nLANGUES :`);
    for (const l of s.languages) {
      lines.push(`- ${l.language} : ${l.level}`);
    }
  }

  return lines.join("\n");
}

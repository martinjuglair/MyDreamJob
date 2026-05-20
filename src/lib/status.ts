/**
 * Shared status & design tokens used across the entire app.
 * One source of truth for colors, labels, gradients.
 */

export type JobStatus =
  | "INTERESTED"
  | "APPLIED"
  | "PHONE_SCREEN"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED";

export const STATUS_CONFIG: Record<
  JobStatus,
  {
    label: string;
    emoji: string;
    /** Solid bg + text for status dots, kanban headers */
    dotClass: string;
    /** Badge classes (border + bg + text) */
    badgeClass: string;
    /** Card gradient background */
    softBgClass: string;
    /** Tailwind gradient stops "from-X to-Y" — for accents */
    gradient: string;
    /** Raw text color (Tailwind utility) */
    textClass: string;
  }
> = {
  INTERESTED: {
    label: "Intéressée",
    emoji: "👀",
    dotClass: "bg-slate-400",
    badgeClass: "border-slate-200 bg-slate-100 text-slate-700",
    softBgClass: "from-slate-50 to-slate-100",
    gradient: "from-slate-400 to-slate-500",
    textClass: "text-slate-700",
  },
  APPLIED: {
    label: "Postulé",
    emoji: "📤",
    dotClass: "bg-blue-500",
    badgeClass: "border-blue-200 bg-blue-100 text-blue-700",
    softBgClass: "from-blue-50 to-cyan-50",
    gradient: "from-blue-400 to-cyan-500",
    textClass: "text-blue-700",
  },
  PHONE_SCREEN: {
    label: "Appel",
    emoji: "📞",
    dotClass: "bg-amber-500",
    badgeClass: "border-amber-200 bg-amber-100 text-amber-700",
    softBgClass: "from-amber-50 to-orange-50",
    gradient: "from-amber-400 to-orange-500",
    textClass: "text-amber-700",
  },
  INTERVIEW: {
    label: "Entretien",
    emoji: "🎤",
    dotClass: "bg-violet-500",
    badgeClass: "border-violet-200 bg-violet-100 text-violet-700",
    softBgClass: "from-violet-50 to-purple-50",
    gradient: "from-violet-400 to-purple-600",
    textClass: "text-violet-700",
  },
  OFFER: {
    label: "Offre 🎉",
    emoji: "🏆",
    dotClass: "bg-emerald-500",
    badgeClass: "border-emerald-200 bg-emerald-100 text-emerald-700",
    softBgClass: "from-emerald-50 to-teal-50",
    gradient: "from-emerald-400 to-teal-600",
    textClass: "text-emerald-700",
  },
  REJECTED: {
    label: "Refusé",
    emoji: "❌",
    dotClass: "bg-rose-500",
    badgeClass: "border-rose-200 bg-rose-100 text-rose-700",
    softBgClass: "from-rose-50 to-pink-50",
    gradient: "from-rose-400 to-pink-500",
    textClass: "text-rose-700",
  },
};

/** Returns the config for a status, falling back to INTERESTED if unknown. */
export function statusConfig(status: string) {
  return STATUS_CONFIG[status as JobStatus] || STATUS_CONFIG.INTERESTED;
}

/** Score-based pill: green / amber / rose */
export function scoreColorClass(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-400";
}

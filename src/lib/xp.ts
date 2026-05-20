import { prisma } from "@/lib/db";

// ── XP constants ───────────────────────────────────────────────────────

/**
 * Progression : +100 XP par niveau.
 * Level N requires N*100 XP to advance to N+1.
 * Cumulative XP for level N = 100 * N*(N-1)/2
 *
 * Examples:
 * - Level 2 needs 100 XP cumulative
 * - Level 3 needs 300 XP cumulative
 * - Level 4 needs 600 XP cumulative
 * - Level 7 needs 2100 XP (≈ 37 candidatures réalistes)
 */
export const XP_INCREMENT_PER_LEVEL = 100;

/** XP awarded when a job reaches a status for the FIRST TIME. */
export const XP_FOR_STATUS: Record<string, number> = {
  INTERESTED: 5,
  APPLIED: 25,
  PHONE_SCREEN: 40,
  INTERVIEW: 60,
  OFFER: 150,
  REJECTED: 10,
};

/** XP awarded when a badge is unlocked (once per badge). */
export const XP_FOR_BADGE = 30;

// ── Award helper (idempotent) ──────────────────────────────────────────

/**
 * Award XP if not already awarded for this (kind, refKey).
 * The unique constraint in the DB means duplicate inserts are silently
 * ignored — you cannot farm XP by repeating an action.
 *
 * Returns the amount actually awarded (0 if it was a duplicate).
 */
export async function awardXp(
  kind: "STATUS" | "BADGE" | "SPIN",
  refKey: string,
  amount: number,
  description?: string
): Promise<number> {
  try {
    await prisma.xpEvent.create({
      data: { kind, refKey, amount, description },
    });
    return amount;
  } catch (e: unknown) {
    // P2002 = unique constraint violation → already awarded
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return 0;
    }
    throw e;
  }
}

// ── Compute level info ─────────────────────────────────────────────────

/** Cumulative XP required to reach a given level (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // Sum 100 + 200 + ... + 100*(level-1) = 100 * (level-1)*level / 2
  return (XP_INCREMENT_PER_LEVEL * (level - 1) * level) / 2;
}

/** XP needed to go from level N to level N+1. */
export function xpDeltaForNext(currentLevel: number): number {
  return XP_INCREMENT_PER_LEVEL * currentLevel;
}

export function levelFromXp(totalXp: number) {
  // Find largest level whose threshold ≤ totalXp
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) {
    level++;
    if (level > 100) break; // safety
  }
  const xpAtLevel = xpForLevel(level);
  const xpAtNext = xpForLevel(level + 1);
  const inLevel = totalXp - xpAtLevel;
  const perLevel = xpAtNext - xpAtLevel;
  const toNext = perLevel - inLevel;
  return { level, inLevel, toNext, perLevel };
}

/** Sum all XP events for the (single) user. */
export async function getTotalXp(): Promise<number> {
  const result = await prisma.xpEvent.aggregate({
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

// ── Helpers for callers ────────────────────────────────────────────────

/**
 * Award XP for reaching a job status. Returns XP gained (0 if already awarded).
 */
export async function awardStatusXp(
  jobId: string,
  status: string,
  jobLabel: string
): Promise<number> {
  const amount = XP_FOR_STATUS[status];
  if (!amount) return 0;
  return awardXp("STATUS", `${jobId}:${status}`, amount, `${statusLabel(status)} : ${jobLabel}`);
}

/**
 * Award XP for unlocking a badge. Returns XP gained (0 if already awarded).
 */
export async function awardBadgeXp(badgeId: string, badgeLabel: string): Promise<number> {
  return awardXp("BADGE", badgeId, XP_FOR_BADGE, `Badge débloqué : ${badgeLabel}`);
}

function statusLabel(s: string): string {
  return (
    {
      INTERESTED: "Intéressée",
      APPLIED: "Postulé",
      PHONE_SCREEN: "Appel",
      INTERVIEW: "Entretien",
      OFFER: "Offre reçue",
      REJECTED: "Refusé",
    } as Record<string, string>
  )[s] || s;
}

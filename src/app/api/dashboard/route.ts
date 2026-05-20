import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  awardBadgeXp,
  getTotalXp,
  levelFromXp,
  XP_FOR_STATUS,
  XP_FOR_BADGE,
} from "@/lib/xp";
import { bootstrapXp } from "@/lib/xp-bootstrap";
import { unlockPrizesForLevel } from "@/lib/rewards";

// ── Helpers ────────────────────────────────────────────────────────────
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (day - 1));
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeStreak(applyDates: Date[]): number {
  if (applyDates.length === 0) return 0;
  const uniqueDays = Array.from(
    new Set(applyDates.map((d) => startOfDay(d).getTime()))
  )
    .map((t) => new Date(t))
    .sort((a, b) => b.getTime() - a.getTime());

  const today = startOfDay(new Date()).getTime();
  const yesterday = today - 86_400_000;
  const first = uniqueDays[0]?.getTime();
  if (first !== today && first !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const diff = uniqueDays[i - 1].getTime() - uniqueDays[i].getTime();
    if (diff === 86_400_000) streak++;
    else break;
  }
  return streak;
}

// ── Route ──────────────────────────────────────────────────────────────
export async function GET() {
  // Bootstrap XP for any pre-existing data (idempotent)
  await bootstrapXp();

  const weekStart = startOfWeek(new Date());

  const [
    totalJobs,
    statusCounts,
    spins,
    appliedThisWeek,
    appliedDatesRaw,
    recentJobs,
    bestMatches,
    upcomingInterviews,
    allJobsWithMatch,
    recentXpEvents,
  ] = await Promise.all([
    prisma.job.count(),
    prisma.job.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.spinResult.count(),
    prisma.job.count({ where: { appliedAt: { gte: weekStart } } }),
    prisma.job.findMany({
      where: { appliedAt: { not: null } },
      select: { appliedAt: true },
    }),
    prisma.job.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        company: true,
        role: true,
        status: true,
        updatedAt: true,
        matchResult: true,
      },
    }),
    prisma.job.findMany({
      where: { matchResult: { not: null as never } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, role: true, company: true, matchResult: true },
    }),
    prisma.job.findMany({
      where: { status: { in: ["PHONE_SCREEN", "INTERVIEW"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, role: true, company: true, status: true, updatedAt: true },
    }),
    prisma.job.findMany({
      where: { matchResult: { not: null as never } },
      select: { matchResult: true },
    }),
    prisma.xpEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { kind: true, amount: true, description: true, createdAt: true },
    }),
  ]);

  // ── Funnel ───────────────────────────────────────────────────────────
  const countsByStatus: Record<string, number> = {
    INTERESTED: 0,
    APPLIED: 0,
    PHONE_SCREEN: 0,
    INTERVIEW: 0,
    OFFER: 0,
    REJECTED: 0,
  };
  for (const row of statusCounts) {
    countsByStatus[row.status] = row._count._all;
  }

  const applied =
    countsByStatus.APPLIED +
    countsByStatus.PHONE_SCREEN +
    countsByStatus.INTERVIEW +
    countsByStatus.OFFER +
    countsByStatus.REJECTED;
  const reachedPhone =
    countsByStatus.PHONE_SCREEN + countsByStatus.INTERVIEW + countsByStatus.OFFER;
  const reachedInterview = countsByStatus.INTERVIEW + countsByStatus.OFFER;
  const reachedOffer = countsByStatus.OFFER;

  // ── Streak ───────────────────────────────────────────────────────────
  const streak = computeStreak(
    appliedDatesRaw.map((r) => r.appliedAt as Date)
  );

  // ── Average match ────────────────────────────────────────────────────
  let avgMatchScore: number | null = null;
  if (allJobsWithMatch.length > 0) {
    const scores = allJobsWithMatch
      .map((j) => (j.matchResult as { score?: number } | null)?.score)
      .filter((s): s is number => typeof s === "number");
    if (scores.length > 0) {
      avgMatchScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
  }

  const interviewRate = applied > 0 ? Math.round((reachedInterview / applied) * 100) : 0;

  // ── Top matches ──────────────────────────────────────────────────────
  const top3Matches = bestMatches
    .map((j) => ({
      ...j,
      score: (j.matchResult as { score?: number } | null)?.score ?? 0,
    }))
    .filter((j) => j.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ id, role, company, score }) => ({ id, role, company, score }));

  // ── Achievements (defined BEFORE awarding so we have unlocked state) ─
  const achievementDefs = [
    { id: "first_job", emoji: "🌱", label: "Première offre", desc: "Ajouter ta première offre", unlocked: totalJobs >= 1 },
    { id: "first_apply", emoji: "🎯", label: "Premier pas", desc: "Envoyer ta première candidature", unlocked: applied >= 1 },
    { id: "5_apps", emoji: "🚀", label: "Sur la bonne voie", desc: "5 candidatures envoyées", unlocked: applied >= 5 },
    { id: "10_apps", emoji: "🔥", label: "Motivée", desc: "10 candidatures envoyées", unlocked: applied >= 10 },
    { id: "20_apps", emoji: "💪", label: "Marathonienne", desc: "20 candidatures envoyées", unlocked: applied >= 20 },
    { id: "first_phone", emoji: "📞", label: "Premier contact", desc: "Premier appel décroché", unlocked: reachedPhone >= 1 },
    { id: "first_interview", emoji: "🎤", label: "En entretien", desc: "Premier entretien décroché", unlocked: reachedInterview >= 1 },
    { id: "first_offer", emoji: "🏆", label: "Une offre !", desc: "Première offre reçue", unlocked: reachedOffer >= 1 },
    { id: "first_spin", emoji: "🎁", label: "Chanceuse", desc: "Première récompense gagnée", unlocked: spins >= 1 },
    { id: "perfect_match", emoji: "🌟", label: "Match parfait", desc: "Une offre avec 90%+ de match", unlocked: top3Matches.some((m) => m.score >= 90) },
    { id: "weekly_5", emoji: "⚡", label: "Sprint hebdo", desc: "5 candidatures cette semaine", unlocked: appliedThisWeek >= 5 },
    { id: "streak_3", emoji: "📅", label: "Régulière", desc: "3 jours consécutifs", unlocked: streak >= 3 },
  ];

  // Award XP for any newly-unlocked badge (idempotent)
  for (const ach of achievementDefs) {
    if (ach.unlocked) {
      await awardBadgeXp(ach.id, ach.label);
    }
  }

  // ── Total XP from the ledger ─────────────────────────────────────────
  const totalXp = await getTotalXp();
  const { level, inLevel, toNext, perLevel } = levelFromXp(totalXp);

  // Unlock any prizes whose threshold is now reached
  await unlockPrizesForLevel(level);

  // ── Fetch prize info for dashboard surface ────────────────────────────
  const [unlockedPrizes, nextPrize] = await Promise.all([
    prisma.rewardPrize.findMany({
      where: { active: true, unlockedAt: { not: null } },
      orderBy: { unlockedAt: "desc" },
      take: 3,
    }),
    prisma.rewardPrize.findFirst({
      where: { active: true, level: { gt: level } },
      orderBy: { level: "asc" },
    }),
  ]);

  // ── Daily tip ────────────────────────────────────────────────────────
  const tips = [
    "Personnalise ta lettre de motivation pour chaque offre — ça fait la différence ✨",
    "Un CV adapté = 3x plus de chances d'avoir un entretien 🎯",
    "Postule le matin : les recruteurs lisent souvent leur boîte en arrivant 📬",
    "Recontacte un recruteur après 5-7 jours si pas de réponse — montre ton intérêt 💌",
    "Prépare 3 questions à poser au recruteur, ça impressionne toujours 🧠",
    "LinkedIn premium est gratuit 1 mois — utilise-le pour voir qui consulte ton profil 🔍",
    "Garde un journal de tes candidatures pour suivre tes progrès 📝",
    "Pratique tes réponses à voix haute la veille d'un entretien 🎤",
    "Mets-toi un objectif réaliste : 3-5 candidatures par semaine, pas plus 🎯",
    "Soigne ta photo LinkedIn : c'est ton avatar professionnel 📸",
    "Le 'feedback constructif' après un refus est un atout pour la suite 💡",
    "Privilégie la qualité à la quantité : 5 candidatures ciblées valent 20 génériques 🎯",
  ];
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const dailyTip = tips[dayOfYear % tips.length];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return NextResponse.json({
    greeting,
    totalJobs,
    applied,
    interviews: reachedInterview,
    spins,
    funnel: {
      interested: totalJobs,
      applied,
      phoneScreen: reachedPhone,
      interview: reachedInterview,
      offer: reachedOffer,
    },
    statusCounts: countsByStatus,
    xp: {
      total: totalXp,
      level,
      inLevel,
      toNext,
      perLevel,
      // Rules surface (for the "How does it work?" modal)
      rules: {
        statuses: XP_FOR_STATUS,
        badge: XP_FOR_BADGE,
        progression: "+100 XP par niveau (niveau 2: 100 XP, niveau 3: 300 XP, niveau 4: 600 XP, …)",
      },
    },
    rewards: {
      unlocked: unlockedPrizes.map((p) => ({
        id: p.id,
        label: p.label,
        emoji: p.emoji,
        color: p.color,
        level: p.level,
        claimed: p.claimed,
      })),
      next: nextPrize
        ? {
            id: nextPrize.id,
            label: nextPrize.label,
            emoji: nextPrize.emoji,
            color: nextPrize.color,
            level: nextPrize.level,
          }
        : null,
    },
    weeklyGoal: { current: appliedThisWeek, target: 5 },
    streak,
    avgMatchScore,
    interviewRate,
    recentJobs,
    topMatches: top3Matches,
    upcomingInterviews,
    achievements: achievementDefs,
    dailyTip,
    recentXpEvents,
  });
}

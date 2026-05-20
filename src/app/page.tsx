"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Briefcase,
  CalendarCheck,
  Trophy,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
  Plus,
  KanbanSquare,
  Gift,
  Lightbulb,
  Star,
  Zap,
  Lock,
  Rocket,
  HelpCircle,
  Award,
} from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";

// ── Types ──────────────────────────────────────────────────────────────
interface Achievement {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  unlocked: boolean;
}

interface RecentJob {
  id: string;
  company: string;
  role: string;
  status: string;
  updatedAt: string;
  matchResult: { score?: number } | null;
}

interface TopMatch {
  id: string;
  role: string;
  company: string;
  score: number;
}

interface UpcomingInterview {
  id: string;
  role: string;
  company: string;
  status: string;
  updatedAt: string;
}

interface XpEvent {
  kind: "STATUS" | "BADGE" | "SPIN";
  amount: number;
  description: string | null;
  createdAt: string;
}

interface UnlockedReward {
  id: string;
  label: string;
  emoji: string | null;
  color: string;
  level: number;
  claimed: boolean;
}

interface NextReward {
  id: string;
  label: string;
  emoji: string | null;
  color: string;
  level: number;
}

interface DashboardData {
  greeting: string;
  totalJobs: number;
  applied: number;
  interviews: number;
  spins: number;
  funnel: {
    interested: number;
    applied: number;
    phoneScreen: number;
    interview: number;
    offer: number;
  };
  statusCounts: Record<string, number>;
  xp: {
    total: number;
    level: number;
    inLevel: number;
    toNext: number;
    perLevel: number;
    rules: {
      statuses: Record<string, number>;
      badge: number;
      progression: string;
    };
  };
  weeklyGoal: { current: number; target: number };
  streak: number;
  avgMatchScore: number | null;
  interviewRate: number;
  recentJobs: RecentJob[];
  topMatches: TopMatch[];
  upcomingInterviews: UpcomingInterview[];
  achievements: Achievement[];
  dailyTip: string;
  recentXpEvents: XpEvent[];
  rewards: {
    unlocked: UnlockedReward[];
    next: NextReward | null;
  };
}

// ── Status config ──────────────────────────────────────────────────────
const STATUS = {
  INTERESTED: { label: "Intéressée", color: "bg-slate-100 text-slate-700 border-slate-200" },
  APPLIED: { label: "Postulé", color: "bg-blue-100 text-blue-700 border-blue-200" },
  PHONE_SCREEN: { label: "Appel", color: "bg-amber-100 text-amber-700 border-amber-200" },
  INTERVIEW: { label: "Entretien", color: "bg-violet-100 text-violet-700 border-violet-200" },
  OFFER: { label: "Offre 🎉", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Refusé", color: "bg-rose-100 text-rose-700 border-rose-200" },
} as const;

const ENCOURAGEMENTS = [
  "Prête à décrocher le job de tes rêves ? 💪",
  "Un nouveau jour, de nouvelles opportunités 🌟",
  "Chaque candidature te rapproche du but ✨",
  "Tu es plus proche que tu ne le penses 🚀",
  "La régularité paie toujours 💎",
  "Crois en toi, fais-le ! 🔥",
];

// ── Component ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  // Pick a random encouragement once at mount (state initializer runs once)
  const [encouragement] = useState(
    () => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]
  );
  const previousLevel = useRef<number | null>(null);
  const previousUnlocked = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d: DashboardData) => {
        setData(d);

        // Confetti on level up
        if (previousLevel.current !== null && d.xp.level > previousLevel.current) {
          confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
        }
        previousLevel.current = d.xp.level;

        // Confetti on new achievement
        const currentUnlocked = new Set(d.achievements.filter((a) => a.unlocked).map((a) => a.id));
        if (previousUnlocked.current.size > 0) {
          const newOnes = [...currentUnlocked].filter((id) => !previousUnlocked.current.has(id));
          if (newOnes.length > 0) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.5 },
              colors: ["#FFD700", "#FF69B4", "#00CED1", "#FF6347"],
            });
          }
        }
        previousUnlocked.current = currentUnlocked;
      });
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-muted-foreground">Chargement du tableau de bord...</div>
      </div>
    );
  }

  const unlockedCount = data.achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-6 pb-12">
      {/* ═══ HERO ═══ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-cyan-600 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {data.greeting} Capucine ! 👋
              </h1>
              <p className="mt-2 text-base text-white/90 sm:text-lg">{encouragement}</p>
            </div>
            <XpHelpModal rules={data.xp.rules} recentEvents={data.recentXpEvents} totalXp={data.xp.total} />
          </div>

          {/* Level + XP bar */}
          <div className="mt-6 max-w-md">
            <div className="flex items-center gap-3">
              <div
                key={data.xp.level}
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 text-xl font-bold text-amber-900 shadow-lg ring-4 ring-yellow-200/40 animate-in zoom-in-50 duration-500"
              >
                {data.xp.level}
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white shadow ring-2 ring-white">
                  ★
                </div>
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-bold">Niveau {data.xp.level}</span>
                  <span className="font-mono text-white/85">
                    {data.xp.inLevel} / {data.xp.perLevel} XP
                  </span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-white/20 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 shadow-[0_0_12px_rgba(253,224,71,0.6)] transition-all duration-1000 ease-out"
                    style={{ width: `${(data.xp.inLevel / data.xp.perLevel) * 100}%` }}
                  />
                  {/* Animated shimmer */}
                  <div
                    className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    style={{
                      animation: "xp-shimmer 2.5s ease-in-out infinite",
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-white/75">
                  ✨ Plus que <strong>{data.xp.toNext} XP</strong> pour passer au niveau {data.xp.level + 1}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KEY STATS (4 cards) ═══ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Flame className="h-5 w-5" />}
          label="Streak"
          value={data.streak > 0 ? `${data.streak}j` : "—"}
          sub={data.streak > 0 ? "jours d'affilée" : "Postule pour commencer"}
          gradient="from-orange-400 to-pink-500"
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="Objectif hebdo"
          value={`${data.weeklyGoal.current}/${data.weeklyGoal.target}`}
          sub="candidatures cette semaine"
          gradient="from-cyan-400 to-blue-500"
          progress={Math.min(100, (data.weeklyGoal.current / data.weeklyGoal.target) * 100)}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Taux d'entretien"
          value={`${data.interviewRate}%`}
          sub={data.applied > 0 ? `${data.interviews} sur ${data.applied} postulées` : "Aucune candidature"}
          gradient="from-violet-400 to-purple-600"
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Match moyen"
          value={data.avgMatchScore !== null ? `${data.avgMatchScore}%` : "—"}
          sub={data.avgMatchScore !== null ? "qualité de tes offres" : "Lance un matching"}
          gradient="from-emerald-400 to-teal-600"
        />
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/jobs">
          <Card className="group cursor-pointer overflow-hidden border-2 border-transparent bg-gradient-to-br from-pink-50 to-rose-50 transition-all hover:border-pink-300 hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 text-white shadow-md transition-transform group-hover:scale-110">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Ajouter une offre</p>
                <p className="text-xs text-muted-foreground">Scrape, analyse et match</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/board">
          <Card className="group cursor-pointer overflow-hidden border-2 border-transparent bg-gradient-to-br from-cyan-50 to-sky-50 transition-all hover:border-cyan-300 hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-md transition-transform group-hover:scale-110">
                <KanbanSquare className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Voir mon Kanban</p>
                <p className="text-xs text-muted-foreground">Organise tes candidatures</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/rewards">
          <Card className="group cursor-pointer overflow-hidden border-2 border-transparent bg-gradient-to-br from-amber-50 to-yellow-50 transition-all hover:border-amber-300 hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md transition-transform group-hover:scale-110">
                <Gift className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Mes cadeaux</p>
                <p className="text-xs text-muted-foreground">
                  {data.rewards.unlocked.length} débloqué{data.rewards.unlocked.length > 1 ? "s" : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ═══ FUNNEL ═══ */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Ton parcours</h2>
          </div>
          <Funnel funnel={data.funnel} />
        </CardContent>
      </Card>

      {/* ═══ ACHIEVEMENTS ═══ */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold">Tes badges</h2>
            </div>
            <Badge variant="secondary" className="font-mono">
              {unlockedCount} / {data.achievements.length}
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-6">
            {data.achievements.map((ach) => (
              <Tooltip key={ach.id}>
                <TooltipTrigger
                  className={`group relative flex aspect-square flex-col items-center justify-center rounded-2xl border-2 p-2 transition-all hover:scale-105 ${
                    ach.unlocked
                      ? "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-100 shadow-md"
                      : "border-dashed border-slate-200 bg-slate-50 opacity-50 grayscale"
                  }`}
                >
                  <div className="text-3xl">{ach.unlocked ? ach.emoji : "🔒"}</div>
                  <div className="mt-1 line-clamp-1 text-center text-[10px] font-medium leading-tight">
                    {ach.label}
                  </div>
                  {!ach.unlocked && (
                    <Lock className="absolute right-1 top-1 h-3 w-3 text-slate-400" />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-semibold">{ach.label}</p>
                    <p className="text-muted-foreground">{ach.desc}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══ 2-COLUMN: Recent activity + Daily tip ═══ */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent jobs */}
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Activité récente</h2>
              </div>
              <Link href="/jobs">
                <Button variant="ghost" size="sm">Tout voir →</Button>
              </Link>
            </div>
            {data.recentJobs.length === 0 ? (
              <EmptyState
                emoji="🌱"
                title="Aucune offre pour le moment"
                desc="Ajoute ta première offre et commence l'aventure !"
                cta="Ajouter une offre"
                href="/jobs"
              />
            ) : (
              <div className="space-y-2">
                {data.recentJobs.map((job) => {
                  const cfg = STATUS[job.status as keyof typeof STATUS] || STATUS.INTERESTED;
                  const score = job.matchResult?.score;
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 transition-all hover:scale-[1.01] hover:shadow-md"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{job.role}</p>
                        <p className="truncate text-xs text-muted-foreground">{job.company}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {typeof score === "number" && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold text-white ${
                              score >= 75
                                ? "bg-emerald-500"
                                : score >= 50
                                  ? "bg-amber-500"
                                  : "bg-rose-400"
                            }`}
                          >
                            {score}%
                          </span>
                        )}
                        <Badge className={`border ${cfg.color}`} variant="outline">
                          {cfg.label}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily tip + Top matches */}
        <div className="space-y-4">
          {/* Daily tip */}
          <Card className="overflow-hidden border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-900">Conseil du jour</h3>
              </div>
              <p className="text-sm leading-relaxed text-amber-950">{data.dailyTip}</p>
            </CardContent>
          </Card>

          {/* Top matches */}
          {data.topMatches.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-sm font-bold">Top matchs</h3>
                </div>
                <div className="space-y-2">
                  {data.topMatches.map((m) => (
                    <Link
                      key={m.id}
                      href={`/jobs/${m.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg p-2 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{m.role}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{m.company}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
                        {m.score}%
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next reward */}
          {data.rewards.next && (
            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-amber-900">Prochain cadeau</h3>
                </div>
                <Link
                  href="/rewards"
                  className="flex items-center gap-3 rounded-xl bg-white/70 p-3 transition-all hover:bg-white hover:shadow-sm"
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                    style={{ backgroundColor: data.rewards.next.color + "40" }}
                  >
                    {data.rewards.next.emoji || "🎁"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {data.rewards.next.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Au niveau {data.rewards.next.level} (plus que{" "}
                      {data.rewards.next.level - data.xp.level} niveau
                      {data.rewards.next.level - data.xp.level > 1 ? "x" : ""})
                    </p>
                  </div>
                </Link>
                {data.rewards.unlocked.length > 0 && (
                  <p className="mt-2 text-center text-[11px] text-amber-700">
                    {data.rewards.unlocked.filter((p) => !p.claimed).length} cadeau
                    {data.rewards.unlocked.filter((p) => !p.claimed).length > 1 ? "x" : ""}{" "}
                    en attente de réclamation ✨
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming interviews */}
          {data.upcomingInterviews.length > 0 && (
            <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-violet-600" />
                  <h3 className="text-sm font-bold text-violet-900">Entretiens</h3>
                </div>
                <div className="space-y-2">
                  {data.upcomingInterviews.map((i) => (
                    <Link
                      key={i.id}
                      href={`/jobs/${i.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/60 p-2 transition-colors hover:bg-white"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{i.role}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{i.company}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

const STATUS_LABEL_FOR_XP: Record<string, string> = {
  INTERESTED: "Ajouter une offre",
  APPLIED: "Postuler à une offre",
  PHONE_SCREEN: "Décrocher un appel",
  INTERVIEW: "Obtenir un entretien",
  OFFER: "Recevoir une offre",
  REJECTED: "Refus (XP de consolation)",
};
const STATUS_EMOJI_FOR_XP: Record<string, string> = {
  INTERESTED: "👀",
  APPLIED: "📤",
  PHONE_SCREEN: "📞",
  INTERVIEW: "🎤",
  OFFER: "🏆",
  REJECTED: "🤝",
};

function XpHelpModal({
  rules,
  recentEvents,
  totalXp,
}: {
  rules: DashboardData["xp"]["rules"];
  recentEvents: XpEvent[];
  totalXp: number;
}) {
  const statusEntries = Object.entries(rules.statuses).sort(
    (a, b) => a[1] - b[1]
  );

  // Level thresholds (cumulative): show the first 8
  const thresholds = Array.from({ length: 7 }).map((_, i) => {
    const lvl = i + 2;
    const cumulative = (100 * (lvl - 1) * lvl) / 2;
    return { level: lvl, xp: cumulative };
  });

  return (
    <Dialog>
      <DialogTrigger className="group inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-all hover:bg-white/25">
        <HelpCircle className="h-3.5 w-3.5" />
        Comment ça marche ?
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Le système d&apos;XP
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Intro */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 p-4 text-sm">
            <p className="leading-relaxed">
              Chaque action de ta recherche d&apos;emploi te fait gagner de l&apos;
              <strong>XP</strong>. Plus tu montes, <strong>plus c&apos;est dur</strong> de passer au niveau suivant 💪
            </p>
            <p className="mt-2 text-xs text-amber-900/70">
              💡 L&apos;XP est gagnée <strong>une seule fois</strong> par étape et par offre.
              Faire aller-retour une offre dans le kanban ne donne pas d&apos;XP en double.
            </p>
          </div>

          {/* Status XP */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <KanbanSquare className="h-4 w-4 text-cyan-500" />
              XP par étape du kanban
            </h3>
            <div className="space-y-1.5">
              {statusEntries.map(([status, amount]) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{STATUS_EMOJI_FOR_XP[status]}</span>
                    <span>{STATUS_LABEL_FOR_XP[status]}</span>
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                    +{amount} XP
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-base">🏆</span>
                  <span>Badge débloqué</span>
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  +{rules.badge} XP
                </span>
              </div>
            </div>
          </div>

          {/* Level progression */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-amber-500" />
              Paliers de niveau
            </h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Chaque niveau demande <strong>+100 XP</strong> de plus que le précédent.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {thresholds.map((t) => (
                <div
                  key={t.level}
                  className="flex items-center justify-between rounded-lg border bg-white px-2.5 py-1.5 text-xs"
                >
                  <span className="font-semibold">Niveau {t.level}</span>
                  <span className="font-mono text-muted-foreground">{t.xp} XP</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          {recentEvents.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Derniers gains
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  Total : {totalXp} XP
                </span>
              </h3>
              <div className="space-y-1.5">
                {recentEvents.slice(0, 8).map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs"
                  >
                    <span className="truncate text-slate-700">
                      {ev.description || ev.kind}
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 font-mono font-bold text-emerald-700">
                      +{ev.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  gradient,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  gradient: string;
  progress?: number;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>
            {icon}
          </div>
        </div>
        <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
        {typeof progress === "number" && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full bg-gradient-to-r ${gradient} transition-all duration-700`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Funnel({ funnel }: { funnel: DashboardData["funnel"] }) {
  const stages = [
    { label: "Intéressée", value: funnel.interested, color: "from-slate-400 to-slate-500", emoji: "👀" },
    { label: "Postulée", value: funnel.applied, color: "from-blue-400 to-blue-600", emoji: "📤" },
    { label: "Appel", value: funnel.phoneScreen, color: "from-amber-400 to-orange-500", emoji: "📞" },
    { label: "Entretien", value: funnel.interview, color: "from-violet-400 to-purple-600", emoji: "🎤" },
    { label: "Offre", value: funnel.offer, color: "from-emerald-400 to-teal-600", emoji: "🏆" },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="grid grid-cols-5 gap-2">
      {stages.map((stage, i) => {
        const heightPct = stage.value === 0 ? 8 : 20 + (stage.value / max) * 80;
        return (
          <div key={stage.label} className="flex flex-col items-center">
            <div className="relative flex h-32 w-full items-end justify-center">
              <div
                className={`w-full rounded-t-xl bg-gradient-to-t ${stage.color} flex items-end justify-center pb-2 transition-all duration-700`}
                style={{ height: `${heightPct}%` }}
              >
                <span className="text-2xl font-bold text-white drop-shadow">{stage.value}</span>
              </div>
            </div>
            <div className="mt-2 text-center">
              <div className="text-base">{stage.emoji}</div>
              <p className="text-[11px] font-medium text-muted-foreground">{stage.label}</p>
            </div>
            {i < stages.length - 1 && stage.value > 0 && stages[i + 1].value > 0 && (
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                {Math.round((stages[i + 1].value / stage.value) * 100)}%
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({
  emoji,
  title,
  desc,
  cta,
  href,
}: {
  emoji: string;
  title: string;
  desc: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="text-5xl">{emoji}</div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <Link href={href} className="mt-4">
        <Button>
          <Zap className="mr-2 h-4 w-4" />
          {cta}
        </Button>
      </Link>
    </div>
  );
}

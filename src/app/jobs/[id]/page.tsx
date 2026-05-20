"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  ExternalLink,
  Building2,
  MapPin,
  Briefcase,
  Star,
  Gift,
  Target,
  Search,
  Send,
  MessageSquare,
  Check,
  FileEdit,
  Mail,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

// ── Types ──────────────────────────────────────────────────────────────

interface MatchPoint {
  point: string;
  detail: string;
}

interface InterviewQuestion {
  question: string;
  category: string;
  difficulty: string;
  suggestedAnswer: string;
  tips: string;
}

interface Job {
  id: string;
  url: string | null;
  company: string;
  role: string;
  location: string | null;
  salary: string | null;
  rawContent: string;
  analysis: {
    summary?: string;
    requirements?: string[];
    niceToHave?: string[];
    responsibilities?: string[];
    benefits?: string[];
    experienceLevel?: string;
    contractType?: string;
  } | null;
  matchResult: {
    score?: number;
    strengths?: MatchPoint[];
    weaknesses?: MatchPoint[];
    recommendations?: string[];
    overallAssessment?: string;
  } | null;
  adaptedCvText: string | null;
  perfectCvData: Record<string, unknown> | null;
  interviewPrep: {
    questions?: InterviewQuestion[];
    generalTips?: string[];
    companyResearch?: string[];
  } | null;
  status: string;
}

// ── Estimated durations (seconds) for each AI action ──────────────────
const ACTION_DURATIONS: Record<string, { estimate: number; label: string }> = {
  analyze: { estimate: 20, label: "Analyse en cours…" },
  "adapt-cv": { estimate: 15, label: "Génération du CV adapté…" },
  "perfect-cv": { estimate: 25, label: "Création du CV parfait…" },
  interview: { estimate: 25, label: "Préparation de l'entretien…" },
};

/** Simulated progress bar that decelerates as it approaches completion. */
function SimulatedProgress({
  action,
  startedAt,
}: {
  action: string;
  startedAt: number;
}) {
  const [progress, setProgress] = useState(0);
  const config = ACTION_DURATIONS[action] ?? {
    estimate: 15,
    label: "Chargement…",
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      // Asymptotic curve: fast at start, slows near 90%
      const ratio = elapsed / config.estimate;
      const pct = Math.min(90, 90 * (1 - Math.exp(-2.5 * ratio)));
      setProgress(pct);
    }, 100);
    return () => clearInterval(interval);
  }, [startedAt, config.estimate]);

  const remaining = Math.max(
    0,
    Math.ceil(config.estimate - (Date.now() - startedAt) / 1000)
  );

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {config.label}
        </span>
        <span className="text-muted-foreground tabular-nums text-xs">
          ~{remaining > 0 ? `${remaining}s` : "quelques secondes…"}
        </span>
      </div>
      <Progress value={progress} />
    </div>
  );
}

// ── Stepper component ──────────────────────────────────────────────────

const STEPS = [
  { key: "analysis", label: "Analyse CV", icon: Search },
  { key: "apply", label: "Postuler", icon: Send },
  { key: "interview", label: "Entretien", icon: MessageSquare },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function Stepper({
  current,
  onSelect,
  completedSteps,
}: {
  current: StepKey;
  onSelect: (step: StepKey) => void;
  completedSteps: Set<StepKey>;
}) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <nav className="relative flex items-center justify-between">
      {/* Background line */}
      <div className="absolute left-0 right-0 top-5 h-0.5 bg-muted" />
      {/* Progress line */}
      <div
        className="absolute left-0 top-5 h-0.5 bg-primary transition-all duration-500"
        style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }}
      />

      {STEPS.map((step, i) => {
        const isCompleted = completedSteps.has(step.key);
        const isActive = step.key === current;
        const isPast = i < currentIdx;
        const Icon = step.icon;

        return (
          <button
            key={step.key}
            onClick={() => onSelect(step.key)}
            className="relative z-10 flex flex-col items-center gap-2 bg-transparent border-none cursor-pointer group px-4 py-2 -my-2"
          >
            {/* Circle */}
            <div
              className={`
                flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300
                ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/25"
                    : isCompleted || isPast
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 bg-background text-muted-foreground group-hover:border-primary/50"
                }
              `}
            >
              {isCompleted ? (
                <Check className="h-5 w-5" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>

            {/* Label */}
            <span
              className={`
                text-xs font-medium transition-colors whitespace-nowrap
                ${isActive ? "text-primary font-semibold" : isCompleted || isPast ? "text-foreground" : "text-muted-foreground"}
              `}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Main page ──────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    new Set()
  );
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [perfectPdfUrl, setPerfectPdfUrl] = useState<string | null>(null);
  const [perfectPdfLoading, setPerfectPdfLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<StepKey>("analysis");
  const [actionStartedAt, setActionStartedAt] = useState<number | null>(null);

  const goToStep = useCallback((step: StepKey) => {
    setActiveStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const fetchJob = useCallback(async () => {
    const res = await fetch(`/api/jobs/${id}`);
    if (res.ok) {
      setJob(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Auto-select the right step based on data availability
  useEffect(() => {
    if (!job) return;
    if (job.interviewPrep) {
      setActiveStep("interview");
    } else if (job.adaptedCvText) {
      setActiveStep("apply");
    } else {
      setActiveStep("analysis");
    }
  }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPdfPreview = useCallback(async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/jobs/${id}/pdf`);
      if (!res.ok) throw new Error("Erreur PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      return url;
    } catch {
      toast.error("Erreur lors de la génération du PDF");
      return null;
    } finally {
      setPdfLoading(false);
    }
  }, [id]);

  const loadPerfectPdfPreview = useCallback(async () => {
    setPerfectPdfLoading(true);
    try {
      const res = await fetch(`/api/jobs/${id}/pdf-perfect`);
      if (!res.ok) throw new Error("Erreur PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPerfectPdfUrl(url);
      return url;
    } catch {
      toast.error("Erreur lors de la génération du PDF parfait");
      return null;
    } finally {
      setPerfectPdfLoading(false);
    }
  }, [id]);

  const runAction = async (action: string) => {
    setAnalyzing(action);
    setActionStartedAt(Date.now());
    if (action === "adapt-cv") setPdfUrl(null);
    if (action === "perfect-cv") setPerfectPdfUrl(null);
    try {
      const res = await fetch(`/api/jobs/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error);
      }
      toast.success(
        action === "adapt-cv"
          ? "CV adapté généré !"
          : action === "perfect-cv"
            ? "CV parfait généré !"
            : action === "interview"
              ? "Préparation terminée !"
              : "Analyse terminée !"
      );
      await fetchJob();
      // Auto-load the PDF preview after CV generation
      if (action === "adapt-cv") {
        await loadPdfPreview();
      }
      if (action === "perfect-cv") {
        await loadPerfectPdfPreview();
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erreur lors de l'opération"
      );
    } finally {
      setAnalyzing(null);
      setActionStartedAt(null);
    }
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleDownloadPdf = async () => {
    let url = pdfUrl;
    if (!url) {
      url = await loadPdfPreview();
    }
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `CV-${job?.company}-${job?.role}.pdf`;
      a.click();
    }
  };

  const handleDownloadPerfectPdf = async () => {
    let url = perfectPdfUrl;
    if (!url) {
      url = await loadPerfectPdfPreview();
    }
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `CV-Parfait-${job?.company}-${job?.role}.pdf`;
      a.click();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return <div className="py-20 text-center">Offre non trouvée</div>;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  const NOISE_PATTERNS = [
    /^passer au contenu/i, /^page d'accueil/i, /^avis sur les entreprises/i,
    /^estimation de salaire/i, /^messages?\s*(non lu)?\s*\d*/i, /^connexion$/i,
    /^entreprises\s*\/\s*publier/i, /^début du contenu/i, /^quoi$/i,
    /^où$/i, /^rechercher$/i, /^new update$/i, /^postuler sur/i,
    /^&nbsp;?$/i, /^skip to/i, /^\d+$/, /^\d\.\d$/,
    /^\d\.\d\/\d étoiles?$/i, /^correspondance entre/i, /^type de poste$/i,
    /^détails de l'emploi$/i, /^lieu$/i,
    /^signaler (cette|l'offre)/i, /^sauvegarder/i, /^partager/i,
  ];

  const FOOTER_PATTERNS = [
    /^hiring lab$/i, /^guide carri/i, /^parcourir les/i,
    /^salaires$/i, /^indeed events/i, /^travailler chez indeed/i,
    /^pays$/i, /^à propos$/i, /^aide$/i, /^© \d{4} indeed/i,
    /^accessibilit/i, /^centre de confidentialit/i, /^signalement dsa/i,
    /^page sur la s/i, /^cookies$/i, /^conditions d'utilisation/i,
    /^emplois .+ \(\d/i, /^salaires de .+ à proximit/i,
    /^emplois pour .+ situ/i,
  ];

  const cleanContent = (raw: string) => {
    const lines = raw.split("\n");
    const cleaned: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (NOISE_PATTERNS.some((p) => p.test(t))) continue;
      if (FOOTER_PATTERNS.some((p) => p.test(t))) break;
      cleaned.push(line);
    }
    return cleaned.join("\n").trim();
  };

  const scoreColor = (score: number) => {
    if (score >= 75) return "bg-green-500";
    if (score >= 50) return "bg-orange-400";
    return "bg-red-400";
  };

  const analysis = job.analysis;
  const match = job.matchResult;
  const hasAdaptedCv = !!job.adaptedCvText;
  const interview = job.interviewPrep;

  const completedSteps = new Set<StepKey>();
  if (match) completedSteps.add("analysis");
  if (hasAdaptedCv) completedSteps.add("apply");
  if (interview) completedSteps.add("interview");

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      {/* --- BACK LINK --- */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux offres
      </Link>

      {/* --- HERO HEADER --- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-cyan-600 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{job.role}</h1>
                {match?.score != null && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold text-white ring-2 ring-white/30 ${scoreColor(match.score)}`}
                  >
                    ⭐ {match.score}%
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/90">
                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                  <Building2 className="h-3.5 w-3.5" />
                  {job.company}
                </span>
                {job.location && (
                  <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                )}
                {job.salary && (
                  <span className="rounded-full bg-white/15 px-3 py-1 font-medium backdrop-blur">
                    💰 {job.salary}
                  </span>
                )}
                {analysis?.contractType && (
                  <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                    {analysis.contractType}
                  </span>
                )}
                {analysis?.experienceLevel && (
                  <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                    {analysis.experienceLevel}
                  </span>
                )}
              </div>
            </div>
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Offre originale
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* --- STEPPER --- */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <Stepper
          current={activeStep}
          onSelect={goToStep}
          completedSteps={completedSteps}
        />
      </div>

      {/* --- STRUCTURED JOB DESCRIPTION (always visible, collapsible) --- */}
      {analysis && (
        <details className="group" open={activeStep === "analysis"}>
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium hover:text-primary">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            Fiche de poste
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {analysis.summary && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Le poste
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{analysis.summary}</p>
                </CardContent>
              </Card>
            )}

            {analysis.responsibilities &&
              analysis.responsibilities.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-4 w-4 text-blue-500" />
                      Missions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {analysis.responsibilities.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

            {analysis.requirements && analysis.requirements.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-4 w-4 text-amber-500" />
                    Compétences requises
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {analysis.requirements.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {analysis.niceToHave && analysis.niceToHave.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-4 w-4 text-purple-500" />
                    Nice to have
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {analysis.niceToHave.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {analysis.benefits && analysis.benefits.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gift className="h-4 w-4 text-green-500" />
                    Avantages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {analysis.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </details>
      )}

      {/* Raw content */}
      {job.rawContent && (
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
            Texte brut de l&apos;annonce
          </summary>
          <Card className="mt-2">
            <CardContent className="pt-4">
              <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                {cleanContent(job.rawContent)}
              </p>
            </CardContent>
          </Card>
        </details>
      )}

      {/* ════════════════════════════════════════════════════════════════
          STEP 1 — ANALYSE CV
         ════════════════════════════════════════════════════════════════ */}
      {activeStep === "analysis" && (
        <div className="space-y-4">
          {analyzing === "analyze" && actionStartedAt ? (
            <Card>
              <CardContent className="py-8 px-6">
                <SimulatedProgress action="analyze" startedAt={actionStartedAt} />
              </CardContent>
            </Card>
          ) : !analysis ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <div className="rounded-full bg-primary/10 p-4">
                  <Search className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Analyser cette offre</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    L&apos;IA va analyser l&apos;offre et comparer avec le CV de Capucine
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => runAction("analyze")}
                  disabled={!!analyzing}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Lancer l&apos;analyse
                </Button>
              </CardContent>
            </Card>
          ) : !match ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-8">
                <p className="text-sm text-muted-foreground">
                  L&apos;offre est analysée mais le CV n&apos;a pas encore été
                  comparé. Uploade un CV puis relance l&apos;analyse.
                </p>
                <Button
                  onClick={() => runAction("analyze")}
                  disabled={!!analyzing}
                >
                  {analyzing === "analyze" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Relancer l&apos;analyse avec le CV
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Score */}
              {match.score != null && (
                <Card>
                  <CardHeader>
                    <CardTitle>Score de compatibilité</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1 h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${scoreColor(match.score || 0)}`}
                          style={{ width: `${match.score || 0}%` }}
                        />
                      </div>
                      <span className="text-2xl font-bold">
                        {match.score}%
                      </span>
                    </div>
                    {match.overallAssessment && (
                      <p className="text-sm text-muted-foreground">
                        {match.overallAssessment}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Strengths + Weaknesses side by side */}
              <div className="grid gap-4 md:grid-cols-2">
                {match.strengths && match.strengths.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        Points forts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {match.strengths.map((s, i) => {
                        const evidence = (s as { evidence?: string }).evidence;
                        return (
                          <div key={i} className="space-y-1">
                            <p className="text-sm font-semibold">{s.point}</p>
                            <p className="text-sm text-muted-foreground">{s.detail}</p>
                            {evidence && (
                              <p className="rounded-md border-l-2 border-emerald-300 bg-emerald-50 px-2 py-1 text-xs italic text-emerald-900">
                                💬 « {evidence} »
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {match.weaknesses && match.weaknesses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-5 w-5" />
                        Points à améliorer
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {match.weaknesses.map((w, i) => {
                        const evidence = (w as { evidence?: string }).evidence;
                        return (
                          <div key={i} className="space-y-1">
                            <p className="text-sm font-semibold">{w.point}</p>
                            <p className="text-sm text-muted-foreground">{w.detail}</p>
                            {evidence && (
                              <p className="rounded-md border-l-2 border-rose-300 bg-rose-50 px-2 py-1 text-xs italic text-rose-900">
                                💬 « {evidence} »
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>

              {(() => {
                const fb = (match as Record<string, unknown>).cvFormFeedback;
                if (!fb) return null;
                // Support both legacy (string) and new (structured object) shapes
                if (typeof fb === "string") {
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          Analyse du design du CV
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{fb}</p>
                      </CardContent>
                    </Card>
                  );
                }
                const f = fb as {
                  lisibilite?: string;
                  hierarchie?: string;
                  adequation?: string;
                  ameliorations?: string[];
                };
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        Analyse du design du CV
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {f.lisibilite && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">👀 Lisibilité</p>
                          <p className="mt-1 text-sm leading-relaxed">{f.lisibilite}</p>
                        </div>
                      )}
                      {f.hierarchie && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">🗂️ Hiérarchie</p>
                          <p className="mt-1 text-sm leading-relaxed">{f.hierarchie}</p>
                        </div>
                      )}
                      {f.adequation && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">🎯 Adéquation au secteur</p>
                          <p className="mt-1 text-sm leading-relaxed">{f.adequation}</p>
                        </div>
                      )}
                      {f.ameliorations && f.ameliorations.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">💡 Suggestions d&apos;amélioration de la forme</p>
                          <ul className="mt-2 space-y-1">
                            {f.ameliorations.map((a, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="mt-1 text-amber-500">→</span>
                                <span>{a}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Score breakdown — transparency on how the score is computed */}
              {(() => {
                const sb = (match as Record<string, unknown>).scoreBreakdown as
                  | { requirementsMet?: string; experienceFit?: string; redFlags?: string }
                  | undefined;
                if (!sb) return null;
                return (
                  <Card className="border-2 border-slate-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="h-5 w-5 text-primary" />
                        Détail du diagnostic
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {sb.requirementsMet && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">✓ Exigences couvertes</p>
                          <p className="mt-1 leading-relaxed">{sb.requirementsMet}</p>
                        </div>
                      )}
                      {sb.experienceFit && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">📊 Adéquation expérience</p>
                          <p className="mt-1 leading-relaxed">{sb.experienceFit}</p>
                        </div>
                      )}
                      {sb.redFlags && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-rose-700">⚠️ Points de vigilance</p>
                          <p className="mt-1 leading-relaxed">{sb.redFlags}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {match.recommendations && match.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      Recommandations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {match.recommendations.map((r, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-500" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runAction("analyze")}
                  disabled={!!analyzing}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Relancer l&apos;analyse
                </Button>
                <Button size="sm" onClick={() => goToStep("apply")}>
                  Étape suivante : Postuler
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          STEP 2 — POSTULER (CV Adapté + Lettre de motivation)
         ════════════════════════════════════════════════════════════════ */}
      {activeStep === "apply" && (
        <div className="space-y-6">
          {/* CV Adapté section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <FileEdit className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">CV Adapté</h2>
              {hasAdaptedCv && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  <Check className="mr-1 h-3 w-3" />
                  Prêt
                </Badge>
              )}
            </div>

            {analyzing === "adapt-cv" && actionStartedAt ? (
              <Card>
                <CardContent className="py-8 px-6">
                  <SimulatedProgress
                    action="adapt-cv"
                    startedAt={actionStartedAt}
                  />
                </CardContent>
              </Card>
            ) : !hasAdaptedCv ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-8">
                  <p className="text-sm text-muted-foreground max-w-md text-center">
                    Le CV de Capucine sera reformulé pour mieux correspondre à
                    l&apos;offre, en gardant exactement le même design PDF.
                  </p>
                  <Button
                    onClick={() => runAction("adapt-cv")}
                    disabled={!!analyzing}
                  >
                    <FileEdit className="mr-2 h-4 w-4" />
                    Générer le CV adapté
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    CV adapté prêt — télécharge le PDF modifié
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleDownloadPdf}
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Télécharger le PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runAction("adapt-cv")}
                      disabled={!!analyzing}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regénérer
                    </Button>
                  </div>
                </div>
                {pdfUrl ? (
                  <div className="overflow-hidden rounded-lg border shadow-sm">
                    <iframe
                      src={pdfUrl}
                      className="w-full bg-white"
                      style={{ height: "1120px" }}
                      title="CV Adapté"
                    />
                  </div>
                ) : pdfLoading ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Génération du PDF en cours…
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-8">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Clique sur &quot;Télécharger le PDF&quot; pour voir et
                        télécharger le CV modifié
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* CV Parfait section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <Sparkles className="h-4 w-4 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold">CV Parfait</h2>
              {job.perfectCvData && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  <Check className="mr-1 h-3 w-3" />
                  Prêt
                </Badge>
              )}
            </div>

            {analyzing === "perfect-cv" && actionStartedAt ? (
              <Card>
                <CardContent className="py-8 px-6">
                  <SimulatedProgress
                    action="perfect-cv"
                    startedAt={actionStartedAt}
                  />
                </CardContent>
              </Card>
            ) : !job.perfectCvData ? (
              <Card className="border-amber-200 bg-amber-50/30">
                <CardContent className="flex flex-col items-center gap-4 py-8">
                  <Sparkles className="h-10 w-10 text-amber-500" />
                  <div className="text-center max-w-md">
                    <p className="text-sm font-medium">
                      Un CV entièrement restructuré pour cette offre
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Nouveau design pro, expériences détaillées avec résultats
                      chiffrés, compétences ciblées — tout orienté pour décrocher
                      l&apos;entretien.
                    </p>
                  </div>
                  <Button
                    onClick={() => runAction("perfect-cv")}
                    disabled={!!analyzing}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Générer le CV parfait
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    CV parfait prêt — un design pro optimisé pour cette offre
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleDownloadPerfectPdf}
                      disabled={perfectPdfLoading}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {perfectPdfLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Télécharger le PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runAction("perfect-cv")}
                      disabled={!!analyzing}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regénérer
                    </Button>
                  </div>
                </div>
                {perfectPdfUrl ? (
                  <div className="overflow-hidden rounded-lg border border-amber-200 shadow-sm">
                    <iframe
                      src={perfectPdfUrl}
                      className="w-full bg-white"
                      style={{ height: "1120px" }}
                      title="CV Parfait"
                    />
                  </div>
                ) : perfectPdfLoading ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                      <p className="text-sm text-muted-foreground">
                        Génération du PDF en cours…
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-8">
                      <Sparkles className="h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Clique sur &quot;Télécharger le PDF&quot; pour voir et
                        télécharger le CV parfait
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* Lettre de motivation section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Lettre de motivation</h2>
              <Badge variant="outline" className="text-muted-foreground">
                Bientôt
              </Badge>
            </div>
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-8">
                <Mail className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  La génération de lettre de motivation arrive bientôt
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToStep("analysis")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Analyse CV
            </Button>
            <Button size="sm" onClick={() => goToStep("interview")}>
              Étape suivante : Entretien
              <MessageSquare className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          STEP 3 — ENTRETIEN
         ════════════════════════════════════════════════════════════════ */}
      {activeStep === "interview" && (
        <div className="space-y-4">
          {analyzing === "interview" && actionStartedAt ? (
            <Card>
              <CardContent className="py-8 px-6">
                <SimulatedProgress action="interview" startedAt={actionStartedAt} />
              </CardContent>
            </Card>
          ) : !interview ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <div className="rounded-full bg-primary/10 p-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Préparer l&apos;entretien</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    L&apos;IA va générer des questions probables et des suggestions
                    de réponses
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => runAction("interview")}
                  disabled={!!analyzing}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Préparer l&apos;entretien
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {interview.questions && (
                <div className="space-y-3">
                  {interview.questions.map((q, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <button
                          onClick={() => toggleQuestion(i)}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                q.difficulty === "facile"
                                  ? "secondary"
                                  : q.difficulty === "difficile"
                                    ? "destructive"
                                    : "outline"
                              }
                            >
                              {q.difficulty}
                            </Badge>
                            <span className="font-medium text-sm">
                              {q.question}
                            </span>
                          </div>
                          {expandedQuestions.has(i) ? (
                            <ChevronUp className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 flex-shrink-0" />
                          )}
                        </button>
                        {expandedQuestions.has(i) && (
                          <div className="mt-3 space-y-2 border-t pt-3">
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground">
                                Suggestion de réponse
                              </p>
                              <p className="mt-1 text-sm">
                                {q.suggestedAnswer}
                              </p>
                            </div>
                            {q.tips && (
                              <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground">
                                  Conseil
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {q.tips}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {interview.generalTips && interview.generalTips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Conseils généraux</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {interview.generalTips.map((tip, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => runAction("interview")}
                disabled={!!analyzing}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regénérer la préparation
              </Button>
            </>
          )}

          {/* Back navigation */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToStep("apply")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Postuler
          </Button>
        </div>
      )}
    </div>
  );
}

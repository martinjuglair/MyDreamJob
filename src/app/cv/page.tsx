"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  Trash2,
  Star,
  ThumbsUp,
  AlertTriangle,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { PageHero } from "@/components/layout/page-hero";

interface CVData {
  id: string;
  fileName: string;
  extractedText: string;
  createdAt: string;
}

interface ReviewAmelioration {
  point: string;
  suggestion: string;
}

interface ReviewSection {
  note: number;
  positifs: string[];
  ameliorations: ReviewAmelioration[];
}

interface CVReview {
  fond: ReviewSection;
  forme: ReviewSection;
  verdictGlobal: string;
  actionsPrioritaires: string[];
}

function NoteGauge({ note, label }: { note: number; label: string }) {
  const color =
    note >= 8
      ? "text-green-500"
      : note >= 6
        ? "text-yellow-500"
        : "text-red-500";
  const bgColor =
    note >= 8
      ? "bg-green-500"
      : note >= 6
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className={`text-3xl font-bold ${color}`}>{note}</span>
      <span className="text-xs text-muted-foreground">/10</span>
      <Progress value={note * 10} className={`h-2 w-24 [&>div]:${bgColor}`} />
    </div>
  );
}

function ReviewSectionCard({
  section,
  title,
  icon,
}: {
  section: ReviewSection;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
        <NoteGauge note={section.note} label={title} />
      </CardHeader>
      <CardContent className="space-y-4">
        {section.positifs.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-green-600">
              <ThumbsUp className="h-4 w-4" />
              Points positifs
            </h4>
            <ul className="space-y-1">
              {section.positifs.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1 text-green-500">✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {section.ameliorations.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              À améliorer
            </h4>
            <ul className="space-y-2">
              {section.ameliorations.map((a, i) => (
                <li key={i} className="text-sm">
                  <p className="font-medium text-foreground">{a.point}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    💡 {a.suggestion}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CVPage() {
  const [cv, setCv] = useState<CVData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [review, setReview] = useState<CVReview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);

  const fetchCV = useCallback(async () => {
    try {
      const res = await fetch("/api/cv");
      const data = await res.json();
      setCv(data);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchCV();
  }, [fetchCV]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!file.name.endsWith(".pdf")) {
        toast.error("Seuls les fichiers PDF sont acceptés");
        return;
      }

      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/cv", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erreur lors de l'upload");
        }

        const data = await res.json();
        setCv(data);
        toast.success("CV uploadé et analysé !");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de l'upload"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleDelete = async () => {
    await fetch("/api/cv", { method: "DELETE" });
    setCv(null);
    toast.success("CV supprimé");
  };

  const handleReview = async () => {
    setReviewing(true);
    setReview(null);
    setReviewProgress(0);

    // Simulated progress (asymptotic toward 90%)
    const start = Date.now();
    const duration = 15_000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const ratio = elapsed / duration;
      setReviewProgress(Math.min(90 * (1 - Math.exp(-2.5 * ratio)), 89));
    }, 200);

    try {
      const res = await fetch("/api/cv/review", { method: "POST" });
      clearInterval(interval);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'analyse");
      }

      setReviewProgress(100);
      const data: CVReview = await res.json();
      setReview(data);
      toast.success("Analyse du CV terminée !");
    } catch (err) {
      clearInterval(interval);
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'analyse"
      );
    } finally {
      setReviewing(false);
      setReviewProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: loading,
  });

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHero
        title="Mon CV"
        subtitle={
          cv ? "Ton CV est prêt à briller ✨" : "Upload ton CV pour commencer les analyses"
        }
        emoji="📄"
        gradient="from-emerald-500 via-teal-500 to-cyan-500"
      />

      {!cv ? (
        <Card className="overflow-hidden border-2 border-emerald-100">
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
                isDragActive
                  ? "scale-[1.02] border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-inner"
                  : "border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-teal-50/40 hover:border-emerald-400 hover:from-emerald-50 hover:to-teal-50"
              } ${loading ? "pointer-events-none opacity-50" : ""}`}
            >
              <input {...getInputProps()} />
              {loading ? (
                <>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                  <p className="text-base font-semibold">Extraction & structuration en cours...</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    L&apos;IA reconstruit la structure de ton CV
                  </p>
                </>
              ) : isDragActive ? (
                <>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-base font-semibold">Dépose-le ici ! 🎯</p>
                </>
              ) : (
                <>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-base font-semibold">Glisse ton CV ici</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ou clique pour sélectionner un fichier
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    PDF uniquement
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden border-2 border-emerald-200">
            <CardContent className="flex flex-col gap-4 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{cv.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploadé le{" "}
                    {new Date(cv.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("cv-reupload")?.click()}
                  className="border-emerald-200 bg-white hover:bg-emerald-50"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Remplacer
                </Button>
                <input
                  id="cv-reupload"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onDrop([file]);
                  }}
                />
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contenu extrait
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
                {cv.extractedText}
              </pre>
            </CardContent>
          </Card>

          {/* Review CTA */}
          <Card className="overflow-hidden border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white shadow-lg">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold">Fais évaluer ton CV par l&apos;IA</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Analyse objective du <strong>fond</strong> et de la <strong>forme</strong>, avec des conseils
                  d&apos;amélioration concrets
                </p>
              </div>
              {reviewing && (
                <div className="w-full max-w-xs">
                  <Progress value={reviewProgress} className="h-2" />
                  <p className="mt-1 text-center text-xs text-muted-foreground">
                    Analyse en cours...
                  </p>
                </div>
              )}
              <Button
                size="lg"
                onClick={handleReview}
                disabled={reviewing}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-md hover:from-violet-600 hover:to-fuchsia-600"
              >
                {reviewing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {review ? "Relancer l'analyse" : "Analyser mon CV"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Review results */}
          {review && (
            <div className="space-y-6">
              {/* Scores overview */}
              <Card>
                <CardContent className="flex items-center justify-around py-6">
                  <NoteGauge note={review.fond.note} label="Fond" />
                  <div className="h-12 w-px bg-border" />
                  <NoteGauge note={review.forme.note} label="Forme" />
                  <div className="h-12 w-px bg-border" />
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Moyenne
                    </span>
                    <span className="text-3xl font-bold text-primary">
                      {((review.fond.note + review.forme.note) / 2).toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">/10</span>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed sections */}
              <div className="grid gap-6 md:grid-cols-2">
                <ReviewSectionCard
                  section={review.fond}
                  title="Fond"
                  icon={<FileText className="h-5 w-5 text-blue-500" />}
                />
                <ReviewSectionCard
                  section={review.forme}
                  title="Forme"
                  icon={<Star className="h-5 w-5 text-purple-500" />}
                />
              </div>

              {/* Verdict */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Verdict global
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {review.verdictGlobal}
                  </p>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">
                      🎯 Actions prioritaires
                    </h4>
                    <ol className="space-y-2">
                      {review.actionsPrioritaires.map((action, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-sm"
                        >
                          <Badge
                            variant="outline"
                            className="mt-0.5 shrink-0 font-mono"
                          >
                            {i + 1}
                          </Badge>
                          <span className="text-muted-foreground">
                            {action}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

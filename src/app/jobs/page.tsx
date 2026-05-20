"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHero } from "@/components/layout/page-hero";
import { STATUS_CONFIG, type JobStatus, scoreColorClass } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Loader2,
  ExternalLink,
  MapPin,
  Building2,
  Trash2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Job {
  id: string;
  url: string | null;
  company: string;
  role: string;
  location: string | null;
  status: string;
  createdAt: string;
  analysis: Record<string, unknown> | null;
  matchResult: { score?: number } | null;
}


function extractFromContent(text: string, field: "role" | "company"): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (field === "role") {
    for (const line of lines) {
      if (line.length > 5 && line.length < 100 && /[A-ZÀ-Ü]/.test(line[0])) {
        if (!/^(skip|passer|page|accueil|avis|connexion|recherch)/i.test(line)) {
          return line;
        }
      }
    }
  }
  if (field === "company") {
    for (const line of lines) {
      if (line.length > 1 && line.length < 60) {
        if (!/^(skip|passer|page|accueil|avis|connexion|recherch|postuler|détail|lieu|description|type)/i.test(line)) {
          return line;
        }
      }
    }
  }
  return "";
}

export default function JobsPage() {
  return (
    <Suspense>
      <JobsContent />
    </Suspense>
  );
}

function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [url, setUrl] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showBookmarklet, setShowBookmarklet] = useState(false);
  const importHandled = useRef(false);
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/jobs");
    const data = await res.json();
    setJobs(data);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // ── Listen for postMessage from bookmarklet ──────────────────────────
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== "fmdj_import") return;
      if (importHandled.current) return;
      importHandled.current = true;

      const { url, title, company, text } = event.data;
      const role = title || extractFromContent(text || "", "role");
      const companyName = company || extractFromContent(text || "", "company");

      setLoading(true);
      fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url || null,
          company: companyName || "Entreprise inconnue",
          role: role || "Poste importé",
          rawContent: text || "",
        }),
      })
        .then((r) => r.json())
        .then((newJob) => {
          toast.success("Offre importée ! Analyse en cours...");
          setLoading(false);
          fetchJobs();
          window.history.replaceState({}, "", "/jobs");
          // Auto-analyze in background
          fetch(`/api/jobs/${newJob.id}/analyze`, { method: "POST" })
            .then((r) => {
              if (r.ok) toast.success("Analyse terminée !");
              else toast.error("L'analyse a échoué — tu peux la relancer.");
            })
            .then(() => fetchJobs());
        })
        .catch(() => {
          toast.error("Erreur lors de l'import");
          setLoading(false);
        });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [fetchJobs]);

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const bookmarkletCode = `javascript:void((function(){var t=document.body.innerText.substring(0,8000);var u=location.href;var h=document.querySelector('h1');var title=h?h.innerText.trim():'';var company='';var d=location.hostname;if(d.includes('indeed')){var co=document.querySelector('[data-company-name]')||document.querySelector('.css-1cjkto6 a')||document.querySelector('.jobsearch-CompanyInfoContainer a');if(co)company=co.innerText.trim()}else if(d.includes('linkedin')){var sels=['.job-details-jobs-unified-top-card__company-name a','.topcard__org-name-link','a[data-tracking-control-name*="company"]','.jobs-unified-top-card__company-name a','.job-details-jobs-unified-top-card__primary-description-container .app-aware-link'];for(var i=0;i<sels.length;i++){var el=document.querySelector(sels[i]);if(el&&el.innerText.trim()){company=el.innerText.trim();break}}if(!title){var tsels=['.job-details-jobs-unified-top-card__job-title','.topcard__title','.jobs-unified-top-card__job-title','h1.t-24'];for(var j=0;j<tsels.length;j++){var th=document.querySelector(tsels[j]);if(th&&th.innerText.trim()){title=th.innerText.trim();break}}}}else if(d.includes('welcometothejungle')||d.includes('wttj')){var wc=document.querySelector('[data-testid="job-header-company-name"]')||document.querySelector('a[href*="/companies/"]');if(wc)company=wc.innerText.trim()}else if(d.includes('hellowork')){var hw=document.querySelector('.company-name')||document.querySelector('[data-cy="company-name"]')||document.querySelector('a[href*="/entreprise/"]');if(hw)company=hw.innerText.trim()}else if(d.includes('glassdoor')){var gd=document.querySelector('[data-test="employer-name"]')||document.querySelector('.css-87uc0g');if(gd)company=gd.innerText.trim().replace(/[0-9.★]+$/,'')}else{var og=document.querySelector('meta[property="og:site_name"]');if(og&&og.content)company=og.content;if(!company){var ms=document.querySelectorAll('h2,h3,.company,[class*="company"],[class*="employer"],[data-company]');for(var k=0;k<ms.length;k++){var tx=ms[k].innerText.trim();if(tx.length>1&&tx.length<60){company=tx;break}}}}if(!title&&h)title=h.innerText.trim();var msg={type:'fmdj_import',url:u,title:title,company:company,text:t};var w=window.open('${origin}/jobs?importing=true','_blank');var iv=setInterval(function(){try{w.postMessage(msg,'${origin}')}catch(e){}},300);setTimeout(function(){clearInterval(iv)},15000)})())`;

  useEffect(() => {
    if (bookmarkletRef.current) {
      bookmarkletRef.current.setAttribute("href", bookmarkletCode);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url && !manualContent) return;

    setLoading(true);
    try {
      let rawContent = manualContent;

      if (url && !manualContent) {
        const scrapeRes = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const scrapeData = await scrapeRes.json();

        if (!scrapeData.success) {
          setShowManual(true);
          toast.error(
            "Impossible de scraper cette URL. Colle le contenu manuellement."
          );
          setLoading(false);
          return;
        }
        rawContent = scrapeData.content;
      }

      const role = extractFromContent(rawContent, "role");
      const company = extractFromContent(rawContent, "company");

      const jobRes = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url || null,
          company: company || "Entreprise inconnue",
          role: role || "Poste importé",
          rawContent,
        }),
      });
      const job = await jobRes.json();

      toast.success("Offre ajoutée !");
      setUrl("");
      setManualContent("");
      setShowManual(false);

      // Trigger analysis in background (will work once API key is configured)
      fetch(`/api/jobs/${job.id}/analyze`, { method: "POST" }).then(() =>
        fetchJobs()
      );

      fetchJobs();
    } catch {
      toast.error("Erreur lors de l'ajout de l'offre");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    toast.success("Offre supprimée");
    fetchJobs();
  };

  const handleAnalyze = async (id: string) => {
    toast.info("Analyse en cours...");
    try {
      const res = await fetch(`/api/jobs/${id}/analyze`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error);
      }
      toast.success("Analyse terminée !");
      fetchJobs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'analyse");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHero
        title="Tes offres"
        subtitle={
          jobs.length === 0
            ? "Ajoute ta première offre pour commencer l'aventure"
            : `${jobs.length} offre${jobs.length > 1 ? "s" : ""} trouvée${jobs.length > 1 ? "s" : ""}`
        }
        emoji="💼"
        gradient="from-cyan-500 via-teal-500 to-emerald-500"
      />

      {/* ═══ Add job form ═══ */}
      <Card className="overflow-hidden border-2 border-cyan-100">
        <CardHeader className="bg-gradient-to-br from-cyan-50 to-teal-50">
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-cyan-600" />
            Ajouter une offre
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="Colle l'URL de l'offre (LinkedIn, WTTJ, HelloWork...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading && !showManual}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Analyser
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setShowManual(!showManual)}
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
              >
                {showManual ? "Masquer le champ texte" : "Coller le texte manuellement"}
              </button>
              <button
                type="button"
                onClick={() => setShowBookmarklet(!showBookmarklet)}
                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                📌 Bookmarklet Indeed
              </button>
            </div>

            {showBookmarklet && (
              <div className="space-y-3 rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-900">
                  Importer une offre en 1 clic (Indeed)
                </p>
                <p className="text-xs text-rose-800/80">
                  Glisse ce bouton dans ta barre de favoris. Quand tu es sur une
                  offre, clique dessus pour l&apos;importer.
                </p>
                {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                <a
                  ref={bookmarkletRef}
                  href="#"
                  className="inline-block cursor-grab rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
                  onClick={(e) => e.preventDefault()}
                >
                  + Importer dans FindMyDreamJob
                </a>
                <p className="text-[11px] italic text-rose-700/70">
                  💡 Glisse-le, ne clique pas dessus
                </p>
              </div>
            )}

            {showManual && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Sélectionne tout le texte de l'offre (Ctrl+A), copie-le (Ctrl+C) et colle-le ici (Ctrl+V)"
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  rows={8}
                  disabled={loading}
                  className="border-2"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Pratique pour les sites qui bloquent le scraping (Indeed)
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ═══ Jobs list ═══ */}
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="text-6xl">🌱</div>
            <p className="mt-4 font-semibold">Pas encore d&apos;offre</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Colle l&apos;URL d&apos;une offre LinkedIn ou autre site ci-dessus, et on s&apos;occupe du reste !
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const cfg = STATUS_CONFIG[job.status as JobStatus] || STATUS_CONFIG.INTERESTED;
            const score = job.matchResult?.score;
            return (
              <Card
                key={job.id}
                className="group cursor-pointer overflow-hidden border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderLeftColor: "var(--primary)" }}
                onClick={() => router.push(`/jobs/${job.id}`)}
              >
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{job.role}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.badgeClass}`}>
                        <span>{cfg.emoji}</span>
                        <span>{cfg.label}</span>
                      </span>
                      {typeof score === "number" && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${scoreColorClass(score)}`}
                        >
                          ⭐ {score}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {job.company}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!job.analysis && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Lancer l'analyse IA"
                        onClick={() => handleAnalyze(job.id)}
                        className="hover:bg-primary/10"
                      >
                        <Sparkles className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Ouvrir l'offre"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(job.id)}
                      className="hover:bg-rose-50"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

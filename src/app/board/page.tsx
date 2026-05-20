"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin, GripVertical, ExternalLink, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { PageHero } from "@/components/layout/page-hero";
import { STATUS_CONFIG, type JobStatus } from "@/lib/status";
import Link from "next/link";

interface Job {
  id: string;
  company: string;
  role: string;
  location: string | null;
  status: string;
  url: string | null;
  salary?: string | null;
  updatedAt?: string;
  statusUpdatedAt?: string;
  analysis?: Record<string, unknown> | null;
  matchResult?: { score?: number } | null;
}

/** Human-readable relative time, French. */
function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 30) return `il y a ${Math.floor(day / 30)}mois`;
  if (day > 0) return `il y a ${day}j`;
  if (hr > 0) return `il y a ${hr}h`;
  if (min > 0) return `il y a ${min}min`;
  return "à l'instant";
}

/** Score → color class */
function scoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-400";
}

const COLUMN_ORDER: JobStatus[] = [
  "INTERESTED",
  "APPLIED",
  "PHONE_SCREEN",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

// ── Draggable job card ────────────────────────────────────────────────
function DraggableJobCard({ job, status }: { job: Job; status: JobStatus }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: job.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const score = job.matchResult?.score;
  const cfg = STATUS_CONFIG[status];
  const initials = job.company
    .replace(/[^A-Za-zÀ-ÿ ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-30" : ""}
    >
      <Card
        className={`group relative overflow-hidden border-0 bg-white shadow-sm ring-1 ring-slate-200/70 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-${status === "INTERESTED" ? "slate" : status === "APPLIED" ? "blue" : status === "PHONE_SCREEN" ? "amber" : status === "INTERVIEW" ? "violet" : status === "OFFER" ? "emerald" : "rose"}-300`}
      >
        {/* Top accent bar (status color) */}
        <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient}`} />

        <CardContent className="space-y-2.5 p-3.5">
          {/* Drag handle (top right) */}
          <div
            {...listeners}
            {...attributes}
            className="absolute right-2 top-3 cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
            title="Glisser pour déplacer"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Top row: company logo + name */}
          <div className="flex items-start gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cfg.gradient} text-xs font-bold text-white shadow-sm`}
            >
              {initials || "?"}
            </div>
            <div className="min-w-0 flex-1 pr-5">
              <Link href={`/jobs/${job.id}`} className="block">
                <p className="line-clamp-2 text-sm font-semibold leading-snug hover:underline">
                  {job.role}
                </p>
              </Link>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{job.company}</span>
              </p>
            </div>
          </div>

          {/* Meta row: location + salary */}
          {(job.location || job.salary) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{job.location}</span>
                </span>
              )}
              {job.salary && (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  💰 {job.salary}
                </span>
              )}
            </div>
          )}

          {/* Footer row: tags + time */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <div className="flex items-center gap-1.5">
              {typeof score === "number" && (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm ${scoreColor(score)}`}
                  title={`Match : ${score}%`}
                >
                  ⭐ {score}%
                </span>
              )}
              {job.analysis && (
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-100"
                  title="Analyse IA disponible"
                >
                  <Sparkles className="h-2.5 w-2.5 text-violet-600" />
                </span>
              )}
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 transition-colors hover:bg-slate-200"
                  title="Voir l'offre originale"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-2.5 w-2.5 text-slate-600" />
                </a>
              )}
            </div>
            {job.statusUpdatedAt && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {timeAgo(job.statusUpdatedAt)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function JobCardOverlay({ job }: { job: Job }) {
  const score = job.matchResult?.score;
  const initials = job.company
    .replace(/[^A-Za-zÀ-ÿ ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
  return (
    <Card className="w-[260px] rotate-3 cursor-grabbing overflow-hidden border-0 shadow-2xl ring-2 ring-primary/40">
      <div className="h-1 w-full bg-gradient-to-r from-primary to-cyan-500" />
      <CardContent className="p-3.5">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-cyan-500 text-xs font-bold text-white shadow-sm">
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-snug">
              {job.role}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {job.company}
            </p>
          </div>
          {typeof score === "number" && (
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${scoreColor(score)}`}>
              {score}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Droppable column ──────────────────────────────────────────────────
function DroppableColumn({
  status,
  jobs,
}: {
  status: JobStatus;
  jobs: Job[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="flex min-w-0 flex-col">
      {/* Column header — sticky-looking with stronger gradient */}
      <div
        className={`mb-2 flex items-center justify-between rounded-2xl bg-gradient-to-br ${cfg.softBgClass} px-3 py-2.5 ring-1 ring-slate-200/60`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${cfg.gradient} text-sm shadow-sm`}>
            {cfg.emoji}
          </div>
          <h3 className={`truncate text-sm font-bold ${cfg.textClass}`}>{cfg.label}</h3>
        </div>
        <span
          className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold ${cfg.textClass} shadow-sm ring-1 ring-slate-200`}
        >
          {jobs.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex min-h-[240px] flex-1 flex-col gap-2.5 rounded-2xl border-2 border-dashed p-2 transition-all ${
          isOver
            ? `scale-[1.01] border-solid bg-gradient-to-br ${cfg.softBgClass} ring-2 ring-${status === "INTERESTED" ? "slate" : status === "APPLIED" ? "blue" : status === "PHONE_SCREEN" ? "amber" : status === "INTERVIEW" ? "violet" : status === "OFFER" ? "emerald" : "rose"}-300/50 shadow-inner`
            : "border-slate-200/70 bg-slate-50/30"
        }`}
      >
        {jobs.length === 0 ? (
          <div className="my-auto flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <span className="text-2xl opacity-40">{cfg.emoji}</span>
            <p className="mt-2 text-[11px] leading-tight">
              Glisse une offre<br />ici
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <DraggableJobCard key={job.id} job={job} status={status} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
interface XpToast {
  id: number;
  amount: number;
  label: string;
  x: number;
  y: number;
}

export default function BoardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [xpToasts, setXpToasts] = useState<XpToast[]>([]);
  const xpToastId = useRef(0);
  const dropPositionRef = useRef<{ x: number; y: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/jobs");
    const data = await res.json();
    setJobs(data);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDragStart = (event: DragStartEvent) => {
    const job = jobs.find((j) => j.id === event.active.id);
    if (job) setActiveJob(job);
  };

  /** Capture pointer position on drag-end for XP toast positioning. */
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      dropPositionRef.current = { x: e.clientX, y: e.clientY };
    }
    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  const showXpToast = useCallback((amount: number, label: string) => {
    const pos = dropPositionRef.current || {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    const id = ++xpToastId.current;
    setXpToasts((prev) => [...prev, { id, amount, label, x: pos.x, y: pos.y }]);
    // Remove after animation (1.6s)
    setTimeout(() => {
      setXpToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1600);
  }, [xpToastId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveJob(null);
    const { active, over } = event;
    if (!over) return;

    const jobId = active.id as string;
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    const targetStatus = over.id as string;
    if (!COLUMN_ORDER.includes(targetStatus as JobStatus)) return;
    if (targetStatus === job.status) return;

    // Optimistic update
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: targetStatus } : j))
    );

    const res = await fetch("/api/board", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, status: targetStatus }),
    });
    const result = await res.json();

    const cfg = STATUS_CONFIG[targetStatus as JobStatus];

    // Show XP gain toast if any
    if (result.xpGained > 0) {
      showXpToast(result.xpGained, cfg.label);
    } else {
      toast.info(`${cfg.emoji} Déplacée vers "${cfg.label}" (déjà acquis ✓)`);
    }

    // Level up celebration + prize unlock
    if (result.leveledUp) {
      setTimeout(() => {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
          colors: ["#FFD700", "#FF69B4", "#00CED1", "#FF6347", "#9370DB"],
        });

        const prizes = result.newlyUnlockedPrizes || [];
        if (prizes.length > 0) {
          // Highlight unlocked prizes
          const p = prizes[0];
          toast.success(`🎉 NIVEAU ${result.level} !  ${p.emoji || "🎁"} ${p.label}`, {
            duration: 6000,
            description: "Nouveau cadeau débloqué !",
          });
        } else {
          toast.success(`🎉 NIVEAU ${result.level} ATTEINT !`, {
            duration: 5000,
            description: "Bravo, tu progresses !",
          });
        }
      }, 400);
    }
  };

  const jobsByStatus = COLUMN_ORDER.reduce(
    (acc, col) => {
      acc[col] = jobs.filter((j) => j.status === col);
      return acc;
    },
    {} as Record<JobStatus, Job[]>
  );

  const totalApplied =
    (jobsByStatus.APPLIED?.length || 0) +
    (jobsByStatus.PHONE_SCREEN?.length || 0) +
    (jobsByStatus.INTERVIEW?.length || 0) +
    (jobsByStatus.OFFER?.length || 0);

  return (
    <div className="space-y-6 pb-12">
      <PageHero
        title="Ton Kanban"
        subtitle={
          jobs.length === 0
            ? "Commence à ajouter des offres pour organiser tes candidatures"
            : `${jobs.length} offre${jobs.length > 1 ? "s" : ""} suivie${jobs.length > 1 ? "s" : ""} · ${totalApplied} candidature${totalApplied > 1 ? "s" : ""} en cours`
        }
        emoji="🗂️"
        gradient="from-violet-500 via-purple-500 to-fuchsia-500"
      />

      {/* Floating XP toasts (anchored to drop position) */}
      {xpToasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-none fixed z-[100] -translate-x-1/2 text-center"
          style={{
            left: t.x,
            top: t.y,
            animation: "xp-float 1.6s ease-out forwards",
          }}
        >
          <div className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-base font-bold text-white shadow-2xl ring-2 ring-yellow-200">
            +{t.amount} XP
          </div>
          <div className="mt-1 text-xs font-medium text-amber-700 drop-shadow-sm">
            {t.label}
          </div>
        </div>
      ))}

      {jobs.length === 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="text-6xl">🌱</div>
            <p className="mt-4 font-semibold">Ton board est vide</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Ajoute ta première offre dans la section <strong>Offres</strong>, puis
              glisse-la d&apos;une colonne à l&apos;autre selon où tu en es dans ta candidature.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {COLUMN_ORDER.map((status) => (
              <DroppableColumn
                key={status}
                status={status}
                jobs={jobsByStatus[status] || []}
              />
            ))}
          </div>

          <DragOverlay>
            {activeJob && <JobCardOverlay job={activeJob} />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

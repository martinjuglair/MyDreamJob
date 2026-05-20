"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Gift,
  CheckCircle2,
  Sparkles,
  Lock,
  Trash2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { PageHero } from "@/components/layout/page-hero";
import confetti from "canvas-confetti";

interface Prize {
  id: string;
  label: string;
  emoji: string | null;
  color: string;
  level: number;
  active: boolean;
  unlockedAt: string | null;
  claimed: boolean;
  claimedAt: string | null;
}

interface MetaInfo {
  currentLevel: number;
  totalXp: number;
}

export default function RewardsPage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPrize, setNewPrize] = useState({
    label: "",
    emoji: "",
    color: "#f59e0b",
    level: 2,
  });

  const fetchData = useCallback(async () => {
    const [prizesRes, dashRes] = await Promise.all([
      fetch("/api/rewards"),
      fetch("/api/dashboard"),
    ]);
    const prizesData = await prizesRes.json();
    const dashData = await dashRes.json();
    setPrizes(prizesData);
    setMeta({ currentLevel: dashData.xp.level, totalXp: dashData.xp.total });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    if (!newPrize.label) return;
    await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPrize),
    });
    toast.success("🎁 Cadeau ajouté !");
    setNewPrize({ label: "", emoji: "", color: "#f59e0b", level: 2 });
    setDialogOpen(false);
    fetchData();
  };

  const handleClaim = async (id: string) => {
    await fetch(`/api/rewards/${id}/claim`, { method: "POST" });
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#FFD700", "#FF69B4", "#00CED1"],
    });
    toast.success("🎉 Cadeau réclamé ! Profite bien 😊");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/rewards/${id}`, { method: "DELETE" });
    toast.success("Cadeau supprimé");
    fetchData();
  };

  const sortedPrizes = [...prizes].sort((a, b) => a.level - b.level);
  const unlockedCount = prizes.filter((p) => p.unlockedAt).length;
  const claimedCount = prizes.filter((p) => p.claimed).length;
  const currentLevel = meta?.currentLevel ?? 1;
  const nextPrize = sortedPrizes.find((p) => p.level > currentLevel);

  return (
    <div className="space-y-6 pb-12">
      <PageHero
        title="Tes récompenses"
        subtitle={
          meta
            ? `Niveau ${currentLevel} · ${unlockedCount}/${prizes.length} cadeau${prizes.length > 1 ? "x" : ""} débloqué${unlockedCount > 1 ? "s" : ""}`
            : "Chargement…"
        }
        emoji="🎁"
        gradient="from-amber-500 via-orange-500 to-pink-500"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold backdrop-blur transition-all hover:bg-white/30">
            <Plus className="h-4 w-4" />
            Nouveau cadeau
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-500" />
                Nouveau cadeau
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nom</label>
                <Input
                  placeholder="ex: Restaurant en amoureux"
                  value={newPrize.label}
                  onChange={(e) => setNewPrize({ ...newPrize, label: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Emoji</label>
                  <Input
                    placeholder="🍽️"
                    value={newPrize.emoji}
                    onChange={(e) => setNewPrize({ ...newPrize, emoji: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Couleur</label>
                  <Input
                    type="color"
                    value={newPrize.color}
                    onChange={(e) => setNewPrize({ ...newPrize, color: e.target.value })}
                    className="mt-1 h-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Niveau de déblocage (à partir de quel niveau elle gagne ce cadeau)
                </label>
                <Input
                  type="number"
                  min="2"
                  max="50"
                  value={newPrize.level}
                  onChange={(e) =>
                    setNewPrize({
                      ...newPrize,
                      level: parseInt(e.target.value) || 2,
                    })
                  }
                  className="mt-1"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  💡 Niveau 2 = facile · Niveau 5 = ~17 candidatures · Niveau 7 = ~37 candidatures
                </p>
              </div>
              <Button
                onClick={handleAdd}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHero>

      {/* ═══ Status row ═══ */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatBlock
          icon="🎁"
          label="Cadeaux configurés"
          value={prizes.filter((p) => p.active).length}
          gradient="from-amber-400 to-orange-500"
        />
        <StatBlock
          icon="🔓"
          label="Débloqués"
          value={unlockedCount}
          gradient="from-pink-400 to-rose-500"
        />
        <StatBlock
          icon="✅"
          label="Réclamés"
          value={claimedCount}
          gradient="from-emerald-400 to-teal-500"
        />
      </div>

      {/* Next reward teaser */}
      {nextPrize && (
        <Card className="overflow-hidden border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
          <CardContent className="flex items-center gap-4 p-5">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-md"
              style={{ backgroundColor: nextPrize.color + "40" }}
            >
              {nextPrize.emoji || "🎁"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Prochain cadeau à débloquer
              </p>
              <p className="truncate font-semibold">{nextPrize.label}</p>
              <p className="text-xs text-muted-foreground">
                Atteins le <strong>niveau {nextPrize.level}</strong> pour le débloquer ! (tu es niveau{" "}
                {currentLevel})
              </p>
            </div>
            <div className="shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 px-3 py-2 text-center text-white shadow-md">
              <p className="text-[10px] font-medium opacity-80">NIV.</p>
              <p className="text-xl font-bold leading-none">{nextPrize.level}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Prize ladder ═══ */}
      {prizes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="text-6xl">🎁</div>
            <p className="mt-4 font-semibold">Aucun cadeau configuré</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Crée des cadeaux à débloquer pour célébrer chaque palier de progression !
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-5 w-5 text-amber-500" />
            L&apos;échelle des cadeaux
          </h2>
          <div className="relative space-y-3">
            {sortedPrizes.map((prize, idx) => {
              const isLastConfigured = idx === sortedPrizes.length - 1;
              const showGhostsAfter = isLastConfigured;
              // Render the real prize, then if it's the last one, render 3 ghosts
              return [
                renderPrizeCard(prize, idx),
                showGhostsAfter ? renderGhostPrizes(prize.level) : null,
              ];
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ── Helpers (closures over component state) ────────────────────────
  function renderPrizeCard(prize: Prize, idx: number) {
    const isUnlocked = !!prize.unlockedAt;
    const isClaimed = prize.claimed;
    const isLocked = !isUnlocked;
    const isNext = isLocked && prize === nextPrize;
    return (
      <div key={prize.id} className="relative">
        {/* Connector line */}
        {idx < sortedPrizes.length - 1 && (
          <div className="absolute left-7 top-full h-3 w-0.5 bg-gradient-to-b from-amber-300 to-transparent" />
        )}
        <Card
          className={`overflow-hidden border-2 transition-all ${
            isClaimed
              ? "border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-teal-50/60"
              : isUnlocked
                ? "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-md ring-2 ring-amber-200/50"
                : isNext
                  ? "border-dashed border-amber-300 bg-gradient-to-br from-white to-amber-50/40"
                  : "border-dashed border-slate-200 bg-slate-50/50 opacity-70"
          }`}
        >
          <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
            {/* Level badge */}
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm sm:h-14 sm:w-14 ${
                isClaimed
                  ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                  : isUnlocked
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              <div className="text-center leading-none">
                <p className="text-[9px] font-medium opacity-80">NIV.</p>
                <p className="text-lg font-bold sm:text-xl">{prize.level}</p>
              </div>
            </div>

            {/* Prize info */}
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl sm:h-12 sm:w-12 sm:text-2xl ${
                  isLocked ? "grayscale" : ""
                }`}
                style={{
                  backgroundColor: isLocked ? "#e2e8f0" : prize.color + "30",
                }}
              >
                {isLocked ? <Lock className="h-4 w-4 text-slate-400 sm:h-5 sm:w-5" /> : prize.emoji || "🎁"}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-semibold sm:text-base ${isLocked ? "text-slate-500" : ""}`}
                >
                  {prize.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isClaimed
                    ? `Réclamé le ${prize.claimedAt ? new Date(prize.claimedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ""}`
                    : isUnlocked
                      ? `Débloqué le ${new Date(prize.unlockedAt!).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} 🎉`
                      : isNext
                        ? `Plus que ${prize.level - currentLevel} niveau${prize.level - currentLevel > 1 ? "x" : ""} !`
                        : `À débloquer au niveau ${prize.level}`}
                </p>
              </div>
            </div>

            {/* Action */}
            <div className="flex shrink-0 items-center gap-1.5">
              {isUnlocked && !isClaimed && (
                <Button
                  size="sm"
                  onClick={() => handleClaim(prize.id)}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Gift className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Réclamer</span>
                </Button>
              )}
              {isClaimed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Réclamé</span>
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(prize.id)}
                className="text-rose-400 hover:bg-rose-50"
                title="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderGhostPrizes(lastLevel: number) {
    // Show 3 ghost prizes for the next 3 levels (to tease progression)
    return (
      <div key="ghosts" className="space-y-3 pt-3">
        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-slate-200" />
          <p className="text-xs font-medium text-muted-foreground">
            Niveaux supérieurs — cadeaux à configurer
          </p>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        {[1, 2, 3].map((offset) => {
          const ghostLevel = lastLevel + offset;
          return (
            <Card
              key={`ghost-${ghostLevel}`}
              className="overflow-hidden border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50/40 to-white opacity-60"
            >
              <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 sm:h-14 sm:w-14">
                  <div className="text-center leading-none">
                    <p className="text-[9px] font-medium opacity-70">NIV.</p>
                    <p className="text-lg font-bold sm:text-xl">{ghostLevel}</p>
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 backdrop-blur-sm sm:h-12 sm:w-12">
                    <Lock className="h-4 w-4 text-slate-300 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="select-none truncate text-sm font-semibold text-slate-400 blur-[3px] sm:text-base">
                      Cadeau mystère
                    </p>
                    <p className="text-xs italic text-muted-foreground">
                      🎁 À configurer pour le niveau {ghostLevel}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }
}

function StatBlock({
  icon,
  label,
  value,
  gradient,
}: {
  icon: string;
  label: string;
  value: number;
  gradient: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-2xl shadow-md`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

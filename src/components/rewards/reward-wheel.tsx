"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Prize {
  id: string;
  label: string;
  emoji: string | null;
  color: string;
}

interface RewardWheelProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  onSpinComplete?: () => void;
}

export function RewardWheel({
  open,
  onClose,
  jobId,
  onSpinComplete,
}: RewardWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Prize | null>(null);
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/rewards")
        .then((r) => r.json())
        .then((data) => setPrizes(data.filter((p: Prize & { active: boolean }) => p.active)));
      setResult(null);
      setSpinning(false);
    }
  }, [open]);

  const drawWheel = useCallback(
    (ctx: CanvasRenderingContext2D, currentRotation: number) => {
      const size = 300;
      const center = size / 2;
      const radius = center - 10;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate((currentRotation * Math.PI) / 180);

      if (prizes.length === 0) return;

      const sliceAngle = (2 * Math.PI) / prizes.length;

      prizes.forEach((prize, i) => {
        const startAngle = i * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = prize.color;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text
        ctx.save();
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        const text = `${prize.emoji || ""} ${prize.label}`;
        ctx.fillText(text, radius * 0.6, 4);
        ctx.restore();
      });

      ctx.restore();

      // Pointer
      ctx.beginPath();
      ctx.moveTo(size - 5, center);
      ctx.lineTo(size - 25, center - 12);
      ctx.lineTo(size - 25, center + 12);
      ctx.closePath();
      ctx.fillStyle = "#000";
      ctx.fill();
    },
    [prizes]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prizes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawWheel(ctx, rotation);
  }, [prizes, rotation, drawWheel]);

  const spin = async () => {
    if (spinning || prizes.length === 0) return;
    setSpinning(true);

    const res = await fetch("/api/rewards/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    const spinResult = await res.json();
    const winnerPrize = spinResult.prize as Prize;

    const winnerIndex = prizes.findIndex((p) => p.id === winnerPrize.id);
    const sliceAngle = 360 / prizes.length;
    const targetAngle =
      360 - winnerIndex * sliceAngle - sliceAngle / 2;
    const totalRotation = 360 * 5 + targetAngle;

    const startTime = Date.now();
    const duration = 4000;
    const startRotation = rotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + totalRotation * eased;

      setRotation(currentRotation % 360);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setResult(winnerPrize);
        setSpinning(false);

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        onSpinComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {result
              ? `Tu as gagné : ${result.emoji || ""} ${result.label} !`
              : "Tourne la roue !"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="rounded-full shadow-lg"
          />
          {!result ? (
            <Button
              size="lg"
              onClick={spin}
              disabled={spinning || prizes.length === 0}
            >
              {spinning ? "La roue tourne..." : "Tourner la roue !"}
            </Button>
          ) : (
            <Button onClick={onClose}>Super, merci !</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  CircleDot,
  Ticket,
  Play,
  Trophy,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { getActiveRewards, spinWheel, type SpinResult } from "@/actions/spin-win";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import type { Reward } from "@/lib/types/db";

const WHEEL_COLORS = [
  "#e23744", "#f97316", "#22c55e", "#3b82f6",
  "#a855f7", "#ec4899", "#14b8a6", "#eab308",
  "#ef4444", "#06b6d4",
];

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return "#" + (
    0x1000000 +
    (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 0 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

export default function SpinWheelPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [voucherCode, setVoucherCode] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
      const res = await getActiveRewards();
      if (res.ok) setRewards(res.data);
      else toast.error(res.error);
      setLoading(false);
    }
    load();
  }, []);

  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 420;
    const center = size / 2;
    const radius = center - 20;
    const innerRadius = 42;

    ctx.clearRect(0, 0, size, size);

    if (rewards.length === 0) return;

    const segmentAngle = (2 * Math.PI) / rewards.length;

    // Outer shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    ctx.restore();

    // Outer ring with gradient
    const ringGrad = ctx.createLinearGradient(0, 0, size, size);
    ringGrad.addColorStop(0, "#2a2a2a");
    ringGrad.addColorStop(0.5, "#1a1a1a");
    ringGrad.addColorStop(1, "#0a0a0a");
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, 2 * Math.PI);
    ctx.arc(center, center, radius, 0, 2 * Math.PI, true);
    ctx.fillStyle = ringGrad;
    ctx.fill();

    // Decorative dots on outer ring
    for (let i = 0; i < rewards.length; i++) {
      const angle = rotation + i * segmentAngle - Math.PI / 2;
      const dotX = center + Math.cos(angle) * (radius + 4);
      const dotY = center + Math.sin(angle) * (radius + 4);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = "#e23744";
      ctx.fill();
    }

    // Segments with gradient fills
    for (let i = 0; i < rewards.length; i++) {
      const startAngle = rotation + i * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;
      const color = WHEEL_COLORS[i % WHEEL_COLORS.length];

      // Gradient fill: lighter center → darker edge
      const grad = ctx.createRadialGradient(center, center, innerRadius, center, center, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(1, shadeColor(color, -25));

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Segment border
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text with shadow
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "white";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      ctx.font = "bold 14px system-ui, sans-serif";
      const text = rewards[i].name.length > 16
        ? rewards[i].name.slice(0, 14) + "..."
        : rewards[i].name;
      ctx.fillText(text, radius - 18, 5);
      ctx.restore();
    }

    // Inner hub shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(center, center, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    ctx.restore();

    // Inner hub accent ring
    ctx.beginPath();
    ctx.arc(center, center, innerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#e23744";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner hub glow ring
    ctx.beginPath();
    ctx.arc(center, center, innerRadius - 6, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(226,55,68,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center text with glow
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(226,55,68,0.6)";
    ctx.shadowBlur = 8;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SPIN", center, center + 5);
    ctx.shadowBlur = 0;
  }, [rewards]);

  useEffect(() => {
    if (!loading && rewards.length > 0) {
      drawWheel(rotationRef.current);
    }
  }, [drawWheel, loading, rewards]);

  function animateToReward(rewardIndex: number) {
    const segmentAngle = (2 * Math.PI) / rewards.length;
    // Target: the reward segment should be at the top (pointer)
    // We want the center of the segment to be at -PI/2 (top)
    // rotation + rewardIndex * segmentAngle + segmentAngle/2 - PI/2 = -PI/2
    // rotation = -rewardIndex * segmentAngle - segmentAngle/2
    const targetRotation = -(rewardIndex * segmentAngle + segmentAngle / 2);
    // Add extra full rotations for effect
    const fullRotations = 5;
    const finalRotation = targetRotation + fullRotations * 2 * Math.PI;
    // Normalize starting from current
    const startRotation = rotationRef.current % (2 * Math.PI);
    const totalRotation = finalRotation - startRotation;

    const duration = 4000; // 4 seconds
    const startTime = performance.now();

    function easeOutCubic(t: number): number {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const currentRotation = startRotation + totalRotation * eased;
      rotationRef.current = currentRotation;
      drawWheel(currentRotation);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        rotationRef.current = finalRotation;
        setSpinning(false);
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }

  async function handleSpin() {
    if (!voucherCode.trim()) {
      toast.error("Please enter a voucher code.");
      return;
    }
    if (rewards.length === 0) {
      toast.error("No rewards available.");
      return;
    }

    setSpinning(true);
    const res = await spinWheel(voucherCode);

    if (!res.ok) {
      setSpinning(false);
      toast.error(res.error);
      return;
    }

    // Find the reward index in the wheel
    const rewardIndex = rewards.findIndex((r) => r.id === res.data.reward.id);
    if (rewardIndex >= 0) {
      animateToReward(rewardIndex);
      // Show result after animation
      setTimeout(() => {
        setResult(res.data);
        setShowResult(true);
      }, 4200);
    } else {
      setSpinning(false);
      toast.error("Reward mismatch. Please try again.");
    }
  }

  function handleReset() {
    setResult(null);
    setShowResult(false);
    setVoucherCode("");
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    rotationRef.current = 0;
    drawWheel(0);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
          <CircleDot className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Spin & Win</h1>
          <p className="text-xs text-muted-foreground">
            Enter a voucher code and spin the wheel to win a reward
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-6">
          <div className="size-96 animate-pulse rounded-full bg-card" />
          <div className="h-10 w-64 animate-pulse rounded-lg bg-card" />
        </div>
      ) : rewards.length === 0 ? (
        <EmptyState
          icon="🎡"
          title="No rewards configured"
          description="Ask an administrator to configure rewards before spinning."
        />
      ) : (
        <div className="flex flex-col items-center gap-6">
          {/* Wheel with 3D pointer */}
          <div className="relative" style={{ width: 420, height: 460 }}>
            {/* 3D Pointer — SVG, pointing down, half overlapping wheel */}
            <div
              className="absolute left-1/2 z-20"
              style={{
                top: 10,
                transform: "translateX(-50%)",
                filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))",
              }}
            >
              <svg width="36" height="56" viewBox="0 0 36 56" fill="none">
                <defs>
                  <linearGradient id="pointerGrad" x1="0" y1="0" x2="0" y2="56" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#ff6b75" />
                    <stop offset="0.5" stopColor="#e23744" />
                    <stop offset="1" stopColor="#a51e28" />
                  </linearGradient>
                  <linearGradient id="pointerHighlight" x1="0" y1="0" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="rgba(255,255,255,0)" />
                    <stop offset="0.5" stopColor="rgba(255,255,255,0.3)" />
                    <stop offset="1" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>
                {/* Pointer body — rounded top, pointed bottom */}
                <path
                  d="M18 56 L4 20 Q4 4 18 4 Q32 4 32 20 Z"
                  fill="url(#pointerGrad)"
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth="0.5"
                />
                {/* Highlight overlay for 3D effect */}
                <path
                  d="M18 56 L4 20 Q4 4 18 4 Q32 4 32 20 Z"
                  fill="url(#pointerHighlight)"
                />
                {/* Top cap circle */}
                <circle cx="18" cy="18" r="10" fill="url(#pointerGrad)" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
                <circle cx="15" cy="15" r="3" fill="rgba(255,255,255,0.4)" />
              </svg>
            </div>
            <canvas
              ref={canvasRef}
              width={420}
              height={420}
              className="rounded-full"
              style={{ marginTop: 40 }}
            />
          </div>

          {/* Voucher input + spin */}
          <Card className="w-full max-w-md border-border/50">
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Voucher Code</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      className="rounded-lg pl-9 font-mono tracking-widest"
                      maxLength={8}
                      disabled={spinning}
                      onKeyDown={(e) => e.key === "Enter" && !spinning && handleSpin()}
                    />
                  </div>
                  <Button
                    onClick={handleSpin}
                    disabled={spinning || !voucherCode.trim()}
                    className="shrink-0"
                  >
                    <Play className="mr-1.5 size-4" />
                    {spinning ? "Spinning..." : "Spin"}
                  </Button>
                </div>
              </div>

              {spinning && (
                <p className="text-center text-xs text-muted-foreground animate-pulse">
                  <Sparkles className="mr-1 inline size-3" />
                  Spinning the wheel...
                </p>
              )}
            </CardContent>
          </Card>

          {/* Reward legend */}
          <div className="flex flex-wrap justify-center gap-2 max-w-md">
            {rewards.map((reward, i) => (
              <div
                key={reward.id}
                className="flex items-center gap-1.5 rounded-full bg-muted/40 px-3 py-1"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: WHEEL_COLORS[i % WHEEL_COLORS.length] }}
                />
                <span className="text-xs font-medium">{reward.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  ({reward.probability}%)
                </span>
              </div>
            ))}
          </div>

          {/* Reset button after result */}
          {result && !showResult && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 size-4" /> Spin Again
            </Button>
          )}
        </div>
      )}

      {/* Result dialog */}
      <Dialog open={showResult} onOpenChange={(open) => {
        if (!open) {
          setShowResult(false);
          handleReset();
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">🎉 Congratulations! 🎉</DialogTitle>
          </DialogHeader>
          {result && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
                <Trophy className="size-10 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">You won</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {result.reward.name}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-4 py-2">
                <p className="text-xs text-muted-foreground">Voucher Code</p>
                <p className="font-mono font-bold tracking-wider">{result.voucherCode}</p>
              </div>
              <Button onClick={() => {
                setShowResult(false);
                handleReset();
              }} className="w-full">
                <RotateCcw className="mr-2 size-4" /> Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

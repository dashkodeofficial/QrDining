"use client";

import { useEffect, useState } from "react";
import {
  Gift,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Power,
} from "lucide-react";
import {
  getRewards,
  createReward,
  updateReward,
  deleteReward,
} from "@/actions/spin-win";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Reward } from "@/lib/types/db";

export default function RewardSettingsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [name, setName] = useState("");
  const [probability, setProbability] = useState(10);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editProb, setEditProb] = useState(0);

  useEffect(() => {
    async function load() {
      const res = await getRewards();
      if (res.ok) setRewards(res.data);
      else toast.error(res.error);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Reward name is required.");
      return;
    }
    setCreating(true);
    const res = await createReward(name, probability);
    if (res.ok) {
      setRewards((prev) => [...prev, res.data]);
      setName("");
      setProbability(10);
      toast.success("Reward created");
    } else {
      toast.error(res.error);
    }
    setCreating(false);
  }

  async function handleToggleActive(reward: Reward) {
    const res = await updateReward(reward.id, { active: !reward.active });
    if (res.ok) {
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, active: !r.active } : r)),
      );
      toast.success(`Reward ${!reward.active ? "activated" : "deactivated"}`);
    } else {
      toast.error(res.error);
    }
  }

  function startEdit(reward: Reward) {
    setEditingId(reward.id);
    setEditName(reward.name);
    setEditProb(reward.probability);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) {
      toast.error("Reward name is required.");
      return;
    }
    const res = await updateReward(id, { name: editName, probability: editProb });
    if (res.ok) {
      setRewards((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, name: editName.trim(), probability: editProb } : r,
        ),
      );
      setEditingId(null);
      toast.success("Reward updated");
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteReward(id);
    if (res.ok) {
      setRewards((prev) => prev.filter((r) => r.id !== id));
      toast.success("Reward deleted");
    } else {
      toast.error(res.error);
    }
  }

  const totalProbability = rewards
    .filter((r) => r.active)
    .reduce((sum, r) => sum + r.probability, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
          <Gift className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Reward Settings</h1>
          <p className="text-xs text-muted-foreground">
            Configure rewards and their spin probabilities
          </p>
        </div>
      </div>

      {/* Probability summary */}
      {rewards.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="flex items-center justify-between p-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Total Active Probability</p>
              <p
                className={cn(
                  "text-lg font-bold",
                  totalProbability === 100
                    ? "text-emerald-600"
                    : "text-amber-600",
                )}
              >
                {totalProbability}%
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground max-w-xs text-right">
              {totalProbability === 100
                ? "Probabilities sum to 100% — optimal distribution."
                : "Tip: Set total to 100% for balanced probability distribution."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add reward form */}
      <Card className="border-border/50">
        <CardContent className="space-y-3 p-3">
          <div className="flex items-center gap-2">
            <Plus className="size-3.5 text-primary" />
            <h2 className="text-xs font-bold">Add New Reward</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium">Reward Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Free Dessert"
                className="h-8 rounded-lg text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium">Probability (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
                className="h-8 rounded-lg text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} disabled={creating} size="sm" className="h-8 w-full sm:w-auto">
                <Plus className="mr-1 size-3.5" />
                {creating ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reward list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : rewards.length === 0 ? (
        <EmptyState icon="🎁" title="No rewards yet" description="Add rewards for customers to win on the spin wheel." />
      ) : (
        <div className="space-y-2">
          <h2 className="text-xs font-bold">All Rewards ({rewards.length})</h2>
          {rewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              isEditing={editingId === reward.id}
              editName={editName}
              editProb={editProb}
              onEditName={setEditName}
              onEditProb={setEditProb}
              onStartEdit={() => startEdit(reward)}
              onSaveEdit={() => saveEdit(reward.id)}
              onCancelEdit={() => setEditingId(null)}
              onToggleActive={() => handleToggleActive(reward)}
              onDelete={() => handleDelete(reward.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const WHEEL_COLORS = [
  "#e23744", "#f97316", "#22c55e", "#3b82f6",
  "#a855f7", "#ec4899", "#14b8a6", "#eab308",
];

function RewardCard({
  reward,
  isEditing,
  editName,
  editProb,
  onEditName,
  onEditProb,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleActive,
  onDelete,
}: {
  reward: Reward;
  isEditing: boolean;
  editName: string;
  editProb: number;
  onEditName: (v: string) => void;
  onEditProb: (v: number) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const colorIdx = Math.abs(reward.id.charCodeAt(0) + reward.id.charCodeAt(1)) % WHEEL_COLORS.length;
  const color = WHEEL_COLORS[colorIdx];

  return (
    <Card className={cn(
      "overflow-hidden border-border/50 transition-all",
      !reward.active && "opacity-60",
    )}>
      <div className="h-0.5" style={{ backgroundColor: color }} />
      <CardContent className="p-3">
        {isEditing ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_100px_auto]">
            <Input
              value={editName}
              onChange={(e) => onEditName(e.target.value)}
              className="h-8 rounded-lg text-sm"
              autoFocus
            />
            <Input
              type="number"
              min={0}
              max={100}
              value={editProb}
              onChange={(e) => onEditProb(Number(e.target.value))}
              className="h-8 rounded-lg text-sm"
            />
            <div className="flex gap-1">
              <Button size="sm" onClick={onSaveEdit} className="h-8 w-8 p-0">
                <Check className="size-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit} className="h-8 w-8 p-0">
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="flex size-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: color + "18", color }}
              >
                <Gift className="size-4" />
              </div>
              <div>
                <p className="font-bold text-[13px] leading-tight">{reward.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0" style={{ backgroundColor: color + "18", color }}>
                    {reward.probability}%
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5 py-0",
                      reward.active
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {reward.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={onToggleActive}
                title={reward.active ? "Deactivate" : "Activate"}
              >
                <Power className={cn("size-3.5", reward.active ? "text-emerald-600" : "text-muted-foreground")} />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onStartEdit}>
                <Pencil className="size-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={onDelete}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

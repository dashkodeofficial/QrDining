"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/auth";
import type { ActionResult } from "./orders";
import type { Voucher, Reward, ExpiryType } from "@/lib/types/db";

// ---------------------------------------------------------------------------
// Voucher actions
// ---------------------------------------------------------------------------

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function computeExpiry(type: ExpiryType, customDate?: string): string {
  const now = new Date();
  if (type === "WEEKLY") {
    now.setDate(now.getDate() + 7);
  } else if (type === "MONTHLY") {
    now.setDate(now.getDate() + 30);
  } else if (type === "CUSTOM" && customDate) {
    return new Date(customDate).toISOString();
  } else {
    now.setDate(now.getDate() + 7);
  }
  return now.toISOString();
}

export async function getVouchers(): Promise<ActionResult<Voucher[]>> {
  const auth = await requireCapability("spin.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vouchers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: "Could not load vouchers." };
  return { ok: true, data: (data ?? []) as Voucher[] };
}

export async function generateVouchers(
  count: number,
  expiryType: ExpiryType,
  customExpiryDate?: string,
): Promise<ActionResult<Voucher[]>> {
  const auth = await requireCapability("spin.manage");
  if (!auth.ok) return auth;

  const clamped = Math.min(Math.max(count, 1), 100);
  const expiresAt = computeExpiry(expiryType, customExpiryDate);

  const supabase = createAdminClient();

  // Generate unique codes (retry on collision)
  const codes: string[] = [];
  for (let i = 0; i < clamped; i++) {
    let code = generateCode();
    let attempts = 0;
    while (codes.includes(code) && attempts < 10) {
      code = generateCode();
      attempts++;
    }
    codes.push(code);
  }

  const rows = codes.map((code) => ({
    code,
    expiry_type: expiryType,
    expires_at: expiresAt,
  }));

  const { data, error } = await supabase
    .from("vouchers")
    .insert(rows)
    .select("*");

  if (error) return { ok: false, error: "Could not generate vouchers." };

  revalidatePath("/spin-win/vouchers");
  return { ok: true, data: (data ?? []) as Voucher[] };
}

export async function deleteVoucher(id: string): Promise<ActionResult> {
  const auth = await requireCapability("spin.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { error } = await supabase.from("vouchers").delete().eq("id", id);

  if (error) return { ok: false, error: "Could not delete voucher." };

  revalidatePath("/spin-win/vouchers");
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Reward actions
// ---------------------------------------------------------------------------

export async function getRewards(): Promise<ActionResult<Reward[]>> {
  const auth = await requireCapability("spin.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rewards")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: "Could not load rewards." };
  return { ok: true, data: (data ?? []) as Reward[] };
}

export async function createReward(
  name: string,
  probability: number,
): Promise<ActionResult<Reward>> {
  const auth = await requireCapability("spin.manage");
  if (!auth.ok) return auth;

  if (!name.trim()) return { ok: false, error: "Reward name is required." };
  const prob = Math.min(Math.max(probability, 0), 100);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rewards")
    .insert({ name: name.trim(), probability: prob })
    .select("*")
    .single();

  if (error) return { ok: false, error: "Could not create reward." };

  revalidatePath("/spin-win/rewards");
  revalidatePath("/spin-win/wheel");
  return { ok: true, data: data as Reward };
}

export async function updateReward(
  id: string,
  updates: { name?: string; probability?: number; active?: boolean },
): Promise<ActionResult> {
  const auth = await requireCapability("spin.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) patch.name = updates.name.trim();
  if (updates.probability !== undefined) patch.probability = Math.min(Math.max(updates.probability, 0), 100);
  if (updates.active !== undefined) patch.active = updates.active;

  const { error } = await supabase.from("rewards").update(patch).eq("id", id);

  if (error) return { ok: false, error: "Could not update reward." };

  revalidatePath("/spin-win/rewards");
  revalidatePath("/spin-win/wheel");
  return { ok: true, data: undefined };
}

export async function deleteReward(id: string): Promise<ActionResult> {
  const auth = await requireCapability("spin.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { error } = await supabase.from("rewards").delete().eq("id", id);

  if (error) return { ok: false, error: "Could not delete reward." };

  revalidatePath("/spin-win/rewards");
  revalidatePath("/spin-win/wheel");
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Spin wheel actions
// ---------------------------------------------------------------------------

export async function getActiveRewards(): Promise<ActionResult<Reward[]>> {
  const auth = await requireCapability("spin.play");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rewards")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: "Could not load rewards." };
  return { ok: true, data: (data ?? []) as Reward[] };
}

export interface SpinResult {
  reward: Reward;
  voucherCode: string;
}

export async function spinWheel(
  voucherCode: string,
): Promise<ActionResult<SpinResult>> {
  const auth = await requireCapability("spin.play");
  if (!auth.ok) return auth;

  const code = voucherCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Please enter a voucher code." };

  const supabase = createAdminClient();

  // 1. Find voucher
  const { data: voucher, error: voucherErr } = await supabase
    .from("vouchers")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (voucherErr || !voucher) {
    return { ok: false, error: "Invalid voucher code." };
  }

  // 2. Check if already used
  if (voucher.used_at) {
    return { ok: false, error: "This voucher has already been used." };
  }

  // 3. Check expiry
  if (new Date(voucher.expires_at) < new Date()) {
    return { ok: false, error: "This voucher has expired." };
  }

  // 4. Get active rewards
  const { data: rewards } = await supabase
    .from("rewards")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (!rewards || rewards.length === 0) {
    return { ok: false, error: "No rewards available. Please configure rewards first." };
  }

  // 5. Select reward based on probability
  const totalProb = rewards.reduce((sum, r) => sum + Number(r.probability), 0);
  let selectedReward: (typeof rewards)[0] | null = null;

  if (totalProb <= 0) {
    // All probabilities are 0 — pick random
    selectedReward = rewards[Math.floor(Math.random() * rewards.length)];
  } else {
    const random = Math.random() * totalProb;
    let cumulative = 0;
    for (const reward of rewards) {
      cumulative += Number(reward.probability);
      if (random <= cumulative) {
        selectedReward = reward;
        break;
      }
    }
    // Fallback if floating point edge case
    if (!selectedReward) {
      selectedReward = rewards[rewards.length - 1];
    }
  }

  // 6. Mark voucher as used
  const { error: updateErr } = await supabase
    .from("vouchers")
    .update({
      used_at: new Date().toISOString(),
      reward_id: selectedReward.id,
    })
    .eq("id", voucher.id);

  if (updateErr) return { ok: false, error: "Could not process spin. Please try again." };

  revalidatePath("/spin-win/vouchers");

  return {
    ok: true,
    data: {
      reward: selectedReward as Reward,
      voucherCode: code,
    },
  };
}

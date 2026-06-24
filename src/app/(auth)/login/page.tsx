"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, Eye, EyeOff, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;

    if (!email || !password) {
      toast.error("Please enter your email and password.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Resolve the staff role so we can redirect to the correct dashboard.
    const { data: staff } = await supabase
      .from("staff")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    const role = (staff?.role as "ADMIN" | "MANAGER" | "KITCHEN" | "WAITER" | "CASHIER") ?? "ADMIN";
    const home: Record<typeof role, string> = {
      ADMIN: "/admin",
      MANAGER: "/admin",
      KITCHEN: "/kitchen",
      WAITER: "/waiter",
      CASHIER: "/cashier",
    };

    toast.success("Welcome back!");
    router.push(home[role]);
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-app-surface px-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-32 size-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 p-8 space-y-6">
          {/* Brand */}
          <div className="text-center space-y-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <ChefHat className="size-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-app-ink">Staff Login</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Restaurant QR Ordering System
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@restaurant.com"
                required
                autoComplete="email"
                autoFocus
                className="h-10 rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-10 rounded-md pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-10 shadow-md shadow-primary/20" size="sm" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="size-4" />
                  Sign In
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Access is restricted to authorized restaurant staff only.
          </p>
        </div>
      </div>
    </main>
  );
}

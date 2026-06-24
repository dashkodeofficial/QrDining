"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Eye, EyeOff, User } from "lucide-react";
import { getSettings, updateSettings, getCurrentAdmin, updateAdminProfile } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { RestaurantSettings } from "@/lib/types/db";

export default function SettingsPage() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  useEffect(() => {
    async function load() {
      const [settingsRes, adminRes] = await Promise.all([
        getSettings(),
        getCurrentAdmin(),
      ]);
      if (settingsRes.ok) {
        setSettings(settingsRes.data);
      } else {
        toast.error(settingsRes.error);
      }
      if (adminRes.ok) {
        setAdminName(adminRes.data?.fullName ?? "");
        setAdminEmail(adminRes.data?.email ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateSettings({
      name: fd.get("name"),
      address: fd.get("address"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      tax_rate_percent: fd.get("tax_rate_percent"),
      service_charge_amount: fd.get("service_charge_amount"),
      receipt_footer: fd.get("receipt_footer"),
    });
    toast[res.ok ? "success" : "error"](res.ok ? "Settings saved" : res.error);
    setSaving(false);
  }

  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAdminSaving(true);
    const res = await updateAdminProfile({
      full_name: adminName,
      email: adminEmail || undefined,
      password: adminPassword || undefined,
    });
    toast[res.ok ? "success" : "error"](res.ok ? "Profile updated" : res.error);
    if (res.ok) setAdminPassword("");
    setAdminSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-card" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center text-muted-foreground">
        Could not load settings.
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="size-6 text-primary" />
        <h1 className="text-xl font-bold text-app-ink">Restaurant Settings</h1>
      </div>

      <Tabs defaultValue="restaurant">
        <TabsList className="h-10">
          <TabsTrigger value="restaurant" className="h-8">
            Restaurant
          </TabsTrigger>
          <TabsTrigger value="admin" className="h-8">
            Admin Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant" className="space-y-6 pt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">General</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Restaurant Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={settings.name}
                    placeholder="Restaurant Name"
                    className="rounded-md h-10"
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    defaultValue={settings.address ?? ""}
                    placeholder="Full address"
                    rows={2}
                    className="rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={settings.phone ?? ""}
                    placeholder="+92 300 1234567"
                    className="rounded-md h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={settings.email ?? ""}
                    placeholder="contact@restaurant.com"
                    className="rounded-md h-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tax & Charges</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tax_rate_percent">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate_percent"
                    name="tax_rate_percent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={settings.tax_rate_percent}
                    placeholder="0"
                    className="rounded-md h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_charge_amount">Service Charge (PKR)</Label>
                  <Input
                    id="service_charge_amount"
                    name="service_charge_amount"
                    type="number"
                    min={0}
                    defaultValue={settings.service_charge_amount}
                    placeholder="0"
                    className="rounded-md h-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receipt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="receipt_footer">Receipt Footer</Label>
                <Textarea
                  id="receipt_footer"
                  name="receipt_footer"
                  defaultValue={settings.receipt_footer ?? ""}
                  placeholder="Thank you for dining with us!"
                  rows={3}
                  className="rounded-md"
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="rounded-md h-10">
                <Save className="mr-2 size-4" />
                {saving ? "Saving…" : "Save Settings"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="admin" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4" /> Admin Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="admin-name">Name</Label>
                <Input
                  id="admin-name"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Admin Name"
                  className="rounded-md h-10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@restaurant.com"
                  className="rounded-md h-10"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showAdminPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="rounded-md h-10 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground hover:text-foreground"
                  >
                    {showAdminPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleAdminSubmit}
                  disabled={adminSaving}
                  className="rounded-md h-10"
                >
                  <Save className="mr-2 size-4" />
                  {adminSaving ? "Saving…" : "Update Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

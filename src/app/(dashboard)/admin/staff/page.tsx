"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  ShieldCheck,
  ShieldX,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  X,
  Save,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLE_LABEL } from "@/lib/permissions";
import {
  createStaff,
  updateStaff,
  reactivateStaff,
  deactivateStaff,
  deleteStaff,
} from "@/actions/tables";
import type { Staff, StaffRole } from "@/lib/types/db";

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  function askConfirm(
    title: string,
    message: string,
    onConfirm: () => void,
  ) {
    setConfirmConfig({ title, message, onConfirm });
    setConfirmOpen(true);
  }

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("staff")
      .select("*")
      .order("created_at", { ascending: false });
    setStaff(data ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
            <p className="text-sm text-muted-foreground">
              Manage roles and access
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} className="h-8">
          <Plus className="size-4 mr-1" /> Add Staff
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Name
          </p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Role
          </p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Status
          </p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Actions
          </p>
        </div>
        <div className="divide-y divide-border">
          {staff.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No staff members yet. Create an auth user in Supabase, then add
              them here.
            </p>
          )}
          {staff
            .filter((s) => s.role !== "ADMIN")
            .map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {s.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {s.user_id.slice(0, 16)}…
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="text-xs shrink-0 font-medium"
              >
                {ROLE_LABEL[s.role]}
              </Badge>
              <Badge
                variant={s.active ? "default" : "secondary"}
                className={`text-xs shrink-0 ${s.active ? "bg-success/15 text-success border-success/20" : "bg-muted text-muted-foreground"}`}
              >
                {s.active ? "Active" : "Inactive"}
              </Badge>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setEditingStaff(s)}
                  title="Edit role"
                >
                  <Pencil className="size-3.5" />
                </Button>
                {s.active ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      askConfirm(
                        "Deactivate Staff",
                        `Deactivate "${s.full_name}"? They will no longer be able to log in.`,
                        async () => {
                          const res = await deactivateStaff(s.id);
                          if (res.ok) {
                            toast.success("Deactivated");
                            refresh();
                          } else toast.error(res.error);
                        },
                      )
                    }
                    title="Deactivate"
                  >
                    <ShieldX className="size-3.5 text-danger" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={async () => {
                      const res = await reactivateStaff(s.id);
                      if (res.ok) {
                        toast.success("Reactivated");
                        refresh();
                      } else toast.error(res.error);
                    }}
                    title="Reactivate"
                  >
                    <ShieldCheck className="size-3.5 text-success" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    askConfirm(
                      "Delete Staff",
                      `Delete "${s.full_name}"? This will permanently remove their account.`,
                      async () => {
                        const res = await deleteStaff(s.id, s.user_id);
                        if (res.ok) {
                          toast.success("Deleted");
                          refresh();
                        } else toast.error(res.error);
                      },
                    )
                  }
                  title="Delete"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add staff modal */}
      {showNew && (
        <NewStaffModal
          onClose={() => setShowNew(false)}
          onSave={async (data) => {
            const res = await createStaff(data);
            if (res.ok) {
              toast.success("Staff member added");
              refresh();
              setShowNew(false);
            } else toast.error(res.error);
          }}
        />
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmConfig?.title ?? "Confirm"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmConfig?.message}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              className="h-8"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                confirmConfig?.onConfirm();
                setConfirmOpen(false);
              }}
              className="h-8"
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit staff modal */}
      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSave={async (data) => {
            const res = await updateStaff(
              editingStaff.id,
              editingStaff.user_id,
              data,
            );
            if (res.ok) {
              toast.success("Staff updated");
              refresh();
              setEditingStaff(null);
            } else toast.error(res.error);
          }}
        />
      )}
    </div>
  );
}

function EditStaffModal({
  staff,
  onClose,
  onSave,
}: {
  staff: Staff;
  onClose: () => void;
  onSave: (data: {
    full_name: string;
    email: string;
    password: string;
    role: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(staff.full_name);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<StaffRole>(staff.role as StaffRole);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Staff — {staff.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="rounded-md h-10"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Leave blank to keep current"
              className="rounded-md h-10"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="rounded-md h-10 pr-10"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
            >
              {Object.entries(ROLE_LABEL)
                .filter(([k]) => k !== "ADMIN")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() =>
                onSave({
                  full_name: name,
                  email,
                  password,
                  role,
                })
              }
              className="h-8"
            >
              <Save className="size-3.5 mr-1" /> Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewStaffModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: {
    full_name: string;
    email: string;
    password: string;
    role: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("WAITER");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl space-y-4 mx-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Add Staff</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={name}
              placeholder="Enter full name"
              onChange={(e) => setName(e.target.value)}
              className="rounded-md h-10"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              placeholder="Enter email"
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md h-10"
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder="Min 6 characters"
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md h-10 pr-10"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {Object.entries(ROLE_LABEL)
                .filter(([k]) => k !== "ADMIN")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onSave({ full_name: name, email, password, role })
            }
            className="h-8"
          >
            <Save className="size-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}

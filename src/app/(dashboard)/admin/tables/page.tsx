"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Download,
  Printer,
  Trash2,
  QrCode,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTable, deleteTable } from "@/actions/tables";
import { buildQrUrl } from "@/lib/qr-url";
import QRCode from "qrcode";
import type { RestaurantTable, QrToken } from "@/lib/types/db";

export default function AdminTablesPage() {
  const [tables, setTables] = useState<
    (RestaurantTable & { qr_token?: QrToken })[]
  >([]);
  const [showNew, setShowNew] = useState(false);
  const [qrPreview, setQrPreview] = useState<{
    tableName: string;
    token: string;
  } | null>(null);
  const [loadingQr, setLoadingQr] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const [tablesRes, tokensRes, settingsRes] = await Promise.all([
      supabase.from("tables").select("*").order("name"),
      supabase.from("qr_tokens").select("*").is("revoked_at", null),
      supabase.from("restaurant_settings").select("name").single(),
    ]);
    const tMap = new Map(tokensRes.data?.map((t) => [t.table_id, t]));
    setTables(
      (tablesRes.data ?? []).map((t) => ({ ...t, qr_token: tMap.get(t.id) })),
    );
    if (settingsRes.data?.name) setRestaurantName(settingsRes.data.name);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function askConfirm(
    title: string,
    message: string,
    onConfirm: () => void,
  ) {
    setConfirmConfig({ title, message, onConfirm });
    setConfirmOpen(true);
  }

  async function handleCreate(data: {
    name: string;
    seat_capacity: number;
  }) {
    const res = await createTable(data);
    if (res.ok) {
      toast.success(`Table "${data.name}" created`);
      refresh();
      setShowNew(false);
      // Show the QR for the new table
      if (res.data.token)
        setQrPreview({ tableName: data.name, token: res.data.token });
    } else toast.error(res.error);
  }

  async function handleDownloadQr(token: string, tableName: string) {
    setLoadingQr(token);
    try {
      const url = buildQrUrl(token);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 600,
        margin: 2,
        color: { dark: "#1F1A17", light: "#FFF8F1" },
      });
      // Trigger download
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr-${tableName.toLowerCase().replace(/\s+/g, "-")}.png`;
      a.click();
      toast.success("QR downloaded");
    } catch {
      toast.error("Failed to generate QR image");
    }
    setLoadingQr(null);
  }

  async function handlePrintQr(token: string, tableName: string) {
    setLoadingQr(token);
    try {
      const url = buildQrUrl(token);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 500,
        margin: 2,
        color: { dark: "#1F1A17", light: "#FFF8F1" },
      });
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      iframe.style.width = "0";
      iframe.style.height = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
<!DOCTYPE html>
<html><head><title>QR — ${tableName}</title>
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #fff;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  }
  .card {
    width: 400px;
    padding: 32px;
    text-align: center;
  }
  .restaurant {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #9ca3af;
    margin-bottom: 20px;
  }
  .qr-wrap {
    width: 300px;
    height: 300px;
    margin: 0 auto;
    border-radius: 12px;
    overflow: hidden;
    background: #fff8f1;
  }
  .qr-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .table-name {
    margin-top: 20px;
    font-size: 22px;
    font-weight: 700;
    color: #111827;
  }
  .subtitle {
    margin-top: 6px;
    font-size: 13px;
    color: #6b7280;
    letter-spacing: 0.02em;
  }
  .divider {
    width: 40px;
    height: 2px;
    background: #e5e7eb;
    margin: 16px auto 0;
    border-radius: 1px;
  }
</style></head>
<body>
  <div class="card">
    <div class="restaurant">${restaurantName}</div>
    <div class="qr-wrap"><img src="${dataUrl}"/></div>
    <div class="table-name">${tableName}</div>
    <div class="subtitle">Scan to Order</div>
    <div class="divider"></div>
  </div>
</body></html>`);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 300);
      }
    } catch {
      toast.error("Failed to generate QR");
    }
    setLoadingQr(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tables</h1>
          <p className="text-sm text-muted-foreground">
            Manage tables and QR codes
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} className="h-8">
          <Plus className="size-4 mr-1" /> Table
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <div
            key={table.id}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{table.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {table.seat_capacity} seats
                </p>
              </div>
              <StatusBadge status={table.status} />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={loadingQr === table.qr_token?.token}
                onClick={() =>
                  table.qr_token &&
                  handleDownloadQr(table.qr_token.token, table.name)
                }
              >
                <Download className="size-3.5 mr-1" /> QR
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={loadingQr === table.qr_token?.token}
                onClick={() =>
                  table.qr_token &&
                  handlePrintQr(table.qr_token.token, table.name)
                }
              >
                <Printer className="size-3.5 mr-1" /> Print
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                title="Delete table"
                onClick={() =>
                  askConfirm(
                    "Delete Table",
                    `Delete "${table.name}"? This cannot be undone.`,
                    async () => {
                      const res = await deleteTable(table.id);
                      if (res.ok) {
                        toast.success("Deleted");
                        refresh();
                      } else toast.error(res.error);
                    },
                  )
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* New table modal */}
      {showNew && (
        <NewTableModal
          onClose={() => setShowNew(false)}
          onSave={handleCreate}
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
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR preview modal */}
      {qrPreview && (
        <QrPreviewModal
          tableName={qrPreview.tableName}
          token={qrPreview.token}
          onClose={() => setQrPreview(null)}
          onDownload={() =>
            handleDownloadQr(qrPreview.token, qrPreview.tableName)
          }
          onPrint={() => handlePrintQr(qrPreview.token, qrPreview.tableName)}
        />
      )}
    </div>
  );
}

function NewTableModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: {
    name: string;
    seat_capacity: number;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("4");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl space-y-4 mx-4">
        <h2 className="font-semibold">New Table</h2>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Table Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="T1"
              className="rounded-md h-10"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Seats</Label>
            <Input
              type="number"
              min="1"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="rounded-md h-10"
              required
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onSave({ name, seat_capacity: Number(seats) })
            }
            className="h-8"
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

function QrPreviewModal({
  tableName,
  token,
  onClose,
  onDownload,
  onPrint,
}: {
  tableName: string;
  token: string;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(buildQrUrl(token), {
      width: 400,
      margin: 2,
      color: { dark: "#1F1A17", light: "#FFF8F1" },
    }).then(setQrDataUrl);
  }, [token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl space-y-4 mx-4 text-center">
        <h2 className="font-semibold">{tableName} — QR Code</h2>
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt={`QR for ${tableName}`}
            className="mx-auto w-64 h-64 rounded-lg"
          />
        ) : (
          <div className="mx-auto flex size-64 items-center justify-center rounded-lg bg-muted animate-pulse">
            <QrCode className="size-10 text-muted-foreground" />
          </div>
        )}
        <p className="text-xs text-muted-foreground break-all font-mono">
          /qr/{token.slice(0, 16)}…
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={onDownload} className="h-8">
            <Download className="size-3.5 mr-1" /> Download
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint} className="h-8">
            <Printer className="size-3.5 mr-1" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="h-8">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

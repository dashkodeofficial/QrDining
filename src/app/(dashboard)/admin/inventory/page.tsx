"use client";

import { useEffect, useState } from "react";
import { Package, Plus, Trash2, Save } from "lucide-react";
import {
  getInventory,
  updateInventory,
  createInventory,
  deleteInventory,
} from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import type { Inventory } from "@/lib/types/db";

export default function InventoryPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getInventory();
      if (res.ok) setItems(res.data);
      else toast.error(res.error);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate(fd: FormData) {
    const res = await createInventory({
      name: fd.get("name"),
      quantity: fd.get("quantity"),
      low_stock_threshold: fd.get("low_stock_threshold"),
    });
    toast[res.ok ? "success" : "error"](res.ok ? "Item added" : res.error);
    if (res.ok) {
      const updated = await getInventory();
      if (updated.ok) setItems(updated.data);
    }
  }

  async function handleUpdate(id: string, fd: FormData) {
    const res = await updateInventory(id, {
      name: fd.get("name"),
      quantity: fd.get("quantity"),
      low_stock_threshold: fd.get("low_stock_threshold"),
    });
    toast[res.ok ? "success" : "error"](res.ok ? "Item updated" : res.error);
    if (res.ok) {
      const updated = await getInventory();
      if (updated.ok) setItems(updated.data);
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteInventory(id);
    toast[res.ok ? "success" : "error"](res.ok ? "Item deleted" : res.error);
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="size-6 text-primary" />
          <h1 className="text-xl font-bold text-app-ink">Inventory</h1>
        </div>
        <AddItemDialog onCreate={handleCreate} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No inventory items"
          description="Add stock for bottled drinks, cans, and packaged items."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <InventoryItemCard
              key={item.id}
              item={item}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InventoryItemCard({
  item,
  onUpdate,
  onDelete,
}: {
  item: Inventory;
  onUpdate: (id: string, fd: FormData) => void;
  onDelete: (id: string) => void;
}) {
  const isLow = item.quantity <= item.low_stock_threshold;
  const isOut = item.quantity === 0;

  return (
    <Card>
      <CardContent className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUpdate(item.id, new FormData(e.currentTarget));
          }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <Input
              name="name"
              defaultValue={item.name}
              className="max-w-[200px] rounded-md h-9"
              required
            />
            <Badge
              variant={isOut ? "destructive" : isLow ? "secondary" : "default"}
            >
              {isOut ? "Out of stock" : isLow ? "Low stock" : "In stock"}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Quantity</Label>
              <Input
                name="quantity"
                type="number"
                min={0}
                defaultValue={item.quantity}
                className="rounded-md h-9"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Low stock threshold</Label>
              <Input
                name="low_stock_threshold"
                type="number"
                min={0}
                defaultValue={item.low_stock_threshold}
                className="rounded-md h-9"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onDelete(item.id)}
              className="h-9"
            >
              <Trash2 className="size-4" />
            </Button>
            <Button type="submit" size="sm" className="h-9">
              <Save className="mr-1 size-4" /> Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AddItemDialog({ onCreate }: { onCreate: (fd: FormData) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus className="mr-1 size-4" /> Add Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCreate(new FormData(e.currentTarget));
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              name="name"
              type="text"
              placeholder="Item Name"
              className="rounded-md h-10"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-quantity">Quantity</Label>
              <Input
                id="new-quantity"
                name="quantity"
                type="number"
                min={0}
                defaultValue={0}
                className="rounded-md h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-threshold">Low stock threshold</Label>
              <Input
                id="new-threshold"
                name="low_stock_threshold"
                type="number"
                min={0}
                defaultValue={6}
                className="rounded-md h-10"
              />
            </div>
          </div>
          <Button type="submit" className="w-full rounded-md h-10">
            Add Item
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

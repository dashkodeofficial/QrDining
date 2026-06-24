"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Save,
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  ImageOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Price } from "@/components/shared/price";
import { ImageIcon } from "lucide-react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "@/actions/menu";
import type { Category, MenuItem } from "@/lib/types/db";

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemPage, setItemPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  async function refresh() {
    const supabase = createClient();
    const [catRes, itemRes] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("menu_items").select("*").order("sort_order"),
    ]);
    setCategories(catRes.data ?? []);
    setItems(itemRes.data ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredItems = activeCat
    ? items.filter((i) => i.category_id === activeCat)
    : items;
  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / ITEMS_PER_PAGE),
  );
  const pagedItems = filteredItems.slice(
    (itemPage - 1) * ITEMS_PER_PAGE,
    itemPage * ITEMS_PER_PAGE,
  );

  function askConfirm(title: string, message: string, onConfirm: () => void) {
    setConfirmConfig({ title, message, onConfirm });
    setConfirmOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <UtensilsCrossed className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
            <p className="text-sm text-muted-foreground">
              Manage categories and items
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowNewCat(true)} className="h-8">
          <Plus className="size-4 mr-1" /> Category
        </Button>
      </div>

      {/* Category bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setActiveCat(null);
            setItemPage(1);
          }}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${activeCat === null ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
        >
          All
        </button>
        {categories.map((c) => (
          <div key={c.id} className="group flex items-center gap-1">
            <button
              onClick={() => {
                setActiveCat(c.id);
                setItemPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${activeCat === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            >
              {c.name}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setEditingCat(c)}
            >
              <Pencil className="size-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Items grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Items ({filteredItems.length})
          </h2>
          <Button size="sm" onClick={() => setShowNewItem(true)} className="h-8">
            <Plus className="size-4 mr-1" /> Item
          </Button>
        </div>

        {pagedItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">No items yet.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pagedItems.map((item) => (
            <div
              key={item.id}
              className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="size-16 object-cover"
                    />
                  ) : (
                    <ImageOff className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold">
                      {item.name}
                    </p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={async () => {
                          const res = await toggleMenuItemAvailability(
                            item.id,
                            !item.available,
                          );
                          if (res.ok) {
                            toast.success(
                              item.available
                                ? "Marked unavailable"
                                : "Marked available",
                            );
                            refresh();
                          } else toast.error(res.error);
                        }}
                        title={
                          item.available ? "Hide from menu" : "Show on menu"
                        }
                      >
                        {item.available ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setEditingItem(item)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() =>
                          askConfirm(
                            "Delete Item",
                            `Are you sure you want to delete "${item.name}"?`,
                            async () => {
                              const res = await deleteMenuItem(item.id);
                              if (res.ok) {
                                toast.success("Deleted");
                                refresh();
                              } else toast.error(res.error);
                            },
                          )
                        }
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {catName(item.category_id)}
                  </p>
                  {item.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <Price
                      cents={item.price_cents}
                      className="text-sm font-bold text-primary"
                    />
                    {item.popular && (
                      <Badge
                        variant="secondary"
                        className="gap-1 text-[10px] px-1.5 py-0"
                      >
                        <Star className="size-2.5" /> Popular
                      </Badge>
                    )}
                    {!item.available && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 text-muted-foreground"
                      >
                        Unavailable
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={itemPage === 1}
              onClick={() => setItemPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {itemPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={itemPage === totalPages}
              onClick={() => setItemPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

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

      {/* Dialogs (inline modals) */}
      {showNewCat && (
        <CategoryFormModal
          onClose={() => setShowNewCat(false)}
          onSave={async (data) => {
            const res = await createCategory(data);
            if (res.ok) {
              toast.success("Category created");
              refresh();
              setShowNewCat(false);
            } else toast.error(res.error);
          }}
        />
      )}
      {editingCat && (
        <CategoryFormModal
          category={editingCat}
          onClose={() => setEditingCat(null)}
          onSave={async (data) => {
            const res = await updateCategory(editingCat.id, data);
            if (res.ok) {
              toast.success("Updated");
              refresh();
              setEditingCat(null);
            } else toast.error(res.error);
          }}
          onDelete={() => {
            askConfirm(
              "Delete Category",
              `Delete "${editingCat.name}"? This cannot be undone.`,
              async () => {
                const res = await deleteCategory(editingCat.id);
                if (res.ok) {
                  toast.success("Deleted");
                  refresh();
                  setEditingCat(null);
                } else toast.error(res.error);
              },
            );
          }}
        />
      )}
      {showNewItem && (
        <MenuItemFormModal
          categories={categories}
          onClose={() => setShowNewItem(false)}
          onSave={async (data) => {
            const res = await createMenuItem(data);
            if (res.ok) {
              toast.success("Item created");
              refresh();
              setShowNewItem(false);
            } else toast.error(res.error);
          }}
        />
      )}
      {editingItem && (
        <MenuItemFormModal
          categories={categories}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (data) => {
            const res = await updateMenuItem(editingItem.id, data);
            if (res.ok) {
              toast.success("Updated");
              refresh();
              setEditingItem(null);
            } else toast.error(res.error);
          }}
        />
      )}
    </div>
  );
}

/* ---- Modals (simplified inline dialog pattern for Phase 1) ---- */

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function CategoryFormModal({
  category,
  onClose,
  onSave,
  onDelete,
}: {
  category?: Category;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const autoSlug = category ? category.slug : slugify(name);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit Category" : "New Category"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Courses"
              className="rounded-md h-10"
            />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={autoSlug}
              placeholder="main-courses"
              disabled
              className="rounded-md h-10 bg-muted text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex justify-between pt-2">
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete} className="h-8">
              <Trash2 className="size-3.5 mr-1" /> Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={onClose} className="h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => onSave({ name, slug: autoSlug, sort_order: 0 })}
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

function MenuItemFormModal({
  categories,
  item,
  onClose,
  onSave,
}: {
  categories: Category[];
  item?: MenuItem;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [catId, setCatId] = useState(
    item?.category_id ?? categories[0]?.id ?? "",
  );
  const [name, setName] = useState(item?.name ?? "");
  const [desc, setDesc] = useState(item?.description ?? "");
  const [price, setPrice] = useState(
    item ? String(item.price_cents) : "",
  );
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [popular, setPopular] = useState(item?.popular ?? false);
  const [available, setAvailable] = useState(item?.available ?? true);
  const [uploading, setUploading] = useState(false);

  async function deleteStorageImage(url: string) {
    if (!url) return;
    try {
      const path = new URL(url).pathname.split("/").pop();
      if (path) {
        const supabase = createClient();
        await supabase.storage.from("menu-images").remove([path]);
      }
    } catch {
      // ignore parse errors
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast.error("Image must be under 1 MB");
      return;
    }

    setUploading(true);
    const oldUrl = imageUrl;
    const supabase = createClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("menu-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("menu-images")
      .getPublicUrl(fileName);
    setImageUrl(data.publicUrl);
    setUploading(false);
    if (oldUrl) deleteStorageImage(oldUrl);
  }

  function handleRemoveImage() {
    const oldUrl = imageUrl;
    setImageUrl("");
    if (oldUrl) deleteStorageImage(oldUrl);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "New Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category <span className="text-danger">*</span></Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Name <span className="text-danger">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
              className="rounded-md h-10"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="Brief description…"
              className="rounded-md"
            />
          </div>
          <div className="space-y-2">
            <Label>Price (Rs.) <span className="text-danger">*</span></Label>
            <Input
              type="number"
              step="1"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className="rounded-md h-10"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            {imageUrl ? (
              <div className="relative w-full h-32 rounded-lg border overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <Label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 hover:bg-muted">
                <ImageIcon className="mb-1 size-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {uploading ? "Uploading…" : "Click to upload image"}
                </span>
                <Input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </Label>
            )}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={popular}
                onChange={(e) => setPopular(e.target.checked)}
                className="rounded"
              />
              Popular
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="rounded"
              />
              Available
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onSave({
                category_id: catId,
                name,
                description: desc,
                price: Number(price),
                image_url: imageUrl,
                popular,
                available,
                sort_order: 0,
              })
            }
            className="h-8"
          >
            <Save className="size-3.5 mr-1" /> Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

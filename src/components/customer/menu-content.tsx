"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Star, Plus, ShoppingCart, SlidersHorizontal, ArrowUpDown, Trash2, ArrowRight, Flame, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { QuantityStepper } from "@/components/shared/quantity-stepper";
import { Price } from "@/components/shared/price";
import { useCart } from "@/stores/cart";
import { placeOrder } from "@/actions/orders";
import { getTablesForAdmin } from "@/actions/customer";
import { useAdmin } from "@/components/customer/admin-context";
import type { Category, MenuItem, RestaurantTable } from "@/lib/types/db";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  categories: Category[];
  items: MenuItem[];
  restaurantName: string;
}

type SortOption = "recommended" | "price-asc" | "price-desc";

export default function MenuContent({ categories, items, restaurantName }: Props) {
  const router = useRouter();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [filterPopular, setFilterPopular] = useState(false);

  // Selected item for details dialog/sheet
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [detailNotes, setDetailNotes] = useState("");

  // Cart state
  const lines = useCart((s) => s.lines);
  const count = useCart((s) => s.count());
  const totalCents = useCart((s) => s.totalCents());
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQuantity);
  const setNotes = useCart((s) => s.setNotes);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);

  const [orderNotes, setOrderNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const { isAdmin, selectedTableId, setSelectedTableId } = useAdmin();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  useEffect(() => {
    if (!isAdmin) return;
    getTablesForAdmin().then((res) => {
      if (res.ok) setTables(res.data);
    });
  }, [isAdmin]);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Sorting & Filtering logic
  const filteredAndSortedItems = useMemo(() => {
    let list = [...items];

    // Filter by category
    if (activeSlug) {
      list = list.filter((i) => {
        const cat = categories.find((c) => c.id === i.category_id);
        return cat?.slug === activeSlug;
      });
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }

    // Popular Filter
    if (filterPopular) {
      list = list.filter((i) => i.popular);
    }

    // Sort options
    if (sortBy === "price-asc") {
      list.sort((a, b) => a.price_cents - b.price_cents);
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => b.price_cents - a.price_cents);
    } else {
      // Default: sort_order, then popular items first
      list.sort((a, b) => {
        if (a.popular && !b.popular) return -1;
        if (!a.popular && b.popular) return 1;
        return a.sort_order - b.sort_order;
      });
    }

    return list;
  }, [items, categories, activeSlug, search, sortBy, filterPopular]);

  function handleAddToCart(item: MenuItem, qty = 1, notes = "") {
    add({
      menu_item_id: item.id,
      name: item.name,
      unit_price_cents: item.price_cents,
      image_url: item.image_url,
      quantity: qty,
      notes: notes,
    });
    toast.success(`${item.name} added to cart`);
  }

  function handleDetailAddToCart() {
    if (!selectedItem) return;
    handleAddToCart(selectedItem, detailQty, detailNotes);
    setSelectedItem(null);
    setDetailQty(1);
    setDetailNotes("");
  }

  function handleCategoryClick(slug: string | null) {
    setActiveSlug(slug);
    if (slug && sectionRefs.current[slug]) {
      sectionRefs.current[slug]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function handlePlaceOrder() {
    if (isAdmin && !selectedTableId) {
      toast.error("Please select a table before placing an order.");
      return;
    }
    setPlacing(true);
    const result = await placeOrder({
      items: lines.map((l) => ({
        menu_item_id: l.menu_item_id,
        name: l.name,
        unit_price_cents: l.unit_price_cents,
        quantity: l.quantity,
        notes: l.notes,
      })),
      notes: orderNotes,
      tableId: isAdmin ? selectedTableId : undefined,
    });

    if (!result.ok) {
      toast.error(result.error);
      setPlacing(false);
      return;
    }

    clear();
    toast.success("Order placed successfully!");
    router.push(`/orders/${result.data.orderId}`);
    setPlacing(false);
  }

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "recommended", label: "Recommended" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
  ];

  const filterChips = [
    { label: "Popular", active: filterPopular, toggle: () => setFilterPopular(!filterPopular), icon: Flame },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        
        {/* ========================================== */}
        {/* COLUMN 1: SIDEBAR FILTERS (Left - Desktop) */}
        {/* ========================================== */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-20 space-y-5 rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            {/* Category selection */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categories</h3>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleCategoryClick(null)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                    activeSlug === null
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <span>All Dishes</span>
                  <Badge variant="secondary" className={cn("text-[10px]", activeSlug === null ? "bg-primary-foreground/20 text-primary-foreground" : "")}>
                    {items.length}
                  </Badge>
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategoryClick(c.slug)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                      activeSlug === c.slug
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <span className="truncate">{c.name}</span>
                    <Badge variant="secondary" className={cn("text-[10px]", activeSlug === c.slug ? "bg-primary-foreground/20 text-primary-foreground" : "")}>
                      {items.filter((i) => i.category_id === c.id).length}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Sorting Options */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ArrowUpDown className="size-3.5" /> Sort By
              </h3>
              <div className="grid gap-1">
                {[
                  { value: "recommended", label: "Recommended" },
                  { value: "price-asc", label: "Price: Low to High" },
                  { value: "price-desc", label: "Price: High to Low" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortBy(opt.value as SortOption)}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      sortBy === opt.value
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Quick Filters */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5" /> Filters
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterPopular}
                    onChange={(e) => setFilterPopular(e.target.checked)}
                    className="size-4 rounded-md border-border text-primary focus:ring-primary"
                  />
                  <Flame className="size-3.5 text-accent" /> Popular Only
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* ============================================= */}
        {/* COLUMN 2: CENTER CATALOG GRID (Mobile/Desktop) */}
        {/* ============================================= */}
        <main className="min-w-0 flex-1 space-y-4 lg:space-y-6">
          {/* Search bar — mobile + desktop */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search dishes, ingredients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl border-border/50 bg-card pl-10 text-sm shadow-xs focus-visible:ring-primary/30"
            />
          </div>

          {/* Admin: Table selector */}
          {isAdmin && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <LayoutGrid className="size-5 shrink-0 text-primary" />
              <div className="flex-1 space-y-0.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Admin Order — Select Table
                </Label>
                <select
                  value={selectedTableId ?? ""}
                  onChange={(e) => setSelectedTableId(e.target.value || null)}
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Choose a table...</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Seats: {t.seat_capacity})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Mobile: Category pills + sort/filter chips */}
          <div className="space-y-3 lg:hidden">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => handleCategoryClick(null)}
                  className={cn(
                    "inline-flex items-center rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all",
                    activeSlug === null
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card border border-border/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategoryClick(c.slug)}
                    className={cn(
                      "inline-flex items-center rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all",
                      activeSlug === c.slug
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card border border-border/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Sort + filter chips */}
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-1">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortBy(opt.value)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-all",
                      sortBy === opt.value
                        ? "bg-foreground text-background"
                        : "bg-card border border-border/50 text-muted-foreground"
                    )}
                  >
                    <ArrowUpDown className="size-3" />
                    {opt.label}
                  </button>
                ))}
                {filterChips.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={chip.toggle}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-all",
                        chip.active
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border/50 text-muted-foreground"
                      )}
                    >
                      <Icon className="size-3" />
                      {chip.label}
                    </button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Item count */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">
              {filteredAndSortedItems.length} item{filteredAndSortedItems.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Menu items */}
          {filteredAndSortedItems.length === 0 ? (
            <div className="space-y-2 rounded-2xl border border-dashed border-border/60 p-12 text-center">
              <p className="text-4xl">🔍</p>
              <h3 className="font-bold text-foreground">No matches found</h3>
              <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                Try adjusting your filters or searching for something else.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: vertical list of horizontal cards */}
              <div className="space-y-3 lg:hidden">
                {filteredAndSortedItems.map((item) => (
                  <MenuItemCardMobile
                    key={item.id}
                    item={item}
                    onClick={() => { setSelectedItem(item); setDetailQty(1); setDetailNotes(""); }}
                    onAdd={() => handleAddToCart(item)}
                  />
                ))}
              </div>

              {/* Desktop: grid of vertical cards */}
              <div className="hidden gap-6 sm:grid-cols-2 xl:grid-cols-3 lg:block">
                {filteredAndSortedItems.map((item) => (
                  <MenuItemCardDesktop
                    key={item.id}
                    item={item}
                    onClick={() => { setSelectedItem(item); setDetailQty(1); setDetailNotes(""); }}
                    onAdd={() => handleAddToCart(item)}
                  />
                ))}
              </div>
            </>
          )}
        </main>

        {/* ============================================= */}
        {/* COLUMN 3: STICKY DOCKED CART (Right - Desktop) */}
        {/* ============================================= */}
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-20 space-y-4 rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <ShoppingCart className="size-4 text-primary" /> Your Order
            </h3>

            {lines.length === 0 ? (
              <div className="space-y-2 py-10 text-center">
                <span className="block text-3xl">🛒</span>
                <h4 className="text-sm font-bold text-foreground">Empty Cart</h4>
                <p className="mx-auto max-w-[180px] text-[11px] text-muted-foreground">
                  Add items to customize and place your order instantly.
                </p>
              </div>
            ) : (
              <>
                {/* Cart lines */}
                <div className="max-h-[35vh] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                  {lines.map((line) => (
                    <div key={line.menu_item_id} className="flex gap-3 rounded-xl border border-border/40 bg-muted/20 p-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs text-foreground truncate">{line.name}</span>
                          <button
                            type="button"
                            onClick={() => remove(line.menu_item_id)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Note: no spice, extra cheese…"
                          value={line.notes}
                          onChange={(e) => setNotes(line.menu_item_id, e.target.value)}
                          className="w-full bg-background border border-border/50 rounded-md px-2 py-1 text-[10px] focus:outline-none"
                        />
                        <div className="flex items-center justify-between">
                          <QuantityStepper value={line.quantity} onChange={(q) => setQty(line.menu_item_id, q)} size="sm" />
                          <Price cents={line.unit_price_cents * line.quantity} className="text-xs font-bold text-primary" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Table Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="docked-order-notes" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Chef Instructions (Optional)
                  </Label>
                  <Textarea
                    id="docked-order-notes"
                    placeholder="Allergies, prepare together, etc…"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
                    className="rounded-xl text-xs"
                  />
                </div>

                <Separator />

                {/* Summary */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-muted-foreground">Subtotal</span>
                    <Price cents={totalCents} className="text-base text-foreground" />
                  </div>
                  <Button
                    className="w-full rounded-xl h-11 font-bold"
                    size="lg"
                    disabled={placing}
                    onClick={handlePlaceOrder}
                  >
                    {placing ? (
                      <span className="flex items-center gap-2">
                        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Placing Order...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Send to Kitchen <ArrowRight className="size-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </aside>

      </div>

      {/* Floating cart (Mobile only) */}
      <CartFloat />

      {/* Item Detail Modal — Desktop Dialog only */}
      {isDesktop && (
        <Dialog open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
          <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border border-border/50">
            <DetailContent
              item={selectedItem}
              qty={detailQty}
              notes={detailNotes}
              onQtyChange={setDetailQty}
              onNotesChange={setDetailNotes}
              onAdd={handleDetailAddToCart}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Item Detail Sheet — Mobile Sheet only */}
      {!isDesktop && (
        <Sheet open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
          <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl p-0 overflow-hidden border-t border-border/50">
            <SheetHeader className="sr-only">
              <SheetTitle>Item Details</SheetTitle>
            </SheetHeader>
            <DetailContent
              item={selectedItem}
              qty={detailQty}
              notes={detailNotes}
              onQtyChange={setDetailQty}
              onNotesChange={setDetailNotes}
              onAdd={handleDetailAddToCart}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- */

interface DetailProps {
  item: MenuItem | null;
  qty: number;
  notes: string;
  onQtyChange: (q: number) => void;
  onNotesChange: (n: string) => void;
  onAdd: () => void;
}

function DetailContent({ item, qty, notes, onQtyChange, onNotesChange, onAdd }: DetailProps) {
  if (!item) return null;
  return (
    <div className="flex flex-col">
      {item.image_url ? (
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-muted text-4xl">🍴</div>
      )}
      <div className="space-y-4 p-5 lg:p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">{item.name}</h3>
            {item.popular && (
              <Badge className="bg-accent/10 text-accent">
                <Flame className="mr-0.5 size-2.5" /> Popular
              </Badge>
            )}
          </div>
          {item.description && <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Price cents={item.price_cents} className="text-lg font-extrabold text-primary" />
          <QuantityStepper value={qty} onChange={onQtyChange} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="detail-notes" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Special Instructions
          </Label>
          <Textarea
            id="detail-notes"
            placeholder="No onions, extra dressing, sauce on side..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={2}
            className="rounded-xl text-xs"
          />
        </div>

        <Button className="mt-2 h-12 w-full rounded-xl text-sm font-bold" size="lg" onClick={onAdd}>
          Add to Order — <Price cents={item.price_cents * qty} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}

function CartFloat() {
  const count = useCart((s) => s.count());
  const total = useCart((s) => s.totalCents());
  if (count === 0) return null;
  return (
    <a
      href="/cart"
      className="fixed min-w-[275px] bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center justify-center gap-3 rounded-full bg-primary px-5 py-3 shadow-xl transition-transform hover:shadow-2xl active:scale-95 lg:hidden"
    >
      <ShoppingCart className="size-4 text-primary-foreground" />
      <span className="text-sm font-bold text-primary-foreground">View Cart ({count})</span>
      <span className="text-sm font-bold text-primary-foreground opacity-80">·</span>
      <span className="text-sm font-extrabold text-primary-foreground"><Price cents={total} /></span>
    </a>
  );
}

/* ----------------------------------------------------------------------- */

function MenuItemCardMobile({ item, onClick, onAdd }: { item: MenuItem; onClick: () => void; onAdd: () => void }) {
  return (
    <div
      className="flex cursor-pointer gap-3 rounded-2xl border border-border/50 bg-card p-3 shadow-xs transition-all hover:shadow-sm"
      onClick={onClick}
    >
      <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🍴</div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-sm font-bold text-foreground">{item.name}</h4>
            {item.popular && (
              <Badge className="shrink-0 bg-accent/10 text-accent hover:bg-accent/20">
                <Flame className="mr-0.5 size-2.5" /> Popular
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <Price cents={item.price_cents} className="text-sm font-extrabold text-primary" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-200 hover:scale-110 active:scale-95"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuItemCardDesktop({ item, onClick, onAdd }: { item: MenuItem; onClick: () => void; onAdd: () => void }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
      <div className="relative aspect-[16/10] w-full cursor-pointer overflow-hidden bg-muted" onClick={onClick}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🍴</div>
        )}
        {item.popular && (
          <Badge className="absolute left-3 top-3 bg-accent/90 text-white shadow-sm">
            <Flame className="mr-0.5 size-2.5" /> Popular
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div className="space-y-1">
          <h4
            className="cursor-pointer truncate text-sm font-bold text-foreground transition-colors hover:text-primary"
            onClick={onClick}
          >
            {item.name}
          </h4>
          {item.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <Price cents={item.price_cents} className="text-sm font-extrabold text-primary" />
          <div className="flex items-center gap-1.5">
            <Button
              onClick={onClick}
              variant="secondary"
              size="sm"
              className="h-8 rounded-lg text-[10px] font-bold"
            >
              Details
            </Button>
            <button
              type="button"
              onClick={onAdd}
              className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-200 hover:scale-110 active:scale-95"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
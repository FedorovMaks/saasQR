"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useCartStore } from "@/stores/cart-store";
import { useGuestOrdersStore, type GuestOrder } from "@/stores/guest-orders-store";
import { formatPrice, cn } from "@/lib/utils";
import {
  ShoppingBag,
  Plus,
  Minus,
  X,
  Loader2,
  MessageSquare,
  ClipboardList,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Bell,
  Check,
} from "lucide-react";

type Variant = { id: string; label: string; price: number };
type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isStopped: boolean;
  variants: Variant[];
  calories: number | null;
  proteins: number | null;
  fats: number | null;
  carbs: number | null;
  composition: string | null;
};
type Category = { id: string; name: string; items: MenuItem[] };
type Venue = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  accentColor?: string;
  categories: Category[];
};

export function MenuPage({
  venue,
  tableNumber: initialTable,
  showWatermark = false,
}: {
  venue: Venue;
  tableNumber?: string;
  showWatermark?: boolean;
}) {
  const {
    items: cartItems,
    addItem,
    removeItem,
    updateQuantity,
    setVenueId,
    setTableNumber,
    totalItems,
    totalPrice,
    tableNumber,
    comment,
    setComment,
    clearCart,
  } = useCartStore();

  const [activeCategoryId, setActiveCategoryId] = useState(
    venue.categories[0]?.id || ""
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);

  // Guest orders
  const { orders: allGuestOrders, addOrder, updateStatus, clearOldOrders, getActiveOrders } = useGuestOrdersStore();
  const activeOrders = getActiveOrders(venue.id);
  const myOrders = allGuestOrders.filter((o) => o.venueId === venue.id);

  // Clean up old orders on mount
  useEffect(() => { clearOldOrders(); }, [clearOldOrders]);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setVenueId(venue.id);
    if (initialTable) setTableNumber(initialTable);
  }, [venue.id, initialTable, setVenueId, setTableNumber]);

  function scrollToCategory(id: string) {
    setActiveCategoryId(id);
    const el = categoryRefs.current[id];
    if (!el) return;
    const headerH = headerRef.current?.offsetHeight ?? 0;
    const top = el.getBoundingClientRect().top + window.scrollY - headerH - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  // Scroll-spy: подсветка категории, чья секция сейчас под хедером
  useEffect(() => {
    function onScroll() {
      const headerH = headerRef.current?.offsetHeight ?? 0;
      const line = headerH + 20;
      let current = venue.categories[0]?.id || "";
      for (const cat of venue.categories) {
        const el = categoryRefs.current[cat.id];
        if (!el) continue;
        if (el.getBoundingClientRect().top - line <= 0) current = cat.id;
        else break;
      }
      setActiveCategoryId((prev) => (prev === current ? prev : current));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [venue.categories]);

  // Активный таб подъезжает в видимую область горизонтального списка
  useEffect(() => {
    tabRefs.current[activeCategoryId]?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [activeCategoryId]);

  function handleAddItem(item: MenuItem, variant?: Variant) {
    if (item.isStopped) return;
    addItem({
      menuItemId: item.id,
      variantId: variant?.id,
      name: item.name,
      variantLabel: variant?.label,
      price: variant?.price ?? item.price,
      imageUrl: item.imageUrl,
    });
  }

  function handleItemClick(item: MenuItem) {
    if (item.isStopped) return;
    setDetailItem(item);
    // Pre-select first variant if available
    setSelectedVariant(item.variants.length > 0 ? item.variants[0] : null);
  }

  function handleAddFromDetail() {
    if (!detailItem) return;
    handleAddItem(detailItem, selectedVariant || undefined);
    setDetailItem(null);
    setSelectedVariant(null);
  }

  function getItemCartCount(itemId: string) {
    return cartItems
      .filter((ci) => ci.menuItemId === itemId)
      .reduce((sum, ci) => sum + ci.quantity, 0);
  }

  async function handleOrder() {
    if (cartItems.length === 0) return;
    setOrdering(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: venue.id,
          tableNumber: tableNumber || undefined,
          comment: comment || undefined,
          items: cartItems.map((i) => ({
            menuItemId: i.menuItemId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Ошибка оформления заказа");
        return;
      }

      // Save order for guest tracking
      addOrder({
        id: data.id,
        orderNumber: data.orderNumber,
        totalAmount: data.totalAmount,
        status: "NEW",
        createdAt: new Date().toISOString(),
        venueId: venue.id,
        items: cartItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          variantLabel: i.variantLabel,
        })),
      });

      clearCart();
      setCartOpen(false);

      // Redirect to payment if YooKassa, otherwise stay on menu & show orders
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      } else {
        setOrdersOpen(true);
      }
    } catch {
      alert("Ошибка соединения");
    } finally {
      setOrdering(false);
    }
  }

  async function handleCallWaiter() {
    if (!tableNumber) {
      alert("Укажите номер столика");
      return;
    }
    setCallingWaiter(true);
    try {
      const res = await fetch(`/api/venues/${venue.id}/call-waiter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Ошибка вызова");
        return;
      }
      setWaiterCalled(true);
      setTimeout(() => setWaiterCalled(false), 30_000);
    } catch {
      alert("Ошибка соединения");
    } finally {
      setCallingWaiter(false);
    }
  }

  const itemCount = totalItems();
  const total = totalPrice();

  const accent = venue.accentColor || "#3c6e71";

  /* ═══════ Main ═══════ */
  return (
    <div
      className="flex flex-1 flex-col min-h-screen bg-white pb-32"
      style={{ "--accent": accent, "--accent-shadow": `${accent}40` } as React.CSSProperties}
    >

      {/* ── Header ── */}
      <header ref={headerRef} className="sticky top-0 z-20 bg-white border-b border-[#e8e8e8]">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-4">
          {venue.logoUrl ? (
            <Image
              src={venue.logoUrl}
              alt={venue.name}
              width={48}
              height={48}
              className="rounded-sm object-cover shrink-0"
              style={{ width: 48, height: 48 }}
            />
          ) : (
            <div className="w-12 h-12 rounded-sm shrink-0 flex items-center justify-center" style={{ backgroundColor: accent }}>
              <span className="text-white font-extrabold text-xl">
                {venue.name[0]}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-xl truncate leading-tight text-[#1a1a1a]">{venue.name}</h1>
            {venue.description && (
              <p className="text-sm text-[#a0a0a0] truncate mt-0.5">
                {venue.description}
              </p>
            )}
          </div>
          {tableNumber && (
            <button
              onClick={handleCallWaiter}
              disabled={callingWaiter || waiterCalled}
              className={cn(
                "shrink-0 flex items-center gap-2 rounded-sm px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] transition-all active:opacity-85 disabled:opacity-70",
                waiterCalled
                  ? "bg-[#eef7f0] text-[#256841] border border-[#256841]"
                  : "border border-[#d9d9d9] text-[#353535] hover:border-[#c4c4c4]"
              )}
            >
              {callingWaiter ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : waiterCalled ? (
                <Check className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {waiterCalled ? "Вызван" : "Официант"}
              </span>
            </button>
          )}
        </div>

        {/* Category tabs — underline style */}
        {venue.categories.length > 1 && (
          <div className="max-w-2xl mx-auto px-5 flex gap-6 overflow-x-auto scrollbar-hide">
            {venue.categories.map((cat) => (
              <button
                key={cat.id}
                ref={(el: HTMLButtonElement | null) => { tabRefs.current[cat.id] = el; }}
                onClick={() => scrollToCategory(cat.id)}
                className={cn(
                  "shrink-0 pb-3 text-xs font-bold uppercase tracking-[0.08em] transition-all whitespace-nowrap border-b-2",
                  activeCategoryId === cat.id
                    ? "border-current"
                    : "border-transparent text-[#a0a0a0] hover:text-[#353535]"
                )}
                style={activeCategoryId === cat.id ? { color: accent } : undefined}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Menu ── */}
      <main className="max-w-2xl mx-auto w-full px-5 pt-7 space-y-10">
        {venue.categories.map((cat) => (
          <section
            key={cat.id}
            ref={(el: HTMLDivElement | null) => { categoryRefs.current[cat.id] = el; }}
          >
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a7a7a] mb-5">{cat.name}</h2>
            <div className="grid grid-cols-2 gap-3">
              {cat.items.map((item) => {
                const count = getItemCartCount(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "relative flex flex-col bg-white overflow-hidden transition-all border border-[#e8e8e8]",
                      item.isStopped
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:bg-[#f7f7f7] active:opacity-85"
                    )}
                  >
                    {/* Image */}
                    <div className="relative aspect-square bg-[#f0f0f0] overflow-hidden">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 700px) 50vw, 320px"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-[#c4c4c4]" />
                        </div>
                      )}
                      {!item.isStopped && count > 0 && (
                        <div className="absolute top-2 right-2 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center" style={{ backgroundColor: accent }}>
                          {count}
                        </div>
                      )}
                      {item.isStopped && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <span className="text-xs font-bold uppercase tracking-[0.04em] text-[#a82828] bg-[#fdf0f0] px-3 py-1">
                            Нет в наличии
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col flex-1 p-3">
                      <p className="font-bold text-sm leading-snug line-clamp-2 text-[#1a1a1a] mb-1">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="text-xs text-[#a0a0a0] line-clamp-2 mb-auto">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-end justify-between mt-3">
                        <div>
                          {item.variants.length > 0 && (
                            <span className="text-xs text-[#a0a0a0] block">от</span>
                          )}
                          <p className="font-bold text-lg leading-none text-[#1a1a1a]">
                            {item.variants.length > 0
                              ? formatPrice(Math.min(item.price, ...item.variants.map((v) => v.price)))
                              : formatPrice(item.price)}
                          </p>
                        </div>
                        {!item.isStopped && (
                          <button
                            className="flex h-10 w-10 items-center justify-center rounded-sm text-white transition-all active:opacity-85"
                            style={{ backgroundColor: accent }}
                            onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                          >
                            <Plus className="h-6 w-6" strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* ── Product detail sheet ── */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
          onClick={() => { setDetailItem(null); setSelectedVariant(null); }}
        >
          <div
            className="bg-white w-full max-w-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Product image */}
            {detailItem.imageUrl ? (
              <div className="relative w-full aspect-[4/3] bg-[#f0f0f0]">
                <Image
                  src={detailItem.imageUrl}
                  alt={detailItem.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 700px) 100vw, 672px"
                />
                <button
                  onClick={() => { setDetailItem(null); setSelectedVariant(null); }}
                  className="absolute top-4 right-4 h-9 w-9 rounded-sm bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            ) : (
              <div className="pt-4 px-7">
                <div className="w-10 h-1 bg-[#d9d9d9] mx-auto mb-4" />
                <div className="flex justify-end">
                  <button
                    onClick={() => { setDetailItem(null); setSelectedVariant(null); }}
                    className="h-9 w-9 rounded-sm bg-[#f0f0f0] flex items-center justify-center hover:bg-[#e8e8e8] transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
            )}

            <div className="px-7 pb-8 pt-5 space-y-5">
              {/* Name + price */}
              <div>
                <h3 className="font-bold text-xl leading-tight text-[#1a1a1a]">{detailItem.name}</h3>
                {!detailItem.variants.length && (
                  <p className="font-bold text-xl mt-1" style={{ color: accent }}>
                    {formatPrice(detailItem.price)}
                  </p>
                )}
              </div>

              {/* Description */}
              {detailItem.description && (
                <p className="text-sm text-[#7a7a7a] leading-relaxed">
                  {detailItem.description}
                </p>
              )}

              {detailItem.composition && (
                <div className="border border-[#e8e8e8] px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#a0a0a0] mb-1.5">Состав</p>
                  <p className="text-sm text-[#353535] leading-relaxed">
                    {detailItem.composition}
                  </p>
                </div>
              )}

              {/* КБЖУ */}
              {(detailItem.calories != null || detailItem.proteins != null || detailItem.fats != null || detailItem.carbs != null) && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#a0a0a0] mb-2">На 100 г / 100 мл</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Ккал", value: detailItem.calories, unit: "" },
                      { label: "Белки", value: detailItem.proteins, unit: "г" },
                      { label: "Жиры", value: detailItem.fats, unit: "г" },
                      { label: "Углев.", value: detailItem.carbs, unit: "г" },
                    ].map((n) => (
                      <div
                        key={n.label}
                        className="border border-[#e8e8e8] p-3 text-center"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#a0a0a0]">{n.label}</p>
                        <p className="text-base font-bold mt-0.5 text-[#1a1a1a]">
                          {n.value != null ? `${n.value}` : "—"}
                          {n.value != null && n.unit && (
                            <span className="text-xs font-bold text-gray-400 ml-0.5">{n.unit}</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variants */}
              {detailItem.variants.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#a0a0a0]">Выберите размер</p>
                  <div className="space-y-2.5">
                    {detailItem.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={cn(
                          "flex w-full items-center justify-between border p-4 transition-all active:opacity-85",
                          selectedVariant?.id === v.id
                            ? "border-2"
                            : "border-[#e8e8e8] hover:border-[#c4c4c4]"
                        )}
                        style={selectedVariant?.id === v.id ? { backgroundColor: `${accent}15`, ringColor: accent, borderColor: accent, outlineColor: accent, "--tw-ring-color": accent } as React.CSSProperties : undefined}
                      >
                        <span className="font-semibold text-sm text-[#1a1a1a]">{v.label}</span>
                        <span className="font-bold text-lg text-[#1a1a1a]">{formatPrice(v.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to cart button */}
              <button
                onClick={handleAddFromDetail}
                className="w-full h-14 rounded-sm text-white text-sm font-semibold uppercase tracking-[0.04em] transition-all active:opacity-85 flex items-center justify-center gap-2"
                style={{ backgroundColor: accent }}
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
                Добавить · {formatPrice(
                  selectedVariant?.price ?? detailItem.price
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── My orders button ── */}
      {myOrders.length > 0 && !cartOpen && !ordersOpen && (
        <button
          onClick={() => setOrdersOpen(true)}
          className={cn(
            "fixed z-40 right-5 flex items-center gap-2 rounded-sm px-4 py-2.5 transition-all active:opacity-85",
            activeOrders.length > 0
              ? "bg-[#256841] text-white"
              : "bg-white text-[#353535] border border-[#d9d9d9]",
            itemCount > 0 ? "bottom-28" : "bottom-6"
          )}
        >
          <ClipboardList className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.04em]">Мои заказы</span>
          {activeOrders.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#256841]">
              {activeOrders.length}
            </span>
          )}
        </button>
      )}

      {/* ── Cart button ── */}
      {itemCount > 0 && !cartOpen && !ordersOpen && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-5">
          <button
            onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-sm px-6 py-4 text-white transition-all active:opacity-85"
            style={{ backgroundColor: accent }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag className="h-6 w-6" />
                <span className="absolute -top-1.5 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold" style={{ color: accent }}>
                  {itemCount}
                </span>
              </div>
              <span className="text-sm font-semibold uppercase tracking-[0.04em]">Корзина</span>
            </div>
            <span className="font-bold text-xl">{formatPrice(total)}</span>
          </button>
        </div>
      )}

      {/* ── Cart sheet ── */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white pt-4 pb-5 px-6 z-10 border-b border-[#e8e8e8]">
              <div className="w-10 h-1 bg-[#d9d9d9] mx-auto mb-5" />
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1a1a1a]">
                  Корзина
                  <span className="ml-2 text-xs font-medium normal-case tracking-normal text-[#a0a0a0]">{itemCount} шт.</span>
                </h2>
                <button
                  onClick={() => setCartOpen(false)}
                  className="h-9 w-9 rounded-sm bg-[#f0f0f0] flex items-center justify-center hover:bg-[#e8e8e8] transition-colors"
                >
                  <X className="h-4 w-4 text-[#7a7a7a]" />
                </button>
              </div>
            </div>

            <div className="px-6 pb-8 space-y-3 max-w-2xl mx-auto">
              {cartItems.map((item) => {
                const key = item.variantId ? `${item.menuItemId}:${item.variantId}` : item.menuItemId;
                return (
                  <div key={key} className="flex items-center gap-4 border-b border-[#e8e8e8] pb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#1a1a1a]">
                        {item.name}
                        {item.variantLabel && (
                          <span className="text-[#a0a0a0]"> · {item.variantLabel}</span>
                        )}
                      </p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: accent }}>
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center shrink-0 border border-[#d9d9d9] overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1, item.variantId)}
                        className="flex h-9 w-9 items-center justify-center hover:bg-[#f7f7f7] transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5 text-[#7a7a7a]" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm text-[#1a1a1a]">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1, item.variantId)}
                        className="flex h-9 w-9 items-center justify-center hover:bg-[#f7f7f7] transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5 text-[#7a7a7a]" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.menuItemId, item.variantId)}
                      className="shrink-0 h-8 w-8 rounded-sm flex items-center justify-center hover:bg-[#fdf0f0] transition-colors group"
                    >
                      <X className="h-4 w-4 text-[#c4c4c4] group-hover:text-[#a82828] transition-colors" />
                    </button>
                  </div>
                );
              })}

              {/* Fields */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#a0a0a0] mb-2 block">Столик</label>
                  <input
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Номер столика"
                    disabled={!!initialTable}
                    className="w-full h-12 border-b border-[#d9d9d9] bg-transparent px-0 text-sm text-[#1a1a1a] placeholder:text-[#c4c4c4] focus:outline-none focus:border-[#3c6e71] transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#a0a0a0] mb-2 flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Комментарий
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Без сахара, с собой..."
                    rows={2}
                    className="w-full border-b border-[#d9d9d9] bg-transparent px-0 py-2 text-sm text-[#1a1a1a] placeholder:text-[#c4c4c4] focus:outline-none focus:border-[#3c6e71] transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 flex items-center justify-between border-t border-[#e8e8e8]">
                <span className="text-sm font-bold uppercase tracking-[0.08em] text-[#1a1a1a]">Итого</span>
                <span className="text-2xl font-bold" style={{ color: accent }}>{formatPrice(total)}</span>
              </div>

              {!tableNumber.trim() && (
                <p className="text-xs text-[#a82828] text-center">
                  Укажите номер столика для оформления заказа
                </p>
              )}
              <button
                className="w-full h-14 rounded-sm text-white text-sm font-semibold uppercase tracking-[0.04em] transition-all active:opacity-85 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: accent }}
                onClick={handleOrder}
                disabled={ordering || !tableNumber.trim()}
              >
                {ordering ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Оформляем...</>
                ) : (
                  <>Оформить заказ · {formatPrice(total)}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── My orders sheet ── */}
      {ordersOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOrdersOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-3 border-b border-[#e8e8e8]">
              <div className="w-10 h-1 bg-[#d9d9d9] mx-auto mb-5" />
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1a1a1a] flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" style={{ color: accent }} />
                  Мои заказы
                </h3>
                <button
                  onClick={() => setOrdersOpen(false)}
                  className="h-9 w-9 rounded-sm bg-[#f0f0f0] flex items-center justify-center hover:bg-[#e8e8e8] transition-colors"
                >
                  <X className="h-4 w-4 text-[#7a7a7a]" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-3">
              {myOrders.length === 0 ? (
                <p className="text-center text-[#a0a0a0] text-sm py-8">
                  У вас пока нет заказов
                </p>
              ) : (
                myOrders.map((order) => (
                  <GuestOrderCard
                    key={order.id}
                    order={order}
                    onStatusUpdate={updateStatus}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Watermark for BASIC plan */}
      {showWatermark && (
        <div className="text-center py-4 mt-4">
          <span className="text-[10px] uppercase tracking-[0.08em] text-[#c4c4c4]">
            Работает на{" "}
            <a
              href="/"
              target="_blank"
              className="text-[#a0a0a0] hover:text-[#353535] transition-colors"
            >
              TapMenu
            </a>
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════ Guest order card with SSE ═══════ */

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  NEW: {
    label: "Отправлен",
    color: "text-[#284b63]",
    bgColor: "bg-[#edf2f6]",
    icon: <Clock className="h-4 w-4" />,
  },
  ACCEPTED: {
    label: "Принят",
    color: "text-[#256841]",
    bgColor: "bg-[#eef7f0]",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  DELIVERED: {
    label: "Отдан",
    color: "text-[#7a7a7a]",
    bgColor: "bg-[#f0f0f0]",
    icon: <Truck className="h-4 w-4" />,
  },
  CANCELLED: {
    label: "Отменён",
    color: "text-[#a82828]",
    bgColor: "bg-[#fdf0f0]",
    icon: <XCircle className="h-4 w-4" />,
  },
};

function GuestOrderCard({
  order,
  onStatusUpdate,
}: {
  order: GuestOrder;
  onStatusUpdate: (id: string, status: string) => void;
}) {
  const [status, setStatus] = useState(order.status);

  // Polling for live status updates (SSE doesn't work on Vercel serverless)
  useEffect(() => {
    if (status === "DELIVERED" || status === "CANCELLED") return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (!active) return;
      try {
        const res = await fetch(`/api/orders/${order.id}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status && data.status !== status) {
            setStatus(data.status);
            onStatusUpdate(order.id, data.status);
          }
        }
      } catch { /* ignore */ }
      if (active) timer = setTimeout(poll, 4000);
    }

    poll();

    function resume() {
      if (active && document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        poll();
      }
    }
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
    };
  }, [order.id, status, onStatusUpdate]);

  const info = ORDER_STATUS_MAP[status] || ORDER_STATUS_MAP.NEW;
  const isActive = status === "NEW" || status === "ACCEPTED";

  return (
    <div className={cn(
      "border p-4 transition-all",
      isActive ? "border-[#d9d9d9] bg-white" : "border-[#e8e8e8] bg-[#f7f7f7]"
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.04em]",
          info.bgColor, info.color
        )}>
          {isActive && (
            <span className="relative flex h-2 w-2">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                status === "NEW" ? "bg-[#4a7291]" : "bg-[#2e7d4f]"
              )} />
              <span className={cn("relative inline-flex rounded-full h-2 w-2",
                status === "NEW" ? "bg-[#284b63]" : "bg-[#256841]"
              )} />
            </span>
          )}
          {info.icon}
          {info.label}
        </span>
        <span className="text-[#a0a0a0] text-xs">
          {new Date(order.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {order.items && order.items.length > 0 && (
        <div className="mb-3 space-y-1">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="font-medium text-[#353535] truncate mr-3">
                {item.name}{item.variantLabel ? ` (${item.variantLabel})` : ""}
              </span>
              <span className="text-[#a0a0a0] text-xs shrink-0">× {item.quantity}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-end">
        <span className="font-extrabold">{formatPrice(order.totalAmount)}</span>
      </div>
    </div>
  );
}

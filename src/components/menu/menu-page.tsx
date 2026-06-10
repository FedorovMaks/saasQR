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

  useEffect(() => {
    setVenueId(venue.id);
    if (initialTable) setTableNumber(initialTable);
  }, [venue.id, initialTable, setVenueId, setTableNumber]);

  function scrollToCategory(id: string) {
    setActiveCategoryId(id);
    categoryRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

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
      setTimeout(() => setWaiterCalled(false), 60_000);
    } catch {
      alert("Ошибка соединения");
    } finally {
      setCallingWaiter(false);
    }
  }

  const itemCount = totalItems();
  const total = totalPrice();

  const accent = venue.accentColor || "#2563eb";

  /* ═══════ Main ═══════ */
  return (
    <div
      className="flex flex-1 flex-col min-h-screen bg-[#f0f2f8] pb-32"
      style={{ "--accent": accent, "--accent-shadow": `${accent}40` } as React.CSSProperties}
    >

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-4">
          {venue.logoUrl ? (
            <Image
              src={venue.logoUrl}
              alt={venue.name}
              width={56}
              height={56}
              className="rounded-2xl object-cover shrink-0 shadow-sm"
              style={{ width: 56, height: 56 }}
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center shadow-lg" style={{ backgroundColor: accent, boxShadow: `0 10px 15px -3px ${accent}33` }}>
              <span className="text-white font-black text-2xl">
                {venue.name[0]}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-extrabold text-2xl truncate leading-tight tracking-tight">{venue.name}</h1>
            {venue.description && (
              <p className="text-base text-gray-400 truncate font-medium mt-0.5">
                {venue.description}
              </p>
            )}
          </div>
          {/* Call waiter button */}
          {tableNumber && (
            <button
              onClick={handleCallWaiter}
              disabled={callingWaiter || waiterCalled}
              className={cn(
                "shrink-0 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-extrabold transition-all active:scale-95 disabled:opacity-70",
                waiterCalled
                  ? "bg-green-50 text-green-600"
                  : "bg-[#f0f2f8] text-gray-600 hover:bg-[#e4e8f2]"
              )}
            >
              {callingWaiter ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : waiterCalled ? (
                <Check className="h-5 w-5" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              <span className="hidden sm:inline">
                {waiterCalled ? "Вызван" : "Официант"}
              </span>
            </button>
          )}
        </div>

        {/* Category tabs */}
        {venue.categories.length > 1 && (
          <div className="max-w-2xl mx-auto px-5 pb-4 flex gap-2.5 overflow-x-auto scrollbar-hide">
            {venue.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={cn(
                  "shrink-0 px-6 py-3 rounded-full text-base font-extrabold transition-all whitespace-nowrap",
                  activeCategoryId === cat.id
                    ? "text-white shadow-lg"
                    : "bg-[#e8ecf4] text-gray-500 active:bg-[#dde3f0]"
                )}
                style={activeCategoryId === cat.id ? { backgroundColor: accent, boxShadow: `0 10px 15px -3px ${accent}4D` } : undefined}
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
            <h2 className="font-display text-2xl font-semibold mb-5 tracking-tight leading-tight">{cat.name}</h2>
            <div className="grid grid-cols-2 gap-4">
              {cat.items.map((item) => {
                const count = getItemCartCount(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "relative flex flex-col rounded-[1.25rem] bg-white overflow-hidden transition-all duration-200",
                      "shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
                      item.isStopped
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)] hover:-translate-y-1 active:scale-[0.97]"
                    )}
                  >
                    {/* Image */}
                    <div className="relative aspect-square bg-[#f0f2f8] overflow-hidden">
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
                          <div className="w-20 h-20 rounded-3xl bg-white/70 flex items-center justify-center shadow-sm">
                            <ShoppingBag className="h-9 w-9 text-gray-300" />
                          </div>
                        </div>
                      )}
                      {/* Cart badge */}
                      {!item.isStopped && count > 0 && (
                        <div className="absolute top-3 right-3 text-white text-sm font-black rounded-full h-8 w-8 flex items-center justify-center shadow-lg ring-2 ring-white" style={{ backgroundColor: accent }}>
                          {count}
                        </div>
                      )}
                      {/* Stopped */}
                      {item.isStopped && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <span className="text-base font-bold text-red-500 bg-red-50 rounded-2xl px-5 py-2">
                            Нет в наличии
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col flex-1 p-4">
                      <p className="font-extrabold text-[17px] leading-snug line-clamp-2 mb-1">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="text-sm text-gray-400 line-clamp-2 mb-auto font-medium">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-end justify-between mt-4">
                        <div>
                          {item.variants.length > 0 && (
                            <span className="text-sm font-bold text-gray-400 block">от</span>
                          )}
                          <p className="font-black text-xl leading-none">
                            {item.variants.length > 0
                              ? formatPrice(Math.min(item.price, ...item.variants.map((v) => v.price)))
                              : formatPrice(item.price)}
                          </p>
                        </div>
                        {!item.isStopped && (
                          <button
                            className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-90"
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
            className="bg-white w-full max-w-2xl rounded-t-[2rem] shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Product image */}
            {detailItem.imageUrl ? (
              <div className="relative w-full aspect-[4/3] bg-[#f0f2f8]">
                <Image
                  src={detailItem.imageUrl}
                  alt={detailItem.name}
                  fill
                  className="object-cover rounded-t-[2rem]"
                  sizes="(max-width: 700px) 100vw, 672px"
                />
                <button
                  onClick={() => { setDetailItem(null); setSelectedVariant(null); }}
                  className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            ) : (
              <div className="pt-4 px-7">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="flex justify-end">
                  <button
                    onClick={() => { setDetailItem(null); setSelectedVariant(null); }}
                    className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
            )}

            <div className="px-7 pb-8 pt-5 space-y-5">
              {/* Name + price */}
              <div>
                <h3 className="font-display font-extrabold text-2xl leading-tight tracking-tight">{detailItem.name}</h3>
                {!detailItem.variants.length && (
                  <p className="font-black text-2xl mt-1" style={{ color: accent }}>
                    {formatPrice(detailItem.price)}
                  </p>
                )}
              </div>

              {/* Description */}
              {detailItem.description && (
                <p className="text-base text-gray-500 font-medium leading-relaxed">
                  {detailItem.description}
                </p>
              )}

              {/* Composition */}
              {detailItem.composition && (
                <div className="rounded-2xl bg-[#f0f2f8] px-5 py-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Состав</p>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    {detailItem.composition}
                  </p>
                </div>
              )}

              {/* КБЖУ */}
              {(detailItem.calories != null || detailItem.proteins != null || detailItem.fats != null || detailItem.carbs != null) && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">На 100 г / 100 мл</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Ккал", value: detailItem.calories, unit: "" },
                      { label: "Белки", value: detailItem.proteins, unit: "г" },
                      { label: "Жиры", value: detailItem.fats, unit: "г" },
                      { label: "Углев.", value: detailItem.carbs, unit: "г" },
                    ].map((n) => (
                      <div
                        key={n.label}
                        className="rounded-2xl bg-[#f0f2f8] p-3 text-center"
                      >
                        <p className="text-xs font-bold text-gray-400">{n.label}</p>
                        <p className="text-lg font-black mt-0.5">
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
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">Выберите размер</p>
                  <div className="space-y-2.5">
                    {detailItem.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-2xl p-5 transition-all active:scale-[0.98]",
                          selectedVariant?.id === v.id
                            ? "ring-2"
                            : "bg-[#f0f2f8] hover:bg-[#e4e8f2]"
                        )}
                        style={selectedVariant?.id === v.id ? { backgroundColor: `${accent}15`, ringColor: accent, borderColor: accent, outlineColor: accent, "--tw-ring-color": accent } as React.CSSProperties : undefined}
                      >
                        <span className="font-extrabold text-lg">{v.label}</span>
                        <span className="font-black text-xl">{formatPrice(v.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to cart button */}
              <button
                onClick={handleAddFromDetail}
                className="w-full h-16 rounded-full text-white font-extrabold text-xl shadow-xl transition-all hover:shadow-2xl active:scale-[0.97] flex items-center justify-center gap-2"
                style={{ backgroundColor: accent }}
              >
                <Plus className="h-6 w-6" strokeWidth={2.5} />
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
            "fixed z-40 right-5 flex items-center gap-2 rounded-full px-5 py-3 shadow-lg transition-all active:scale-95",
            activeOrders.length > 0
              ? "bg-green-500 text-white shadow-green-500/25"
              : "bg-white text-gray-600 shadow-black/10",
            itemCount > 0 ? "bottom-28" : "bottom-6"
          )}
        >
          <ClipboardList className="h-5 w-5" />
          <span className="font-extrabold text-sm">Мои заказы</span>
          {activeOrders.length > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black text-green-600">
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
            className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-full px-7 py-5 text-white shadow-2xl transition-all active:scale-[0.97]"
            style={{ backgroundColor: accent, boxShadow: `0 25px 50px -12px ${accent}4D` }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag className="h-7 w-7" />
                <span className="absolute -top-2 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black" style={{ color: accent }}>
                  {itemCount}
                </span>
              </div>
              <span className="font-extrabold text-lg">Корзина</span>
            </div>
            <span className="font-black text-2xl">{formatPrice(total)}</span>
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
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] max-h-[88vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white pt-4 pb-5 px-6 rounded-t-[2rem] z-10">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-extrabold tracking-tight">
                  Корзина
                  <span className="ml-2 text-base font-bold text-gray-400 font-sans">{itemCount} шт.</span>
                </h2>
                <button
                  onClick={() => setCartOpen(false)}
                  className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="px-6 pb-8 space-y-4 max-w-2xl mx-auto">
              {cartItems.map((item) => {
                const key = item.variantId ? `${item.menuItemId}:${item.variantId}` : item.menuItemId;
                return (
                  <div key={key} className="flex items-center gap-4 rounded-2xl bg-[#f0f2f8] p-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[17px]">
                        {item.name}
                        {item.variantLabel && (
                          <span className="text-gray-400 font-bold"> · {item.variantLabel}</span>
                        )}
                      </p>
                      <p className="text-base font-black mt-1" style={{ color: accent }}>
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                    {/* Stepper */}
                    <div className="flex items-center shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1, item.variantId)}
                        className="flex h-11 w-11 items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Minus className="h-4 w-4 text-gray-500" />
                      </button>
                      <span className="w-10 text-center font-black text-base">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1, item.variantId)}
                        className="flex h-11 w-11 items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.menuItemId, item.variantId)}
                      className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors group"
                    >
                      <X className="h-5 w-5 text-gray-300 group-hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                );
              })}

              {/* Fields */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-base font-bold text-gray-400 mb-2 block">Столик</label>
                  <input
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Номер столика"
                    disabled={!!initialTable}
                    className="w-full h-14 rounded-2xl border-0 bg-[#f0f2f8] px-5 text-base font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-base font-bold text-gray-400 mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Комментарий
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Без сахара, с собой..."
                    rows={2}
                    className="w-full rounded-2xl border-0 bg-[#f0f2f8] px-5 py-4 text-base font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 flex items-center justify-between">
                <span className="text-xl font-black">Итого</span>
                <span className="text-3xl font-black" style={{ color: accent }}>{formatPrice(total)}</span>
              </div>

              {/* Submit */}
              {!tableNumber.trim() && (
                <p className="text-sm text-red-500 font-semibold text-center">
                  Укажите номер столика для оформления заказа
                </p>
              )}
              <button
                className="w-full h-16 rounded-full text-white font-extrabold text-xl shadow-xl transition-all hover:shadow-2xl active:scale-[0.97] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                style={{ backgroundColor: accent }}
                onClick={handleOrder}
                disabled={ordering || !tableNumber.trim()}
              >
                {ordering ? (
                  <><Loader2 className="h-6 w-6 animate-spin" /> Оформляем...</>
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
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white z-10 px-7 pt-5 pb-3 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-2xl flex items-center gap-2 tracking-tight">
                  <ClipboardList className="h-6 w-6" style={{ color: accent }} />
                  Мои заказы
                </h3>
                <button
                  onClick={() => setOrdersOpen(false)}
                  className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="px-7 py-5 space-y-3">
              {myOrders.length === 0 ? (
                <p className="text-center text-gray-400 font-semibold py-8">
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
          <span className="text-xs text-gray-300 font-medium">
            Работает на{" "}
            <a
              href="/"
              target="_blank"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              QRMenu
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
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: <Clock className="h-4 w-4" />,
  },
  ACCEPTED: {
    label: "Принят",
    color: "text-green-600",
    bgColor: "bg-green-50",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  DELIVERED: {
    label: "Отдан",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: <Truck className="h-4 w-4" />,
  },
  CANCELLED: {
    label: "Отменён",
    color: "text-red-500",
    bgColor: "bg-red-50",
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
      "rounded-2xl p-5 transition-all",
      isActive ? "bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]" : "bg-gray-50"
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold",
          info.bgColor, info.color
        )}>
          {isActive && (
            <span className="relative flex h-2 w-2">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                status === "NEW" ? "bg-blue-400" : "bg-green-400"
              )} />
              <span className={cn("relative inline-flex rounded-full h-2 w-2",
                status === "NEW" ? "bg-blue-500" : "bg-green-500"
              )} />
            </span>
          )}
          {info.icon}
          {info.label}
        </span>
        <span className="text-gray-400 font-medium text-sm">
          {new Date(order.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {order.items && order.items.length > 0 && (
        <div className="mb-3 space-y-1">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="font-bold text-gray-700 truncate mr-3">
                {item.name}{item.variantLabel ? ` (${item.variantLabel})` : ""}
              </span>
              <span className="text-gray-400 font-semibold shrink-0">× {item.quantity}</span>
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

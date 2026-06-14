"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useOrderStream, useSound, unlockAudio, type OrderFromAPI } from "@/hooks/use-orders";
import { formatPrice } from "@/lib/utils";
import { PushToggle } from "@/components/admin/push-toggle";
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Bell,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

type OrderItem = {
  id: string;
  itemName: string;
  variantLabel: string | null;
  quantity: number;
  priceAtOrder: number;
};

type Order = {
  id: string;
  orderNumber: number;
  tableNumber: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  comment: string | null;
  createdAt: string;
  items: OrderItem[];
};

type Venue = {
  id: string;
  name: string;
  slug: string;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  NEW: {
    label: "Новый",
    color: "text-[#284b63]",
    bgColor: "bg-[#eef6f6] border-[#a9d1d3]",
    icon: <Bell className="h-3.5 w-3.5" />,
  },
  ACCEPTED: {
    label: "Принят",
    color: "text-[#256841]",
    bgColor: "bg-[#eef7f0] border-[#b3d9c0]",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  DELIVERED: {
    label: "Отдан",
    color: "text-[#7a7a7a]",
    bgColor: "bg-[#f0f0f0] border-[#d9d9d9]",
    icon: <Truck className="h-3.5 w-3.5" />,
  },
  CANCELLED: {
    label: "Отменён",
    color: "text-[#a82828]",
    bgColor: "bg-[#fdf0f0] border-[#e8b4b4]",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

const STATUS_FLOW: Record<string, string[]> = {
  NEW: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

const FILTER_TABS = [
  { key: "ALL", label: "Все" },
  { key: "NEW", label: "Новые" },
  { key: "ACCEPTED", label: "Принятые" },
];

function formatTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(dateString: string) {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin} мин назад`;
  const hours = Math.floor(diffMin / 60);
  return `${hours} ч ${diffMin % 60} мин назад`;
}

export function OrdersDashboard({
  venue,
  initialOrders,
}: {
  venue: Venue;
  initialOrders: Order[];
}) {
  const { data: session } = useSession();
  const isWaiter = session?.user?.role === "waiter";
  const playSound = useSound();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  // Waiter calls state
  const [waiterCalls, setWaiterCalls] = useState<{ tableNumber: string; timestamp: string }[]>([]);

  function dismissWaiterCall(tableNumber: string) {
    setWaiterCalls((prev) => prev.filter((c) => c.tableNumber !== tableNumber));
  }

  const handleOrderEvent = useCallback(
    (event: {
      type: string;
      venueId: string;
      order?: Record<string, unknown>;
      tableNumber?: string;
      timestamp?: string;
    }) => {
      if (event.type === "waiter_call") {
        playSound();
        const tbl = event.tableNumber || "?";
        toast(`Столик ${tbl} вызывает официанта`, {
          icon: "🔔",
          duration: 10000,
        });
        setWaiterCalls((prev) => {
          const filtered = prev.filter((c) => c.tableNumber !== tbl);
          return [{ tableNumber: tbl, timestamp: event.timestamp || new Date().toISOString() }, ...filtered];
        });
        return;
      }

      if (event.type === "new_order") {
        const order = event.order as unknown as Order;
        setNewOrderIds((prev) => new Set(prev).add(order.id));
        playSound();
        toast.success(`Новый заказ #${order.orderNumber}`, {
          description: order.tableNumber
            ? `Столик ${order.tableNumber}`
            : "Без столика",
        });

        setTimeout(() => {
          setNewOrderIds((prev) => {
            const next = new Set(prev);
            next.delete(order.id);
            return next;
          });
        }, 10000);
      }
    },
    [playSound]
  );

  const handleOrdersRefresh = useCallback((freshOrders: OrderFromAPI[]) => {
    setOrders(freshOrders as Order[]);
  }, []);

  useOrderStream(
    venue.id,
    handleOrderEvent,
    handleOrdersRefresh,
    initialOrders.map((o) => ({ id: o.id }))
  );

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = () => unlockAudio();
    window.addEventListener("touchstart", handler, { once: true });
    window.addEventListener("click", handler, { once: true });
    return () => {
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("click", handler);
    };
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Ошибка обновления статуса");
        return;
      }
      const updated = await res.json();
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o))
      );
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setUpdatingOrder(null);
    }
  };

  const filtered =
    statusFilter === "ALL"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  const counts: Record<string, number> = {};
  for (const o of orders) {
    counts[o.status] = (counts[o.status] || 0) + 1;
  }
  const newCount = counts["NEW"] || 0;

  return (
    <div className="space-y-4">
      {/* Header — single row: back + title + push toggle + menu link */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {!isWaiter && (
            <Link
              href="/admin"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[#d9d9d9] text-[#7a7a7a] hover:border-[#c4c4c4] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold flex items-center gap-2 text-[#1a1a1a]">
              <span className="truncate">Заказы — {venue.name}</span>
              {newCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-[#eef6f6] border border-[#a9d1d3] px-2.5 py-0.5 text-[11px] font-bold text-[#3c6e71] animate-pulse shrink-0">
                  {newCount} новых
                </span>
              )}
            </h1>
            <p className="text-xs text-[#7a7a7a]">
              Сегодня: {orders.length} заказов ·{" "}
              {formatPrice(orders.reduce((s, o) => s + o.totalAmount, 0))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PushToggle />
          {!isWaiter && (
            <Link
              href={`/${venue.slug}`}
              target="_blank"
              className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#d9d9d9] px-4 text-xs font-semibold uppercase tracking-[0.04em] text-[#353535] hover:border-[#c4c4c4] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Меню
            </Link>
          )}
        </div>
      </div>

      {/* Filter tabs — counts inline */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === "ALL" ? orders.length : counts[tab.key] || 0;
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`shrink-0 h-9 px-4 text-xs font-semibold uppercase tracking-[0.04em] rounded-sm transition-all ${
                isActive
                  ? "bg-[#3c6e71] text-white"
                  : "border border-[#d9d9d9] text-[#353535] hover:border-[#c4c4c4]"
              }`}
            >
              {tab.label}{count > 0 ? ` ${count}` : ""}
            </button>
          );
        })}
        {(waiterCalls.length > 0 || statusFilter === "CALLS") && (
          <button
            onClick={() => setStatusFilter("CALLS")}
            className={`shrink-0 h-9 px-4 text-xs font-semibold uppercase tracking-[0.04em] rounded-sm transition-all inline-flex items-center gap-1.5 ${
              statusFilter === "CALLS"
                ? "bg-[#d4a83a] text-white"
                : "border border-[#d4a83a] text-[#9a7209] bg-[#fef8ec]"
            } ${waiterCalls.length > 0 ? "animate-pulse" : ""}`}
          >
            <Bell className="h-3.5 w-3.5" />
            Вызовы{waiterCalls.length > 0 ? ` ${waiterCalls.length}` : ""}
          </button>
        )}
      </div>

      {/* Waiter calls view */}
      {statusFilter === "CALLS" &&
        (waiterCalls.length === 0 ? (
          <div className="border-2 border-dashed border-[#d9d9d9] flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-sm bg-[#fef8ec] p-5 mb-5">
              <Bell className="h-10 w-10 text-[#9a7209]" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1a1a1a]">
              Нет активных вызовов
            </h3>
            <p className="text-sm text-[#7a7a7a] mt-1">
              Когда гость нажмёт «Позвать официанта», вызов появится здесь
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {waiterCalls.map((call) => (
              <div
                key={call.tableNumber}
                className="border-2 border-[#d4a83a] bg-[#fef8ec] p-4 flex items-center justify-between animate-in slide-in-from-top duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-sm bg-[#f5ebd0] flex items-center justify-center">
                    <Bell className="h-5 w-5 text-[#9a7209] animate-bounce" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#1a1a1a]">
                      Столик {call.tableNumber}
                    </p>
                    <p className="text-xs text-[#9a7209]">
                      {new Date(call.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => dismissWaiterCall(call.tableNumber)}
                  className="h-9 px-4 rounded-sm bg-[#d4a83a] text-white font-semibold text-xs uppercase tracking-[0.04em] hover:bg-[#b8922e] transition-colors active:opacity-85"
                >
                  Принято
                </button>
              </div>
            ))}
          </div>
        ))}

      {/* Orders grid */}
      {statusFilter !== "CALLS" &&
        (filtered.length === 0 ? (
        <div className="border-2 border-dashed border-[#d9d9d9] flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-sm bg-[#eef6f6] p-5 mb-5">
            <ClipboardList className="h-10 w-10 text-[#3c6e71]" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1a1a1a]">Нет заказов</h3>
          <p className="text-sm text-[#7a7a7a] mt-1">
            {statusFilter === "ALL"
              ? "Заказы за сегодня появятся здесь"
              : "Нет заказов с таким статусом"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isNew={newOrderIds.has(order.id)}
              isUpdating={updatingOrder === order.id}
              onUpdateStatus={updateStatus}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function OrderCard({
  order,
  isNew,
  isUpdating,
  onUpdateStatus,
}: {
  order: Order;
  isNew: boolean;
  isUpdating: boolean;
  onUpdateStatus: (orderId: string, status: string) => void;
}) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.NEW;
  const nextStatuses = STATUS_FLOW[order.status] || [];
  const awaitingPayment = order.paymentStatus === "PENDING";

  return (
    <div
      className={`border transition-all overflow-hidden ${
        isNew
          ? "border-2 border-[#3c6e71] bg-[#f9fcfc]"
          : "border-[#d9d9d9] bg-white"
      } ${
        order.status === "DELIVERED" || order.status === "CANCELLED"
          ? "opacity-60"
          : ""
      }`}
    >
      {/* Header row */}
      <div className="px-4 pt-4 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-[#1a1a1a]">#{order.orderNumber}</span>
            {order.tableNumber && (
              <span className="inline-flex items-center rounded-full border border-[#d9d9d9] px-2.5 py-0.5 text-[11px] font-medium text-[#353535]">
                Стол {order.tableNumber}
              </span>
            )}
          </div>
          <span
            className={`${config.bgColor} ${config.color} border inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em]`}
          >
            {config.icon}
            {config.label}
          </span>
        </div>
        <p className="flex items-center gap-1 text-[11px] text-[#a0a0a0] mt-0.5">
          <Clock className="h-3 w-3" />
          {formatTime(order.createdAt)} · {timeAgo(order.createdAt)}
        </p>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-3 space-y-3">
        {/* Items — plain list, no background */}
        <div className="space-y-1">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-[#353535]">
                <span className="font-bold text-[#3c6e71]">
                  {item.quantity}×
                </span>{" "}
                {item.itemName}
                {item.variantLabel && (
                  <span className="text-[#a0a0a0] text-xs"> ({item.variantLabel})</span>
                )}
              </span>
              <span className="text-[#7a7a7a] text-xs shrink-0 ml-2">
                {formatPrice(item.priceAtOrder * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Comment */}
        {order.comment && (
          <div className="border border-[#d4a83a] bg-[#fef8ec] px-3 py-2 text-sm text-[#9a7209]">
            {order.comment}
          </div>
        )}

        {/* Total row */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e8e8e8]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#1a1a1a]">Итого</span>
            {order.paymentStatus === "PAID" && (
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#256841] bg-[#eef7f0] border border-[#b3d9c0]">
                Оплачен
              </span>
            )}
            {order.paymentStatus === "PENDING" && (
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#9a7209] bg-[#fef8ec] border border-[#d4a83a]">
                Ожидает
              </span>
            )}
          </div>
          <span className="text-base font-extrabold text-[#1a1a1a]">{formatPrice(order.totalAmount)}</span>
        </div>

        {/* Action buttons */}
        {nextStatuses.length > 0 && (
          <div className="space-y-2">
            {awaitingPayment && (
              <p className="flex items-center gap-1 text-[11px] font-semibold text-[#9a7209]">
                <Clock className="h-3 w-3" />
                Ожидает оплаты — приём заблокирован
              </p>
            )}
            <div className="flex gap-2">
              {nextStatuses.map((s) => {
                const sConfig = STATUS_CONFIG[s];
                const isCancelled = s === "CANCELLED";
                const blocked = awaitingPayment && !isCancelled;
                return (
                  <button
                    key={s}
                    className={`flex-1 h-9 rounded-sm text-xs font-semibold uppercase tracking-[0.04em] transition-all active:opacity-85 disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                      isCancelled
                        ? "border border-[#e8b4b4] text-[#a82828] bg-[#fdf0f0] hover:bg-[#fbe4e4]"
                        : "bg-[#3c6e71] text-white hover:bg-[#325d5f]"
                    }`}
                    disabled={isUpdating || blocked}
                    onClick={() => onUpdateStatus(order.id, s)}
                  >
                    {sConfig?.icon}
                    <span>{sConfig?.label || s}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

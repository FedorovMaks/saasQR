"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useOrderStream, useSound } from "@/hooks/use-orders";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    icon: <Bell className="h-3.5 w-3.5" />,
  },
  ACCEPTED: {
    label: "Принят",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  DELIVERED: {
    label: "Отдан",
    color: "text-gray-500",
    bgColor: "bg-gray-50 border-gray-200",
    icon: <Truck className="h-3.5 w-3.5" />,
  },
  CANCELLED: {
    label: "Отменён",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
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

  // SSE handler
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
          // Replace existing call from same table
          const filtered = prev.filter((c) => c.tableNumber !== tbl);
          return [{ tableNumber: tbl, timestamp: event.timestamp || new Date().toISOString() }, ...filtered];
        });
        return;
      }

      const order = event.order as unknown as Order;

      if (event.type === "new_order") {
        setOrders((prev) => {
          if (prev.some((o) => o.id === order.id)) return prev;
          return [order, ...prev];
        });
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

      if (event.type === "status_change") {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, ...order } : o))
        );
      }
    },
    [playSound]
  );

  useOrderStream(venue.id, handleOrderEvent);

  // Refresh "time ago" every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Update order status
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

  // Filter orders
  const filtered =
    statusFilter === "ALL"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  // Counts per status
  const counts: Record<string, number> = {};
  for (const o of orders) {
    counts[o.status] = (counts[o.status] || 0) + 1;
  }
  const newCount = counts["NEW"] || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/admin"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f8] text-gray-500 hover:bg-[#e4e8f2] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <span className="truncate">Заказы — {venue.name}</span>
                {newCount > 0 && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 animate-pulse rounded-lg shrink-0">
                    {newCount} новых
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                Сегодня: {orders.length} заказов ·{" "}
                {formatPrice(orders.reduce((s, o) => s + o.totalAmount, 0))}
              </p>
            </div>
          </div>
          <Link
            href={`/${venue.slug}`}
            target="_blank"
            className="hidden sm:inline-flex h-10 items-center gap-2 rounded-xl bg-[#f0f2f8] px-4 text-sm font-extrabold text-gray-600 hover:bg-[#e4e8f2] transition-colors shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Меню
          </Link>
        </div>
        {/* Push toggle — always visible, full width on mobile */}
        <div className="flex items-center gap-2">
          <PushToggle />
          <Link
            href={`/${venue.slug}`}
            target="_blank"
            className="sm:hidden inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f0f2f8] px-5 text-sm font-extrabold text-gray-600 hover:bg-[#e4e8f2] transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Меню
          </Link>
        </div>
      </div>

      {/* Waiter calls */}
      {waiterCalls.length > 0 && (
        <div className="space-y-2">
          {waiterCalls.map((call) => (
            <div
              key={call.tableNumber}
              className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 animate-in slide-in-from-top duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-amber-600 animate-bounce" />
                </div>
                <div>
                  <p className="font-extrabold text-amber-800">
                    Столик {call.tableNumber} вызывает официанта
                  </p>
                  <p className="text-xs text-amber-600 font-medium">
                    {new Date(call.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => dismissWaiterCall(call.tableNumber)}
                className="h-10 px-4 rounded-xl bg-amber-200 text-amber-800 font-extrabold text-sm hover:bg-amber-300 transition-colors active:scale-95"
              >
                Ок
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === "ALL" ? orders.length : counts[tab.key] || 0;
          return (
            <Button
              key={tab.key}
              variant={statusFilter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(tab.key)}
              className="shrink-0 rounded-xl"
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({count})</span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-2xl bg-primary/10 p-5 mb-5">
              <ClipboardList className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Нет заказов</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter === "ALL"
                ? "Заказы за сегодня появятся здесь"
                : "Нет заказов с таким статусом"}
            </p>
          </CardContent>
        </Card>
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
      )}
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

  return (
    <Card
      className={`transition-all overflow-hidden ${
        isNew
          ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10"
          : "hover:shadow-md"
      } ${
        order.status === "DELIVERED" || order.status === "CANCELLED"
          ? "opacity-60"
          : ""
      }`}
    >
      <CardHeader className="pb-2 space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-bold">#{order.orderNumber}</span>
            {order.tableNumber && (
              <Badge
                variant="outline"
                className="text-xs rounded-lg font-medium"
              >
                Стол {order.tableNumber}
              </Badge>
            )}
          </div>
          <Badge
            className={`${config.bgColor} ${config.color} border flex items-center gap-1 rounded-lg font-medium`}
          >
            {config.icon}
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
          <Clock className="h-3 w-3" />
          {formatTime(order.createdAt)} · {timeAgo(order.createdAt)}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Items */}
        <div className="space-y-1.5 rounded-xl bg-secondary/50 p-3">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <span>
                <span className="font-semibold text-primary">
                  {item.quantity}×
                </span>{" "}
                {item.itemName}
                {item.variantLabel && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({item.variantLabel})
                  </span>
                )}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatPrice(item.priceAtOrder * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Comment */}
        {order.comment && (
          <div className="rounded-xl bg-amber-50 border border-amber-200/50 px-3 py-2 text-sm text-amber-800">
            {order.comment}
          </div>
        )}

        <Separator />

        {/* Total + payment status */}
        <div className="flex items-center justify-between font-semibold">
          <div className="flex items-center gap-2">
            <span>Итого</span>
            {order.paymentStatus === "PAID" && (
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-bold text-green-600 border border-green-200">
                Оплачен
              </span>
            )}
            {order.paymentStatus === "PENDING" && (
              <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600 border border-amber-200">
                Ожидает оплаты
              </span>
            )}
          </div>
          <span className="text-lg">{formatPrice(order.totalAmount)}</span>
        </div>

        {/* Action buttons */}
        {nextStatuses.length > 0 && (
          <div className="flex gap-2">
            {nextStatuses.map((s) => {
              const sConfig = STATUS_CONFIG[s];
              const isCancelled = s === "CANCELLED";
              return (
                <Button
                  key={s}
                  size="sm"
                  variant={isCancelled ? "outline" : "default"}
                  className={`flex-1 rounded-xl ${
                    isCancelled
                      ? "text-destructive hover:text-destructive border-destructive/20"
                      : "shadow-md shadow-primary/15"
                  }`}
                  disabled={isUpdating}
                  onClick={() => onUpdateStatus(order.id, s)}
                >
                  {sConfig?.icon}
                  <span className="ml-1">{sConfig?.label || s}</span>
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

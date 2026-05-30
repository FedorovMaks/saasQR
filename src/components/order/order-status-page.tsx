"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  CreditCard,
} from "lucide-react";

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

const STATUS_MAP: Record<
  string,
  { label: string; description: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  NEW: {
    label: "Заказ отправлен",
    description: "Ожидайте — заведение скоро примет ваш заказ",
    icon: <Clock className="h-8 w-8" />,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  ACCEPTED: {
    label: "Заказ принят!",
    description: "Ваш заказ принят и скоро будет готов",
    icon: <CheckCircle2 className="h-8 w-8" />,
    color: "text-green-500",
    bgColor: "bg-green-50",
  },
  PREPARING: {
    label: "Готовится",
    description: "Ваш заказ готовится",
    icon: <Clock className="h-8 w-8" />,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
  READY: {
    label: "Готов!",
    description: "Ваш заказ готов — ожидайте официанта",
    icon: <CheckCircle2 className="h-8 w-8" />,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
  },
  DELIVERED: {
    label: "Заказ отдан",
    description: "Приятного аппетита!",
    icon: <Truck className="h-8 w-8" />,
    color: "text-gray-400",
    bgColor: "bg-gray-50",
  },
  CANCELLED: {
    label: "Заказ отменён",
    description: "К сожалению, ваш заказ был отменён",
    icon: <XCircle className="h-8 w-8" />,
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
};

const PAYMENT_MAP: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  UNPAID: {
    label: "Не оплачен",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
  },
  PENDING: {
    label: "Ожидает оплаты",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  PAID: {
    label: "Оплачен",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
};

export function OrderStatusPage({
  order: initialOrder,
  venue,
}: {
  order: Order;
  venue: Venue;
}) {
  const [status, setStatus] = useState(initialOrder.status);
  const [paymentStatus, setPaymentStatus] = useState(initialOrder.paymentStatus);
  const [showAccepted, setShowAccepted] = useState(false);

  // Poll for status updates every 5 seconds
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${initialOrder.id}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status && data.status !== status) {
        setStatus(data.status);
        if (data.status === "ACCEPTED") {
          setShowAccepted(true);
        }
      }
      if (data.paymentStatus && data.paymentStatus !== paymentStatus) {
        setPaymentStatus(data.paymentStatus);
      }
    } catch {
      // ignore poll errors
    }
  }, [initialOrder.id, status, paymentStatus]);

  useEffect(() => {
    // Don't poll for terminal statuses
    if (status === "DELIVERED" || status === "CANCELLED") return;

    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [status, pollStatus]);

  const statusInfo = STATUS_MAP[status] || STATUS_MAP.NEW;
  const paymentInfo = PAYMENT_MAP[paymentStatus] || PAYMENT_MAP.UNPAID;

  return (
    <div className="min-h-screen bg-[#f0f2f8] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <div className="text-center">
          <div
            className={`inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-lg ${statusInfo.color} mb-4 transition-all ${
              showAccepted ? "animate-bounce" : ""
            }`}
            onAnimationEnd={() => setShowAccepted(false)}
          >
            {statusInfo.icon}
          </div>
          <h1 className="text-2xl font-black">Заказ #{initialOrder.orderNumber}</h1>
          <p className="text-gray-400 font-semibold mt-1">{venue.name}</p>
        </div>

        {/* Status card */}
        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-400 font-medium">Статус заказа</p>
              <p className={`text-lg font-black ${statusInfo.color}`}>
                {statusInfo.label}
              </p>
              <p className="text-sm text-gray-400 font-medium mt-0.5">
                {statusInfo.description}
              </p>
            </div>
            {initialOrder.tableNumber && (
              <div className="rounded-2xl bg-[#f0f2f8] px-4 py-2">
                <p className="text-xs text-gray-400 font-medium">Столик</p>
                <p className="text-lg font-black text-center">
                  {initialOrder.tableNumber}
                </p>
              </div>
            )}
          </div>

          {/* Pulsing indicator for active orders */}
          {(status === "NEW" || status === "ACCEPTED" || status === "PREPARING" || status === "READY") && (
            <div className={`rounded-2xl ${statusInfo.bgColor} px-4 py-3 flex items-center gap-3`}>
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  status === "NEW" ? "bg-blue-400" : status === "ACCEPTED" ? "bg-green-400" : status === "PREPARING" ? "bg-orange-400" : "bg-emerald-400"
                }`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  status === "NEW" ? "bg-blue-500" : status === "ACCEPTED" ? "bg-green-500" : status === "PREPARING" ? "bg-orange-500" : "bg-emerald-500"
                }`} />
              </span>
              <span className={`text-sm font-bold ${statusInfo.color}`}>
                {status === "NEW"
                  ? "Ожидаем подтверждения..."
                  : status === "ACCEPTED"
                  ? "Заказ принят, готовим..."
                  : status === "PREPARING"
                  ? "Готовим ваш заказ..."
                  : "Заказ готов, несём!"}
              </span>
            </div>
          )}

          {/* Payment status */}
          {paymentStatus !== "UNPAID" && (
            <div
              className={`rounded-2xl ${paymentInfo.bgColor} px-4 py-3 flex items-center gap-2 mt-3`}
            >
              <CreditCard className={`h-4 w-4 ${paymentInfo.color}`} />
              <span className={`text-sm font-bold ${paymentInfo.color}`}>
                {paymentInfo.label}
              </span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-bold text-gray-400 mb-3">
            Состав заказа
          </h3>
          <div className="space-y-2.5">
            {initialOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-semibold">
                  <span className="text-[#2563eb] font-bold">
                    {item.quantity}×
                  </span>{" "}
                  {item.itemName}
                  {item.variantLabel && (
                    <span className="text-gray-400 ml-1">
                      ({item.variantLabel})
                    </span>
                  )}
                </span>
                <span className="text-gray-400 font-medium">
                  {formatPrice(item.priceAtOrder * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {initialOrder.comment && (
            <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700 font-medium">
              {initialOrder.comment}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-base font-black">Итого</span>
            <span className="text-xl font-black">
              {formatPrice(initialOrder.totalAmount)}
            </span>
          </div>
        </div>

        {/* Back to menu */}
        <Link
          href={`/${venue.slug}`}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#2563eb] text-base font-extrabold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl active:scale-[0.97]"
        >
          Вернуться в меню
        </Link>
      </div>
    </div>
  );
}

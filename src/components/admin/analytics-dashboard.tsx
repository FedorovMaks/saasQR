"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatPrice, cn } from "@/lib/utils";
import {
  ArrowLeft,
  TrendingUp,
  ShoppingBag,
  Receipt,
  Trophy,
  Loader2,
  BarChart3,
} from "lucide-react";

type Venue = {
  id: string;
  name: string;
  slug: string;
};

type ChartPoint = {
  date: string;
  revenue: number;
  orders: number;
};

type TopItem = {
  rank: number;
  name: string;
  quantity: number;
  revenue: number;
};

type AnalyticsData = {
  period: string;
  totalRevenue: number;
  orderCount: number;
  avgCheck: number;
  statusCounts: Record<string, number>;
  chart: ChartPoint[];
  topItems: TopItem[];
};

const PERIODS = [
  { key: "today", label: "Сегодня" },
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "all", label: "Всё время" },
];

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function AnalyticsDashboard({ venue }: { venue: Venue }) {
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/venues/${venue.id}/analytics?period=${period}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [venue.id, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxRevenue = data
    ? Math.max(...data.chart.map((p) => p.revenue), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f2f8] text-gray-500 hover:bg-[#e4e8f2] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#2563eb]" />
            Аналитика — {venue.name}
          </h1>
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-extrabold transition-all ${
              period === p.key
                ? "bg-[#2563eb] text-white shadow-md shadow-blue-500/20"
                : "bg-[#f0f2f8] text-gray-500 hover:bg-[#e4e8f2]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
        </div>
      ) : data ? (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-3xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-9 w-9 rounded-2xl bg-green-50 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-bold text-gray-400">Выручка</span>
              </div>
              <p className="text-2xl font-black">{formatPrice(data.totalRevenue)}</p>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-9 w-9 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-[#2563eb]" />
                </div>
                <span className="text-sm font-bold text-gray-400">Заказы</span>
              </div>
              <p className="text-2xl font-black">{data.orderCount}</p>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-9 w-9 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-sm font-bold text-gray-400">Ср. чек</span>
              </div>
              <p className="text-2xl font-black">{formatPrice(data.avgCheck)}</p>
            </div>
          </div>

          {/* Revenue chart */}
          {data.chart.length > 1 && (
            <div className="rounded-3xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-5">
                Выручка по дням
              </h3>
              {(() => {
                const many = data.chart.length > 14;
                const gapClass = many ? "gap-0.5" : "gap-1.5";
                const labelEvery = many ? Math.ceil(data.chart.length / 8) : 1;
                return (
                  <>
                    {/* Bars */}
                    <div
                      className={cn("flex items-end", gapClass)}
                      style={{ height: 176 }}
                    >
                      {data.chart.map((point) => {
                        const barH =
                          maxRevenue > 0
                            ? Math.max(
                                Math.round((point.revenue / maxRevenue) * 160),
                                3
                              )
                            : 3;
                        return (
                          <div
                            key={point.date}
                            className="flex-1 min-w-0 relative flex flex-col justify-end group h-full"
                          >
                            {/* Tooltip */}
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-center pointer-events-none whitespace-nowrap z-10">
                              <p className="text-xs font-black text-[#2563eb]">
                                {formatPrice(point.revenue)}
                              </p>
                              <p className="text-[10px] font-bold text-gray-400">
                                {point.orders} зак.
                              </p>
                            </div>
                            {/* Bar */}
                            <div
                              className="w-full rounded-t-lg bg-[#2563eb]/80 hover:bg-[#2563eb] transition-all cursor-pointer"
                              style={{ height: barH, minHeight: 3 }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {/* Date labels (sparse when many) */}
                    <div className={cn("flex mt-2", gapClass)}>
                      {data.chart.map((point, i) => (
                        <span
                          key={point.date}
                          className="flex-1 min-w-0 text-center text-[10px] font-bold text-gray-400 whitespace-nowrap"
                        >
                          {i % labelEvery === 0
                            ? many
                              ? point.date.slice(8)
                              : formatShortDate(point.date)
                            : ""}
                        </span>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Top items */}
          {data.topItems.length > 0 && (
            <div className="rounded-3xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Популярные позиции
              </h3>
              <div className="space-y-3">
                {data.topItems.map((item) => {
                  const maxQty = data.topItems[0]?.quantity || 1;
                  const barWidth = Math.max(
                    (item.quantity / maxQty) * 100,
                    5
                  );
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-extrabold flex items-center gap-2">
                          <span className={`text-xs font-black w-6 text-center ${
                            item.rank <= 3 ? "text-amber-500" : "text-gray-400"
                          }`}>
                            {item.rank}
                          </span>
                          {item.name}
                        </span>
                        <span className="text-gray-400 font-bold flex items-center gap-3">
                          <span>{item.quantity} шт.</span>
                          <span className="text-gray-500 font-extrabold min-w-[80px] text-right">
                            {formatPrice(item.revenue)}
                          </span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#f0f2f8] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.rank === 1
                              ? "bg-amber-400"
                              : item.rank === 2
                              ? "bg-amber-300"
                              : item.rank === 3
                              ? "bg-amber-200"
                              : "bg-[#2563eb]/30"
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {data.orderCount === 0 && (
            <div className="rounded-3xl bg-white p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="mx-auto w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-[#2563eb]" />
              </div>
              <h3 className="text-lg font-black">Нет данных</h3>
              <p className="text-sm text-gray-400 font-semibold mt-1">
                За этот период заказов не было
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

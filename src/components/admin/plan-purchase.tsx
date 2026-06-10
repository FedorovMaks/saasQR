"use client";

import { useState } from "react";
import { Check, ArrowRight, Loader2, Sparkles } from "lucide-react";

type Plan = "BASIC" | "BUSINESS" | "PRO";
type Period = "monthly" | "yearly";

type PlanConfig = {
  name: string;
  label: string;
  monthlyPrice: number;
  yearlyPrice: number;
  extraVenuePrice: number;
  features: string[];
  highlighted?: boolean;
  hidden?: boolean;
};

async function startCheckout(url: string, body: object): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Не удалось создать платёж");
  }
  if (data.confirmationUrl) {
    window.location.href = data.confirmationUrl;
  } else {
    throw new Error("Платёжная ссылка не получена");
  }
}

/** Trial CTA button (1₽ / 7 days). */
export function TrialButton({
  priceRub,
  className,
  children,
}: {
  priceRub: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      await startCheckout("/api/billing/trial", {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading} className={className}>
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Создаём платёж...
          </>
        ) : (
          children ?? (
            <>
              Начать за {priceRub}₽
              <ArrowRight className="h-5 w-5" />
            </>
          )
        )}
      </button>
      {error && (
        <p className="text-sm font-semibold text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}

/** Full pricing grid with month/year toggle and clickable plan buttons. */
export function PlansGrid({
  plans,
  currentPlan,
  isActive,
}: {
  plans: Record<Plan, PlanConfig>;
  currentPlan: Plan;
  isActive: boolean;
}) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(plan: Plan) {
    setLoadingPlan(plan);
    setError(null);
    try {
      await startCheckout("/api/billing/subscribe", { plan, period });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setLoadingPlan(null);
    }
  }

  const entries = (Object.entries(plans) as [Plan, PlanConfig][]).filter(
    ([, config]) => !config.hidden
  );

  return (
    <div className="space-y-5">
      {/* Period toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center rounded-2xl bg-[#f0f0f0] p-1">
          <button
            onClick={() => setPeriod("monthly")}
            className={`h-10 rounded-xl px-5 text-sm font-extrabold transition-all ${
              period === "monthly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400"
            }`}
          >
            Месяц
          </button>
          <button
            onClick={() => setPeriod("yearly")}
            className={`h-10 rounded-xl px-5 text-sm font-extrabold transition-all ${
              period === "yearly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400"
            }`}
          >
            Год
            <span className="ml-1.5 text-xs font-bold text-green-500">
              −2 мес
            </span>
          </button>
        </div>
      </div>

      {error && (
        <p className="text-center text-sm font-semibold text-red-500">{error}</p>
      )}

      <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
        {entries.map(([planKey, planConfig]) => {
          const isCurrentPlan = isActive && currentPlan === planKey;
          const isHighlighted = planConfig.highlighted;
          const price =
            period === "yearly"
              ? planConfig.yearlyPrice
              : planConfig.monthlyPrice;
          const isLoading = loadingPlan === planKey;

          return (
            <div
              key={planKey}
              className={`flex flex-col rounded-3xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all relative ${
                isHighlighted
                  ? "ring-2 ring-[#3c6e71] shadow-[0_4px_24px_rgba(37,99,235,0.12)]"
                  : ""
              }`}
            >
              {isHighlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-[#3c6e71] px-4 py-1 text-xs font-bold text-white shadow-md">
                    Популярный
                  </span>
                </div>
              )}

              <div className="mb-5 pt-1">
                <h3 className="text-xl font-black mb-2">{planConfig.label}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">
                    {price.toLocaleString("ru-RU")}
                  </span>
                  <span className="text-gray-400 font-semibold">
                    ₽/{period === "yearly" ? "год" : "мес"}
                  </span>
                </div>
                <p className="text-xs text-gray-300 font-semibold mt-1">
                  {period === "yearly"
                    ? `${(planConfig.yearlyPrice / 12).toLocaleString("ru-RU", {
                        maximumFractionDigits: 0,
                      })} ₽/мес при оплате за год`
                    : `или ${planConfig.yearlyPrice.toLocaleString(
                        "ru-RU"
                      )} ₽/год`}
                </p>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {planConfig.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm font-semibold"
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5 ${
                        isHighlighted
                          ? "bg-[#3c6e71]/10 text-[#3c6e71]"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
                {planConfig.extraVenuePrice > 0 && (
                  <li className="flex items-start gap-2.5 text-sm font-semibold">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5 bg-gray-100 text-gray-400">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-gray-400">
                      Доп. заведение +
                      {planConfig.extraVenuePrice.toLocaleString("ru-RU")} ₽/мес
                    </span>
                  </li>
                )}
              </ul>

              {isCurrentPlan ? (
                <div className="flex h-12 items-center justify-center rounded-2xl bg-[#f0f0f0] text-sm font-extrabold text-gray-400">
                  Текущий тариф
                </div>
              ) : (
                <button
                  onClick={() => buy(planKey)}
                  disabled={isLoading}
                  className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-extrabold transition-all active:scale-[0.98] disabled:opacity-70 ${
                    isHighlighted
                      ? "bg-[#3c6e71] text-white shadow-lg shadow-none hover:shadow-xl"
                      : "bg-[#f0f0f0] text-gray-700 hover:bg-[#e4e8f2]"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Переход к оплате...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Оформить
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

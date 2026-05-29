import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserPlanUsage, PLANS, TRIAL_CONFIG, formatRubles } from "@/lib/plans";
import { Plan } from "@/generated/prisma";
import { redirect } from "next/navigation";
// PlanSwitchButton removed — plan changes only via payment or superadmin
import {
  Crown,
  Check,
  Zap,
  Building2,
  Sparkles,
  ArrowRight,
  Clock,
} from "lucide-react";

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysLeft(date: Date | null) {
  if (!date) return 0;
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const usage = await getUserPlanUsage(session.user.id);
  if (!usage) redirect("/login");

  const currentPlan = usage.plan;
  const config = usage.config;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black">Тарифы и подписка</h1>
        <p className="text-gray-400 font-semibold mt-1">
          Выберите тариф под ваши задачи
        </p>
      </div>

      {/* Trial banner */}
      {usage.isOnTrial && usage.trialEndsAt && (
        <div className="rounded-2xl bg-gradient-to-r from-[#2563eb] to-[#7c3aed] p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-extrabold text-lg">
                Пробный период — тариф «Про»
              </p>
              <p className="text-white/80 font-semibold text-sm">
                Осталось {daysLeft(usage.trialEndsAt)} дней · до{" "}
                {formatDate(usage.trialEndsAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb]/10 text-[#2563eb]">
            {currentPlan === "PRO" ? (
              <Crown className="h-6 w-6" />
            ) : currentPlan === "BUSINESS" ? (
              <Sparkles className="h-6 w-6" />
            ) : (
              <Zap className="h-6 w-6" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              Тариф «{config.label}»
              {currentPlan !== "BASIC" && (
                <span className="inline-flex items-center rounded-xl bg-[#2563eb]/10 px-3 py-1 text-xs font-bold text-[#2563eb]">
                  {config.label}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-400 font-semibold">
              {formatRubles(config.monthlyPrice)}/мес
              {usage.planExpiresAt && !usage.isOnTrial &&
                ` · активен до ${formatDate(usage.planExpiresAt)}`}
            </p>
          </div>
        </div>

        {/* Usage */}
        <div className="space-y-4">
          <UsageBar
            icon={<Building2 className="h-4 w-4" />}
            label="Заведения"
            current={usage.usage.venues}
            max={config.maxVenues}
          />
          {usage.usage.venueDetails.map((v) => (
            <div key={v.id} className="pl-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-gray-500">{v.name}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400 font-medium">
                  {v.items} позиций · {v.categories} категорий · {v.tables} столиков
                </span>
              </div>
              {config.maxTables > 0 && (
                <UsageBar
                  icon={<Clock className="h-4 w-4" />}
                  label="Столики"
                  current={v.tables}
                  max={config.maxTables}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trial CTA */}
      {currentPlan === "BASIC" && !usage.isOnTrial && (
        <div className="rounded-3xl bg-gradient-to-br from-[#eef2ff] to-white p-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-lg shadow-blue-500/20">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-black">
                  {TRIAL_CONFIG.label}
                </h3>
                <p className="text-sm text-gray-400 font-semibold">
                  Попробуйте все возможности с привязкой карты
                </p>
              </div>
            </div>
            <button
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#2563eb] px-6 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl active:scale-[0.97]"
              disabled
            >
              Попробовать за {TRIAL_CONFIG.price}₽
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Plans comparison */}
      <div className="grid gap-5 lg:grid-cols-3">
        {(Object.entries(PLANS) as [Plan, (typeof PLANS)[Plan]][]).map(
          ([planKey, planConfig]) => {
            const isCurrentPlan = currentPlan === planKey;
            const isHighlighted = planConfig.highlighted;

            return (
              <div
                key={planKey}
                className={`rounded-3xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all relative ${
                  isHighlighted
                    ? "ring-2 ring-[#2563eb] shadow-[0_4px_24px_rgba(37,99,235,0.12)]"
                    : ""
                }`}
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-[#2563eb] px-4 py-1 text-xs font-bold text-white shadow-md">
                      Популярный
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-5 pt-1">
                  <h3 className="text-xl font-black mb-2">{planConfig.label}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">
                      {planConfig.monthlyPrice.toLocaleString("ru-RU")}
                    </span>
                    <span className="text-gray-400 font-semibold">₽/мес</span>
                  </div>
                  <p className="text-xs text-gray-300 font-semibold mt-1">
                    или {planConfig.yearlyPrice.toLocaleString("ru-RU")} ₽/год
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {planConfig.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm font-semibold"
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5 ${
                          isHighlighted
                            ? "bg-[#2563eb]/10 text-[#2563eb]"
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
                        Доп. заведение +{planConfig.extraVenuePrice.toLocaleString("ru-RU")} ₽/мес
                      </span>
                    </li>
                  )}
                </ul>

                {/* Button */}
                {isCurrentPlan ? (
                  <div className="flex h-12 items-center justify-center rounded-2xl bg-[#f0f2f8] text-sm font-extrabold text-gray-400">
                    Текущий тариф
                  </div>
                ) : (
                  <button
                    disabled
                    className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-extrabold transition-all ${
                      isHighlighted
                        ? "bg-[#2563eb] text-white shadow-lg shadow-blue-500/20 opacity-70"
                        : "bg-[#f0f2f8] text-gray-600 opacity-70"
                    }`}
                  >
                    Скоро
                  </button>
                )}
              </div>
            );
          }
        )}
      </div>

      {/* Watermark note for basic */}
      {currentPlan === "BASIC" && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4 text-sm text-amber-700 font-semibold">
          На тарифе «Базовый» в меню гостя отображается watermark «Работает на QRMenu». Перейдите на «Бизнес» или «Про» для удаления.
        </div>
      )}

    </div>
  );
}

function UsageBar({
  icon,
  label,
  current,
  max,
}: {
  icon: React.ReactNode;
  label: string;
  current: number;
  max: number;
}) {
  const pct = Math.min((current / max) * 100, 100);
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
          {icon}
          {label}
        </div>
        <span
          className={`text-sm font-bold ${
            isAtLimit
              ? "text-red-500"
              : isNearLimit
                ? "text-amber-500"
                : "text-gray-500"
          }`}
        >
          {current} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#f0f2f8] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isAtLimit
              ? "bg-red-500"
              : isNearLimit
                ? "bg-amber-400"
                : "bg-[#2563eb]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

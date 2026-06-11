export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserPlanUsage, PLANS, TRIAL_CONFIG, formatRubles, hasActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PlansGrid, TrialButton } from "@/components/admin/plan-purchase";
import { PaymentProcessingBanner } from "@/components/admin/payment-processing-banner";
import {
  Crown,
  Zap,
  Building2,
  Sparkles,
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

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { trialUsed: true },
  });
  const trialUsed = dbUser?.trialUsed ?? false;

  const sub = await hasActiveSubscription(session.user.id);
  const subActive = sub.active;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold uppercase tracking-[0.12em] text-[#1a1a1a]">Тарифы и подписка</h1>
        <p className="text-sm text-[#7a7a7a] mt-1">
          Выберите тариф под ваши задачи
        </p>
      </div>

      <Suspense fallback={null}>
        <PaymentProcessingBanner />
      </Suspense>

      {/* Trial banner */}
      {usage.isOnTrial && usage.trialEndsAt && (
        <div className="border-2 border-[#3c6e71] bg-[#eef6f6] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#3c6e71]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm uppercase tracking-[0.04em] text-[#1a1a1a]">
                Пробный период — тариф «Про»
              </p>
              <p className="text-[#7a7a7a] text-xs">
                Осталось {daysLeft(usage.trialEndsAt)} дней · до{" "}
                {formatDate(usage.trialEndsAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current plan card */}
      <div className="border border-[#d9d9d9] bg-white p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#eef6f6] text-[#3c6e71]">
            {currentPlan === "PRO" ? (
              <Crown className="h-5 w-5" />
            ) : currentPlan === "BUSINESS" ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <Zap className="h-5 w-5" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1a1a1a] flex items-center gap-2">
              Тариф «{config.label}»
              {currentPlan !== "BASIC" && (
                <span className="inline-flex items-center rounded-full bg-[#eef6f6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#3c6e71]">
                  {config.label}
                </span>
              )}
            </h2>
            <p className="text-xs text-[#7a7a7a]">
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
                <span className="text-sm font-medium text-[#353535]">{v.name}</span>
                <span className="text-xs text-[#c4c4c4]">·</span>
                <span className="text-xs text-[#a0a0a0]">
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
      {currentPlan === "BASIC" && !usage.isOnTrial && !trialUsed && (
        <div className="border-2 border-[#3c6e71] bg-[#eef6f6] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#3c6e71] text-white shrink-0">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.04em] text-[#1a1a1a]">
                  {TRIAL_CONFIG.label}
                </h3>
                <p className="text-xs text-[#7a7a7a]">
                  Полный доступ ко всем функциям на {TRIAL_CONFIG.durationDays} дней
                </p>
              </div>
            </div>
            <TrialButton
              priceRub={TRIAL_CONFIG.price}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#3c6e71] px-6 text-sm font-semibold uppercase tracking-[0.04em] text-white transition-all hover:bg-[#325d5f] active:opacity-85 disabled:opacity-70 shrink-0"
            />
          </div>
        </div>
      )}

      <PlansGrid plans={PLANS} currentPlan={currentPlan} isActive={subActive} />

      {currentPlan === "BASIC" && (
        <div className="border border-[#d4a83a] bg-[#fef8ec] px-5 py-4 text-sm text-[#9a7209]">
          На тарифе «Базовый» в меню гостя отображается watermark «Работает на TapMenu». Перейдите на «Бизнес» или «Про» для удаления.
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
        <div className="flex items-center gap-2 text-sm font-medium text-[#353535]">
          {icon}
          {label}
        </div>
        <span
          className={`text-sm font-bold ${
            isAtLimit
              ? "text-[#a82828]"
              : isNearLimit
                ? "text-[#9a7209]"
                : "text-[#353535]"
          }`}
        >
          {current} / {max}
        </span>
      </div>
      <div className="h-1.5 bg-[#f0f0f0] overflow-hidden">
        <div
          className={`h-full transition-all ${
            isAtLimit
              ? "bg-[#a82828]"
              : isNearLimit
                ? "bg-[#d4a83a]"
                : "bg-[#3c6e71]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

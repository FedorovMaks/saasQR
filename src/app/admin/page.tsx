export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkVenueLimit, checkFeatureAccess, hasActiveSubscription, TRIAL_CONFIG } from "@/lib/plans";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Plus,
  MapPin,
  ExternalLink,
  UtensilsCrossed,
  Settings,
  Store,
  Crown,
  BarChart3,
  UserPlus,
  Lock,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { DeleteVenueButton } from "@/components/admin/delete-venue-button";
import { TrialButton } from "@/components/admin/plan-purchase";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "waiter" && session.user.staffVenueIds?.length > 0) {
    redirect(`/admin/venues/${session.user.staffVenueIds[0]}/orders`);
  }

  const subscription = await hasActiveSubscription(session!.user.id);
  const me = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { trialUsed: true },
  });
  const trialUsed = me?.trialUsed ?? false;

  const venues = await prisma.venue.findMany({
    where: { ownerId: session!.user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const venueLimit = await checkVenueLimit(session!.user.id);
  const canAddVenue = venueLimit.allowed;

  const analyticsAccess = await checkFeatureAccess(session!.user.id, "analytics");

  if (!subscription.active) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-[0.12em] text-[#1a1a1a]">Добро пожаловать</h1>
          <p className="text-sm text-[#7a7a7a] mt-1">
            Начните с пробного периода — все функции бесплатно
          </p>
        </div>

        {/* Trial offer card */}
        <div className="border-2 border-[#3c6e71] bg-white p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#eef6f6]">
              <Sparkles className="h-6 w-6 text-[#3c6e71]" />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-[0.12em] text-[#1a1a1a]">Попробуйте «Про» за {TRIAL_CONFIG.price}₽</h2>
              <p className="text-sm text-[#7a7a7a]">
                {TRIAL_CONFIG.durationDays} дней полного доступа ко всем функциям
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {[
              "До 5 заведений",
              "Неограниченное меню",
              "Онлайн-заказы с push-уведомлениями",
              "Безлимитные столики",
              "Аналитика и отчёты",
              "Без watermark",
              "Персонал и роли",
              "QR-коды для столиков",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef6f6]">
                  <Check className="h-3 w-3 text-[#3c6e71]" />
                </div>
                <span className="text-sm text-[#353535]">{feature}</span>
              </div>
            ))}
          </div>

          {trialUsed ? (
            <Link
              href="/admin/billing"
              className="inline-flex h-12 items-center gap-3 rounded-sm bg-[#3c6e71] px-8 text-sm font-semibold uppercase tracking-[0.04em] text-white transition-all hover:bg-[#325d5f] active:opacity-85"
            >
              Выбрать тариф
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <TrialButton
              priceRub={TRIAL_CONFIG.price}
              className="inline-flex h-12 items-center gap-3 rounded-sm bg-[#3c6e71] px-8 text-sm font-semibold uppercase tracking-[0.04em] text-white transition-all hover:bg-[#325d5f] active:opacity-85 disabled:opacity-70"
            >
              Начать за {TRIAL_CONFIG.price}₽
              <ArrowRight className="h-4 w-4" />
            </TrialButton>
          )}
          <p className="text-[#a0a0a0] text-xs mt-3">
            Оплата через СБП · {TRIAL_CONFIG.durationDays} дней доступа
          </p>
        </div>

        {/* What happens next */}
        <div className="border border-[#d9d9d9] bg-white p-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1a1a1a] mb-4">Как это работает</h3>
          <div className="space-y-4">
            {[
              { step: "1", text: "Оплатите пробный период — всего 1₽" },
              { step: "2", text: "Создайте заведение и настройте меню" },
              { step: "3", text: "Сгенерируйте QR-коды для столиков" },
              { step: "4", text: "Гости сканируют QR и делают заказы" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#eef6f6] text-[#3c6e71] font-bold text-sm">
                  {step}
                </div>
                <p className="text-sm text-[#353535]">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/admin/billing"
            className="text-xs font-bold uppercase tracking-[0.08em] text-[#a0a0a0] hover:text-[#3c6e71] transition-colors"
          >
            Посмотреть все тарифы →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-[0.12em] text-[#1a1a1a]">Мои заведения</h1>
          <p className="text-sm text-[#7a7a7a] mt-1">
            {venueLimit.currentCount !== undefined && venueLimit.limit !== undefined
              ? `${venueLimit.currentCount} заведени${venueLimit.currentCount === 1 ? "е" : "й"}${
                  "isExtra" in venueLimit && venueLimit.isExtra
                    ? ` (${venueLimit.limit} вкл. в тариф)`
                    : ` из ${venueLimit.limit}`
                }`
              : "Управляйте вашими заведениями и меню"}
          </p>
        </div>
        {canAddVenue ? (
          <Link
            href="/admin/venues/new"
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-[#3c6e71] px-6 text-sm font-semibold uppercase tracking-[0.04em] text-white transition-all hover:bg-[#325d5f] active:opacity-85"
          >
            <Plus className="h-4 w-4" />
            Добавить заведение
            {"isExtra" in venueLimit && venueLimit.isExtra && (
              <span className="text-xs opacity-70 ml-1">
                +{venueLimit.extraPrice?.toLocaleString("ru-RU")}₽/мес
              </span>
            )}
          </Link>
        ) : (
          <Link
            href="/admin/billing"
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-[#fef8ec] border border-[#d4a83a] px-6 text-sm font-semibold uppercase tracking-[0.04em] text-[#9a7209] transition-all hover:bg-[#f5ebd0] active:opacity-85"
          >
            <Crown className="h-4 w-4" />
            Улучшить тариф
          </Link>
        )}
      </div>

      {/* Empty state */}
      {venues.length === 0 ? (
        <div className="border border-[#d9d9d9] bg-white p-16 text-center">
          <div className="mx-auto w-16 h-16 rounded-sm bg-[#eef6f6] flex items-center justify-center mb-6">
            <Store className="h-8 w-8 text-[#3c6e71]" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1a1a1a]">Нет заведений</h3>
          <p className="text-sm text-[#7a7a7a] mt-2 mb-8 max-w-sm mx-auto">
            Создайте ваше первое заведение, добавьте меню — и гости смогут
            делать заказы через QR-код
          </p>
          <Link
            href="/admin/venues/new"
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-[#3c6e71] px-8 text-sm font-semibold uppercase tracking-[0.04em] text-white transition-all hover:bg-[#325d5f] active:opacity-85"
          >
            <Plus className="h-4 w-4" />
            Создать заведение
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="border border-[#d9d9d9] bg-white p-6 transition-all hover:bg-[#f7f7f7]"
            >
              {/* Title row */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-[#1a1a1a]">{venue.name}</h2>
                  {venue.address && (
                    <p className="text-xs text-[#a0a0a0] flex items-center gap-1.5 mt-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {venue.address}
                    </p>
                  )}
                </div>
                <DeleteVenueButton venueId={venue.id} venueName={venue.name} />
              </div>

              {venue.description && (
                <p className="text-sm text-[#7a7a7a] line-clamp-2 mb-4">
                  {venue.description}
                </p>
              )}

              {/* Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/admin/venues/${venue.id}/orders`}
                  className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#3c6e71] px-4 text-xs font-semibold uppercase tracking-[0.04em] text-white transition-all hover:bg-[#325d5f] active:opacity-85"
                >
                  Заказы
                </Link>
                <Link
                  href={`/admin/venues/${venue.id}/menu`}
                  className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#d9d9d9] px-4 text-xs font-semibold uppercase tracking-[0.04em] text-[#353535] transition-all hover:border-[#c4c4c4]"
                >
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  Меню
                </Link>
                {analyticsAccess.allowed ? (
                  <Link
                    href={`/admin/venues/${venue.id}/analytics`}
                    className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#d9d9d9] px-4 text-xs font-semibold uppercase tracking-[0.04em] text-[#353535] transition-all hover:border-[#c4c4c4]"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Аналитика
                  </Link>
                ) : (
                  <Link
                    href="/admin/billing"
                    className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#d4a83a] bg-[#fef8ec] px-4 text-xs font-semibold uppercase tracking-[0.04em] text-[#9a7209] transition-all hover:bg-[#f5ebd0]"
                    title="Доступно с тарифа «Бизнес»"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Аналитика
                  </Link>
                )}
                <Link
                  href={`/admin/venues/${venue.id}/staff`}
                  className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#d9d9d9] px-4 text-xs font-semibold uppercase tracking-[0.04em] text-[#353535] transition-all hover:border-[#c4c4c4]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Персонал
                </Link>
                <Link
                  href={`/admin/venues/${venue.id}`}
                  className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#d9d9d9] px-4 text-xs font-semibold uppercase tracking-[0.04em] text-[#353535] transition-all hover:border-[#c4c4c4]"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Настройки
                </Link>
                <Link
                  href={`/${venue.slug}`}
                  target="_blank"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-[#d9d9d9] text-[#a0a0a0] transition-all hover:border-[#c4c4c4] hover:text-[#3c6e71]"
                  title="Открыть меню"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

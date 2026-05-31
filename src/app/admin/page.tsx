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

  // Waiter → redirect to their venue's orders
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

  // No active subscription — show trial offer
  if (!subscription.active) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black">Добро пожаловать в QRMenu!</h1>
          <p className="text-gray-400 font-semibold mt-1">
            Начните с пробного периода — все функции бесплатно
          </p>
        </div>

        {/* Trial offer card */}
        <div className="rounded-3xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] p-8 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Попробуйте «Про» за {TRIAL_CONFIG.price}₽</h2>
              <p className="text-white/80 font-semibold">
                {TRIAL_CONFIG.durationDays} дней полного доступа ко всем функциям
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
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
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3 w-3" />
                </div>
                <span className="text-sm font-semibold text-white/90">{feature}</span>
              </div>
            ))}
          </div>

          {trialUsed ? (
            <Link
              href="/admin/billing"
              className="inline-flex h-14 items-center gap-3 rounded-2xl bg-white px-8 text-lg font-extrabold text-[#2563eb] shadow-lg transition-all hover:shadow-xl active:scale-[0.97]"
            >
              Выбрать тариф
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <TrialButton
              priceRub={TRIAL_CONFIG.price}
              className="inline-flex h-14 items-center gap-3 rounded-2xl bg-white px-8 text-lg font-extrabold text-[#2563eb] shadow-lg transition-all hover:shadow-xl active:scale-[0.97] disabled:opacity-70"
            >
              Начать за {TRIAL_CONFIG.price}₽
              <ArrowRight className="h-5 w-5" />
            </TrialButton>
          )}
          <p className="text-white/50 text-xs font-semibold mt-3">
            Оплата через СБП · {TRIAL_CONFIG.durationDays} дней доступа
          </p>
        </div>

        {/* What happens next */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h3 className="text-lg font-black mb-4">Как это работает</h3>
          <div className="space-y-4">
            {[
              { step: "1", text: "Оплатите пробный период — всего 1₽" },
              { step: "2", text: "Создайте заведение и настройте меню" },
              { step: "3", text: "Сгенерируйте QR-коды для столиков" },
              { step: "4", text: "Гости сканируют QR и делают заказы" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2563eb]/10 text-[#2563eb] font-black text-sm">
                  {step}
                </div>
                <p className="text-sm font-semibold text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing link */}
        <div className="text-center">
          <Link
            href="/admin/billing"
            className="text-sm font-bold text-gray-400 hover:text-[#2563eb] transition-colors"
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
          <h1 className="text-3xl font-black">Мои заведения</h1>
          <p className="text-gray-400 font-semibold mt-1">
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
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#2563eb] px-6 text-base font-extrabold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl active:scale-[0.97]"
          >
            <Plus className="h-5 w-5" />
            Добавить заведение
            {"isExtra" in venueLimit && venueLimit.isExtra && (
              <span className="text-xs font-bold opacity-70 ml-1">
                +{venueLimit.extraPrice?.toLocaleString("ru-RU")}₽/мес
              </span>
            )}
          </Link>
        ) : (
          <Link
            href="/admin/billing"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-amber-50 px-6 text-base font-extrabold text-amber-600 transition-all hover:bg-amber-100 active:scale-[0.97]"
          >
            <Crown className="h-5 w-5" />
            Улучшить тариф
          </Link>
        )}
      </div>

      {/* Empty state */}
      {venues.length === 0 ? (
        <div className="rounded-3xl bg-white p-16 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-6">
            <Store className="h-10 w-10 text-[#2563eb]" />
          </div>
          <h3 className="text-xl font-black">Нет заведений</h3>
          <p className="text-base text-gray-400 font-semibold mt-2 mb-8 max-w-sm mx-auto">
            Создайте ваше первое заведение, добавьте меню — и гости смогут
            делать заказы через QR-код
          </p>
          <Link
            href="/admin/venues/new"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#2563eb] px-8 text-base font-extrabold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl active:scale-[0.97]"
          >
            <Plus className="h-5 w-5" />
            Создать заведение
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="rounded-3xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
            >
              {/* Title row */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-black">{venue.name}</h2>
                  {venue.address && (
                    <p className="text-sm text-gray-400 font-semibold flex items-center gap-1.5 mt-1">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {venue.address}
                    </p>
                  )}
                </div>
                <DeleteVenueButton venueId={venue.id} venueName={venue.name} />
              </div>

              {/* Description */}
              {venue.description && (
                <p className="text-sm text-gray-400 font-medium line-clamp-2 mb-4">
                  {venue.description}
                </p>
              )}

              {/* Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <Link
                  href={`/admin/venues/${venue.id}/orders`}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#2563eb] px-5 text-sm font-extrabold text-white shadow-md shadow-blue-500/15 transition-all hover:shadow-lg active:scale-[0.97]"
                >
                  Заказы
                </Link>
                <Link
                  href={`/admin/venues/${venue.id}/menu`}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f0f2f8] px-5 text-sm font-extrabold text-gray-600 transition-all hover:bg-[#e4e8f2] active:scale-[0.97]"
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  Меню
                </Link>
                {analyticsAccess.allowed ? (
                  <Link
                    href={`/admin/venues/${venue.id}/analytics`}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f0f2f8] px-5 text-sm font-extrabold text-gray-600 transition-all hover:bg-[#e4e8f2] active:scale-[0.97]"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Аналитика
                  </Link>
                ) : (
                  <Link
                    href="/admin/billing"
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-amber-50 px-5 text-sm font-extrabold text-amber-600 transition-all hover:bg-amber-100 active:scale-[0.97]"
                    title="Доступно с тарифа «Бизнес»"
                  >
                    <Lock className="h-4 w-4" />
                    Аналитика
                  </Link>
                )}
                <Link
                  href={`/admin/venues/${venue.id}/staff`}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f0f2f8] px-5 text-sm font-extrabold text-gray-600 transition-all hover:bg-[#e4e8f2] active:scale-[0.97]"
                >
                  <UserPlus className="h-4 w-4" />
                  Персонал
                </Link>
                <Link
                  href={`/admin/venues/${venue.id}`}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f0f2f8] px-5 text-sm font-extrabold text-gray-600 transition-all hover:bg-[#e4e8f2] active:scale-[0.97]"
                >
                  <Settings className="h-4 w-4" />
                  Настройки
                </Link>
                <Link
                  href={`/${venue.slug}`}
                  target="_blank"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f0f2f8] text-gray-400 transition-all hover:bg-[#e4e8f2] hover:text-[#2563eb] active:scale-[0.97]"
                  title="Открыть меню"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

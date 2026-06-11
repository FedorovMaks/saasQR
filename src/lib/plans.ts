import { Plan } from "@/generated/prisma";
import { prisma } from "./prisma";

export type PlanConfig = {
  name: string;
  label: string;
  monthlyPrice: number;   // рублей в месяц
  yearlyPrice: number;    // рублей в год
  maxVenues: number;
  maxTables: number;      // 0 = безлимит
  extraVenuePrice: number; // цена за доп. заведение (руб/мес), 0 = нельзя
  features: string[];
  highlighted?: boolean;
  hidden?: boolean;        // не показывать на странице тарифов (внутренний тариф для истёкших/бесплатных)
};

export const PLANS: Record<Plan, PlanConfig> = {
  BASIC: {
    name: "BASIC",
    label: "Базовый",
    monthlyPrice: 1490,
    yearlyPrice: 11990,
    maxVenues: 1,
    maxTables: 10,
    extraVenuePrice: 0,
    hidden: true, // больше не продаётся; остаётся как бесплатный/просроченный режим
    features: [
      "1 заведение",
      "До 10 столиков",
      "Неограниченное меню",
      "Онлайн-заказы с push-уведомлениями",
      "Приём оплаты гостями по СБП",
      "Базовая кастомизация (лого, цвета)",
      "Стоп-лист и варианты блюд",
    ],
  },
  BUSINESS: {
    name: "BUSINESS",
    label: "Бизнес",
    monthlyPrice: 3990,
    yearlyPrice: 39990,
    maxVenues: 1,
    maxTables: 0, // безлимит
    extraVenuePrice: 2990,
    highlighted: true,
    features: [
      "1 заведение",
      "Неограниченное меню и столики",
      "Онлайн-заказы с push-уведомлениями",
      "Приём оплаты гостями по СБП",
      "Аналитика заказов и выручки",
      "Кастомизация: логотип и цвета",
      "Стоп-лист и варианты блюд",
      "Сотрудники и роли доступа",
      "Без водяного знака",
    ],
  },
  PRO: {
    name: "PRO",
    label: "Про",
    monthlyPrice: 12990,
    yearlyPrice: 99990,
    maxVenues: 5,
    maxTables: 0, // безлимит
    extraVenuePrice: 2490,
    features: [
      "Всё из «Бизнеса»",
      "До 5 заведений включено",
      "Управление сетью из одного кабинета",
      "Приоритетная поддержка",
    ],
  },
};

export const TRIAL_CONFIG = {
  durationDays: 7,
  price: 1, // рублей
  plan: "PRO" as Plan,
  label: "7 дней за 1₽ на тарифе «Про»",
};

// Грейс-период после истечения подписки: всё работает как обычно 1 день.
export const GRACE_DAYS = 1;
const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Подписка/триал считается истёкшей только ПОСЛЕ грейс-периода.
 * Пока (expiresAt + грейс) в будущем — доступ есть.
 */
export function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() + GRACE_MS < Date.now();
}

/** Не истекло (с учётом грейса). */
export function isWithinAccess(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() + GRACE_MS >= Date.now();
}

/**
 * Get the user's effective plan, considering expiry (+ grace period).
 * If plan has expired (past grace), falls back to BASIC.
 */
export function getEffectivePlan(user: {
  plan: Plan;
  planExpiresAt: Date | null;
}): Plan {
  if (user.plan !== "BASIC") {
    if (isExpired(user.planExpiresAt)) {
      return "BASIC"; // expired (past grace) → downgrade
    }
  }
  return user.plan;
}

export type BillingPeriod = "monthly" | "yearly";

/**
 * Активировать пробный период (1₽ / 7 дней PRO). Триал — строго один раз.
 */
export async function activateTrial(userId: string) {
  const now = Date.now();
  const ends = new Date(now + TRIAL_CONFIG.durationDays * 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: TRIAL_CONFIG.plan,
      trialEndsAt: ends,
      planExpiresAt: ends,
      trialUsed: true,
      expiryEmailSent: null,
    },
  });
  return ends;
}

/**
 * Активировать платный тариф на период (месяц/год).
 * Продлевает от текущего planExpiresAt, если он ещё в будущем.
 */
export async function activatePlan(
  userId: string,
  plan: Plan,
  period: BillingPeriod
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planExpiresAt: true },
  });

  // Продление: если подписка ещё активна — добавляем к остатку, иначе от now
  const base =
    user?.planExpiresAt && isWithinAccess(user.planExpiresAt)
      ? new Date(user.planExpiresAt).getTime()
      : Date.now();

  const addMs =
    period === "yearly"
      ? 365 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;

  const expires = new Date(base + addMs);

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      planExpiresAt: expires,
      trialEndsAt: null,
      expiryEmailSent: null,
    },
  });
  return expires;
}

/**
 * Стоимость тарифа за период в КОПЕЙКАХ (для ЮKassa).
 */
export function getPlanPriceKopecks(plan: Plan, period: BillingPeriod): number {
  const config = PLANS[plan];
  const rubles = period === "yearly" ? config.yearlyPrice : config.monthlyPrice;
  return rubles * 100;
}

/**
 * Определить период по сумме платежа (защита: период берём не из тела
 * вебхука, а сверяем оплаченную сумму с прайсом тарифа).
 */
export function getPeriodFromAmountKopecks(
  plan: Plan,
  amountKopecks: number
): BillingPeriod | null {
  if (amountKopecks === PLANS[plan].monthlyPrice * 100) return "monthly";
  if (amountKopecks === PLANS[plan].yearlyPrice * 100) return "yearly";
  return null;
}

/**
 * Check if user is on trial.
 */
export function isOnTrial(user: {
  trialEndsAt: Date | null;
}): boolean {
  if (!user.trialEndsAt) return false;
  return user.trialEndsAt > new Date();
}

export function getPlanConfig(plan: Plan): PlanConfig {
  return PLANS[plan];
}

/**
 * Check if user has an active subscription (paid plan or trial).
 * Users with BASIC and no planExpiresAt/trialEndsAt have never paid.
 */
export async function hasActiveSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, trialEndsAt: true, isSuperAdmin: true },
  });

  if (!user) return { active: false, reason: "Пользователь не найден" };

  // Superadmin always has access
  if (user.isSuperAdmin) return { active: true };

  // Active trial (с учётом грейса)
  if (user.trialEndsAt && isWithinAccess(user.trialEndsAt)) {
    return { active: true, isTrial: true, trialEndsAt: user.trialEndsAt };
  }

  // Paid plan that hasn't expired (с учётом грейса)
  if (user.plan !== "BASIC" && isWithinAccess(user.planExpiresAt)) {
    return { active: true };
  }

  // BASIC with active expiry (user paid for BASIC)
  if (user.plan === "BASIC" && isWithinAccess(user.planExpiresAt)) {
    return { active: true };
  }

  return { active: false, reason: "Нет активной подписки" };
}

/**
 * Check if user can create a new venue.
 */
export async function checkVenueLimit(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, trialEndsAt: true, isSuperAdmin: true },
  });

  if (!user) return { allowed: false, reason: "Пользователь не найден" };

  // Check active subscription first
  const subscription = await hasActiveSubscription(userId);
  if (!subscription.active) {
    return {
      allowed: false,
      reason: "Для создания заведения нужна активная подписка",
      noSubscription: true,
      currentCount: 0,
      limit: 0,
      plan: "BASIC" as Plan,
    };
  }

  const effectivePlan = getEffectivePlan(user);
  const config = PLANS[effectivePlan];

  const venueCount = await prisma.venue.count({
    where: { ownerId: userId, isActive: true },
  });

  if (venueCount >= config.maxVenues) {
    // If plan allows extra venues for a fee, still allow adding
    if (config.extraVenuePrice > 0) {
      return {
        allowed: true,
        isExtra: true,
        extraPrice: config.extraVenuePrice,
        currentCount: venueCount,
        limit: config.maxVenues,
        plan: effectivePlan,
      };
    }

    return {
      allowed: false,
      reason: `Лимит заведений (${config.maxVenues}) на тарифе «${config.label}» исчерпан`,
      currentCount: venueCount,
      limit: config.maxVenues,
      plan: effectivePlan,
    };
  }

  return { allowed: true, currentCount: venueCount, limit: config.maxVenues, plan: effectivePlan };
}

/**
 * Check if user can add a table to a venue.
 */
export async function checkTableLimit(venueId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });

  if (!user) return { allowed: false, reason: "Пользователь не найден" };

  const effectivePlan = getEffectivePlan(user);
  const config = PLANS[effectivePlan];

  if (config.maxTables === 0) {
    // Безлимит
    return { allowed: true, currentCount: 0, limit: 0, plan: effectivePlan };
  }

  const tableCount = await prisma.table.count({
    where: { venueId },
  });

  if (tableCount >= config.maxTables) {
    return {
      allowed: false,
      reason: `Лимит столиков (${config.maxTables}) на тарифе «${config.label}» исчерпан`,
      currentCount: tableCount,
      limit: config.maxTables,
      plan: effectivePlan,
    };
  }

  return { allowed: true, currentCount: tableCount, limit: config.maxTables, plan: effectivePlan };
}

/**
 * Get usage stats for billing page.
 */
export async function getUserPlanUsage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, trialEndsAt: true },
  });

  if (!user) return null;

  const effectivePlan = getEffectivePlan(user);
  const config = PLANS[effectivePlan];
  const trial = isOnTrial(user);

  const venues = await prisma.venue.findMany({
    where: { ownerId: userId, isActive: true },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          categories: { where: { isActive: true } },
          tables: true,
        },
      },
    },
  });

  // Get item counts per venue
  const venueUsage = await Promise.all(
    venues.map(async (v) => {
      const itemCount = await prisma.menuItem.count({
        where: {
          isActive: true,
          category: { venueId: v.id, isActive: true },
        },
      });
      return {
        id: v.id,
        name: v.name,
        categories: v._count.categories,
        items: itemCount,
        tables: v._count.tables,
      };
    })
  );

  return {
    plan: effectivePlan,
    planExpiresAt: user.planExpiresAt,
    trialEndsAt: user.trialEndsAt,
    isOnTrial: trial,
    config,
    usage: {
      venues: venues.length,
      venueDetails: venueUsage,
    },
  };
}

/**
 * Feature gating: check if a plan has access to a feature.
 */
const PLAN_RANK: Record<Plan, number> = {
  BASIC: 0,
  BUSINESS: 1,
  PRO: 2,
};

export type Feature = "analytics" | "staff" | "unlimitedTables" | "noWatermark" | "customDomain";

const FEATURE_MIN_PLAN: Record<Feature, Plan> = {
  analytics: "BUSINESS",
  staff: "BASIC",           // staff available on all plans
  unlimitedTables: "BUSINESS",
  noWatermark: "BUSINESS",
  customDomain: "PRO",
};

export function hasFeature(plan: Plan, feature: Feature): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_MIN_PLAN[feature]];
}

/**
 * Check feature access for a user (reads from DB).
 */
export async function checkFeatureAccess(userId: string, feature: Feature) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });

  if (!user) return { allowed: false, reason: "Пользователь не найден", plan: "BASIC" as Plan };

  const effectivePlan = getEffectivePlan(user);
  const allowed = hasFeature(effectivePlan, feature);

  return {
    allowed,
    plan: effectivePlan,
    reason: allowed
      ? undefined
      : `Функция доступна с тарифа «${PLANS[FEATURE_MIN_PLAN[feature]].label}»`,
    requiredPlan: FEATURE_MIN_PLAN[feature],
  };
}

/**
 * Format price in rubles.
 */
export function formatRubles(amount: number): string {
  return amount.toLocaleString("ru-RU") + " ₽";
}

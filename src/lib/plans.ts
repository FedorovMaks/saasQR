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
    features: [
      "1 заведение",
      "До 10 столиков",
      "Неограниченное меню",
      "Онлайн-заказы с push-уведомлениями",
      "Приём оплаты через СБП и карты",
      "Базовая кастомизация (лого, цвета)",
      "Стоп-лист и варианты блюд",
    ],
  },
  BUSINESS: {
    name: "BUSINESS",
    label: "Бизнес",
    monthlyPrice: 2990,
    yearlyPrice: 23990,
    maxVenues: 1,
    maxTables: 0, // безлимит
    extraVenuePrice: 1990,
    highlighted: true,
    features: [
      "Всё из «Базового»",
      "Неограниченные столики",
      "Аналитика и экспорт отчётов",
      "Расширенная кастомизация дизайна",
      "SMS-уведомления",
      "Без watermark",
    ],
  },
  PRO: {
    name: "PRO",
    label: "Про",
    monthlyPrice: 12990,
    yearlyPrice: 99990,
    maxVenues: 5,
    maxTables: 0, // безлимит
    extraVenuePrice: 1490,
    features: [
      "Всё из «Бизнеса»",
      "До 5 заведений включено",
      "Программа лояльности",
      "Персональный менеджер",
      "Приоритетная поддержка",
      "Собственный домен",
    ],
  },
};

export const TRIAL_CONFIG = {
  durationDays: 7,
  price: 1, // рублей
  plan: "PRO" as Plan,
  label: "7 дней за 1₽ на тарифе «Про»",
};

/**
 * Get the user's effective plan, considering expiry.
 * If plan has expired, falls back to BASIC.
 */
export function getEffectivePlan(user: {
  plan: Plan;
  planExpiresAt: Date | null;
}): Plan {
  if (user.plan !== "BASIC") {
    if (user.planExpiresAt && user.planExpiresAt < new Date()) {
      return "BASIC"; // expired → downgrade
    }
  }
  return user.plan;
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

  // Active trial
  if (user.trialEndsAt && user.trialEndsAt > new Date()) {
    return { active: true, isTrial: true, trialEndsAt: user.trialEndsAt };
  }

  // Paid plan that hasn't expired
  if (user.plan !== "BASIC" && user.planExpiresAt && user.planExpiresAt > new Date()) {
    return { active: true };
  }

  // BASIC with active expiry (user paid for BASIC)
  if (user.plan === "BASIC" && user.planExpiresAt && user.planExpiresAt > new Date()) {
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

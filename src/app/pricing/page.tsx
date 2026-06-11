import type { Metadata } from "next";
import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Тарифы и услуги — TapMenu",
  description:
    "Описание сервиса TapMenu, тарифы и стоимость подписки. Доступ онлайн сразу после оплаты.",
};

const rub = (n: number) => n.toLocaleString("ru-RU") + " ₽";

const PLANS_DISPLAY = [
  {
    label: "Бизнес",
    monthly: 3990,
    yearly: 39990,
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
  {
    label: "Про",
    monthly: 12990,
    yearly: 99990,
    highlighted: false,
    features: [
      "Всё из «Бизнеса»",
      "До 5 заведений включено",
      "Управление сетью из одного кабинета",
      "Приоритетная поддержка",
    ],
  },
];

export default function PricingPage() {
  return (
    <LegalShell
      title="Тарифы и услуги"
      subtitle="Онлайн-сервис цифрового меню по подписке"
    >
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1a1a1a]">Что это за услуга</h2>
      <p>
        <b>TapMenu</b> — онлайн-сервис (SaaS) для заведений общепита: создание
        цифрового меню, генерация QR-кодов для столиков и приём заказов в
        реальном времени. Сервис доступен по адресу{" "}
        <a href="https://tap-menu.ru" className="text-[#3c6e71] hover:underline">
          tap-menu.ru
        </a>{" "}
        и предоставляется по подписке.
      </p>

      <h2 className="pt-2 text-sm font-bold uppercase tracking-[0.12em] text-[#1a1a1a]">
        Как предоставляется услуга
      </h2>
      <p>
        Услуга оказывается дистанционно. После оплаты доступ к выбранному тарифу
        активируется <b>автоматически</b> в личном кабинете на tap-menu.ru.
        Это цифровая услуга — физическая доставка не требуется. Оплата
        производится онлайн через ЮKassa (банковская карта, СБП); подписка
        оформляется на месяц или год.
      </p>

      {/* Trial */}
      <div className="flex items-center gap-3 border border-[#3c6e71] bg-[#eef6f6] p-4 text-[#3c6e71]">
        <Zap className="h-4 w-4 shrink-0" />
        <p className="text-sm font-semibold">
          Пробный период: 7 дней за 1&nbsp;₽ на тарифе «Бизнес». Предоставляется
          один раз.
        </p>
      </div>

      <h2 className="pt-2 text-sm font-bold uppercase tracking-[0.12em] text-[#1a1a1a]">Тарифы</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS_DISPLAY.map((p) => (
          <div
            key={p.label}
            className={`flex flex-col border p-5 ${
              p.highlighted
                ? "border-[#3c6e71] border-2"
                : "border-[#d9d9d9]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1a1a1a]">{p.label}</span>
              {p.highlighted && (
                <span className="rounded-full bg-[#eef6f6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#3c6e71]">
                  Рекомендуем
                </span>
              )}
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#1a1a1a]">
                {rub(p.monthly)}
              </span>
              <span className="text-xs text-[#a0a0a0]"> / мес</span>
            </div>
            <div className="mt-0.5 text-xs text-[#a0a0a0]">
              или {rub(p.yearly)} / год
            </div>
            <ul className="mt-4 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3c6e71]" />
                  <span className="text-[#353535]">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#a0a0a0]">
        Все цены указаны в рублях РФ и включают все комиссии сервиса. Условия
        оказания услуг и возвратов — в{" "}
        <Link href="/offer" className="text-[#3c6e71] hover:underline">
          публичной оферте
        </Link>
        .
      </p>
    </LegalShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Тарифы и услуги — QRMenu",
  description:
    "Описание сервиса QRMenu, тарифы и стоимость подписки. Доступ онлайн сразу после оплаты.",
};

// Значения дублируют src/lib/plans.ts (PLANS). При изменении цен — синхронизировать.
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
      <h2 className="text-xl font-black text-gray-900">Что это за услуга</h2>
      <p>
        <b>QRMenu</b> — онлайн-сервис (SaaS) для заведений общепита: создание
        цифрового меню, генерация QR-кодов для столиков и приём заказов в
        реальном времени. Сервис доступен по адресу{" "}
        <a href="https://tap-menu.ru" className="text-[#2563eb] hover:underline">
          tap-menu.ru
        </a>{" "}
        и предоставляется по подписке.
      </p>

      <h2 className="pt-2 text-xl font-black text-gray-900">
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
      <div className="flex items-center gap-3 rounded-2xl bg-blue-50 p-5 text-[#2563eb]">
        <Zap className="h-5 w-5 shrink-0" />
        <p className="font-bold">
          Пробный период: 7 дней за 1&nbsp;₽ на тарифе «Про». Предоставляется
          один раз.
        </p>
      </div>

      <h2 className="pt-2 text-xl font-black text-gray-900">Тарифы</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS_DISPLAY.map((p) => (
          <div
            key={p.label}
            className={`flex flex-col rounded-3xl border p-5 ${
              p.highlighted
                ? "border-[#2563eb] bg-white shadow-[0_8px_40px_rgba(37,99,235,0.12)]"
                : "border-gray-100 bg-white"
            }`}
          >
            <div className="font-black text-gray-900">{p.label}</div>
            <div className="mt-2">
              <span className="text-2xl font-black text-gray-900">
                {rub(p.monthly)}
              </span>
              <span className="text-sm font-bold text-gray-400"> / мес</span>
            </div>
            <div className="mt-0.5 text-sm font-semibold text-gray-400">
              или {rub(p.yearly)} / год
            </div>
            <ul className="mt-4 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" />
                  <span className="text-gray-600">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-400">
        Все цены указаны в рублях РФ и включают все комиссии сервиса. Условия
        оказания услуг и возвратов — в{" "}
        <Link href="/offer" className="text-[#2563eb] hover:underline">
          публичной оферте
        </Link>
        .
      </p>
    </LegalShell>
  );
}

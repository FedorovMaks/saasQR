import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import { LegalShell, Requisites } from "@/components/legal/legal-shell";
import { COMPANY } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Контакты и реквизиты — QRMenu",
  description:
    "Контактная информация и реквизиты сервиса QRMenu (tap-menu.ru).",
};

export default function ContactsPage() {
  return (
    <LegalShell
      title="Контакты и реквизиты"
      subtitle="По вопросам оплаты, возвратов, подключения и работы сервиса"
    >
      <p>
        Пишите на e-mail или звоните — отвечаем в течение рабочего дня.
        Самый быстрый способ связи — электронная почта.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row">
        <a
          href={`mailto:${COMPANY.email}`}
          className="flex flex-1 items-center gap-4 rounded-2xl border border-gray-100 p-5 transition-colors hover:border-blue-200"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563eb]">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-400">E-mail</div>
            <div className="truncate font-black text-gray-800">
              {COMPANY.email}
            </div>
          </div>
        </a>

        <a
          href={`tel:${COMPANY.phoneHref}`}
          className="flex flex-1 items-center gap-4 rounded-2xl border border-gray-100 p-5 transition-colors hover:border-blue-200"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-600">
            <Phone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-400">Телефон</div>
            <div className="font-black text-gray-800">{COMPANY.phone}</div>
          </div>
        </a>
      </div>

      <h2 className="pt-3 text-xl font-black text-gray-900">Реквизиты</h2>
      <Requisites />
    </LegalShell>
  );
}

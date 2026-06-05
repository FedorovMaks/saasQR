import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const venue = await prisma.venue.findUnique({
    where: { slug },
    select: { name: true },
  });
  return {
    title: venue ? `Реквизиты и оферта — ${venue.name}` : "Реквизиты и оферта",
  };
}

export default async function VenueInfoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const venue = await prisma.venue.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      isActive: true,
      legalForm: true,
      legalName: true,
      legalInn: true,
      legalOgrn: true,
      legalEmail: true,
      legalPhone: true,
    },
  });

  if (!venue || !venue.isActive) notFound();

  const executor =
    [venue.legalForm, venue.legalName].filter(Boolean).join(" ").trim() ||
    venue.name;
  const menuUrl = `${SITE_URL}/${venue.slug}`;

  const rows: { label: string; value: string; href?: string }[] = [
    { label: "Исполнитель", value: executor },
    ...(venue.legalInn ? [{ label: "ИНН", value: venue.legalInn }] : []),
    ...(venue.legalOgrn
      ? [{ label: "ОГРН / ОГРНИП", value: venue.legalOgrn }]
      : []),
    ...(venue.legalEmail
      ? [
          {
            label: "E-mail",
            value: venue.legalEmail,
            href: `mailto:${venue.legalEmail}`,
          },
        ]
      : []),
    ...(venue.legalPhone
      ? [
          {
            label: "Телефон",
            value: venue.legalPhone,
            href: `tel:${venue.legalPhone.replace(/[^+\d]/g, "")}`,
          },
        ]
      : []),
    { label: "Меню (товары и цены)", value: menuUrl, href: menuUrl },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-5 sm:px-6">
          <Link
            href={`/${venue.slug}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f8] text-gray-500 transition-colors hover:bg-[#e4e8f2]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="font-black">{venue.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          Реквизиты и оферта
        </h1>
        <p className="mt-3 font-semibold text-gray-400">{venue.name}</p>

        <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-gray-600">
          <h2 className="text-xl font-black text-gray-900">Реквизиты</h2>
          <div className="rounded-2xl bg-[#f0f2f8] p-5 sm:p-6">
            <dl className="space-y-3">
              {rows.map((r) => (
                <div key={r.label} className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="w-44 shrink-0 text-sm font-bold text-gray-400">
                    {r.label}
                  </dt>
                  <dd className="break-words font-bold text-gray-800">
                    {r.href ? (
                      <a href={r.href} className="text-[#2563eb] hover:underline">
                        {r.value}
                      </a>
                    ) : (
                      r.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <h2 className="pt-2 text-xl font-black text-gray-900">
            Публичная оферта
          </h2>
          <p>
            Настоящий документ является публичной офертой {executor} (далее —
            «Исполнитель») на продажу продукции общественного питания,
            представленной в меню по адресу{" "}
            <a href={menuUrl} className="text-[#2563eb] hover:underline">
              {menuUrl}
            </a>
            .
          </p>
          <p>
            <b>1. Предмет.</b> Исполнитель продаёт блюда и напитки, указанные в
            меню, по действующим в нём ценам. Заказ оформляется гостем через
            цифровое меню по QR-коду.
          </p>
          <p>
            <b>2. Оплата.</b> Оплата производится онлайн (СБП, банковская карта)
            либо на месте в заведении. Цены указаны в рублях РФ и действительны
            на момент оформления заказа.
          </p>
          <p>
            <b>3. Акцепт.</b> Оформление заказа означает согласие гостя с
            условиями настоящей оферты.
          </p>
          <p>
            <b>4. Права потребителя.</b> Возврат и претензии по качеству
            регулируются Законом РФ «О защите прав потребителей». По всем вопросам
            обращайтесь по контактам Исполнителя, указанным выше.
          </p>
          <p>
            <b>5. Исполнитель.</b> {executor}
            {venue.legalInn ? `, ИНН ${venue.legalInn}` : ""}.
          </p>
        </div>
      </main>
    </div>
  );
}

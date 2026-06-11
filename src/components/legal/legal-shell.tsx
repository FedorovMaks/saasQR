import Link from "next/link";
import { COMPANY } from "@/lib/legal";

const FOOTER_LINKS = [
  { href: "/pricing", label: "Тарифы" },
  { href: "/offer", label: "Оферта" },
  { href: "/privacy", label: "Конфиденциальность" },
  { href: "/contacts", label: "Контакты" },
];

export function LegalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#3c6e71] text-white text-xs font-extrabold tracking-tight">
              TM
            </div>
            <span className="text-lg font-black">{COMPANY.brand}</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-bold text-gray-400 transition-colors hover:text-[#3c6e71]"
          >
            На главную
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && (
            <p className="mt-3 font-semibold text-gray-400">{subtitle}</p>
          )}
          <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-gray-600">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-3xl px-5 sm:px-6">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-bold text-gray-400 transition-colors hover:text-[#3c6e71]"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs font-medium text-gray-300">
            © {new Date().getFullYear()} {COMPANY.brand} · {COMPANY.legalName} · ИНН{" "}
            {COMPANY.inn}
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Блок реквизитов исполнителя (самозанятого). */
export function Requisites() {
  const rows: { label: string; value: string; href?: string }[] = [
    { label: "Исполнитель", value: `Самозанятый ${COMPANY.legalName}` },
    { label: "Статус", value: COMPANY.status },
    { label: "ИНН", value: COMPANY.inn },
    { label: "E-mail", value: COMPANY.email, href: `mailto:${COMPANY.email}` },
    { label: "Телефон", value: COMPANY.phone, href: `tel:${COMPANY.phoneHref}` },
    { label: "Сайт", value: COMPANY.domain, href: COMPANY.url },
  ];
  return (
    <div className="rounded-2xl bg-[#f0f0f0] p-5 sm:p-6">
      <dl className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col sm:flex-row sm:gap-4">
            <dt className="w-40 shrink-0 text-sm font-bold text-gray-400">
              {r.label}
            </dt>
            <dd className="font-bold text-gray-800">
              {r.href ? (
                <a href={r.href} className="text-[#3c6e71] hover:underline">
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
  );
}

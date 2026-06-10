import Link from "next/link";
import { QrCode, ShoppingBag, Bell, Smartphone, ArrowRight, Zap } from "lucide-react";
import { COMPANY } from "@/lib/legal";

const footerLinks = [
  { href: "/pricing", label: "ТАРИФЫ" },
  { href: "/offer", label: "ОФЕРТА" },
  { href: "/privacy", label: "КОНФИДЕНЦИАЛЬНОСТЬ" },
  { href: "/contacts", label: "КОНТАКТЫ" },
];

const features = [
  { icon: QrCode, title: "QR-код для столика", desc: "Гость сканирует — сразу видит ваше меню. Без приложений и загрузок." },
  { icon: ShoppingBag, title: "Заказ в 2 клика", desc: "Корзина, выбор варианта, комментарий — и заказ уже у вас." },
  { icon: Bell, title: "Уведомления в реалтайме", desc: "Новый заказ появляется мгновенно со звуковым сигналом." },
  { icon: Smartphone, title: "Работает везде", desc: "Мобильный дизайн. Гостю не нужно ничего устанавливать." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Hero */}
      <section className="relative border-b border-[#e8e8e8]">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-10 pt-24 pb-28 sm:pt-32 sm:pb-36">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[#d9d9d9] px-5 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#3c6e71] mb-10">
            <Zap className="h-4 w-4" />
            Попробуйте 7 дней за 1₽
          </div>

          <h1 className="text-4xl sm:text-[52px] font-extrabold uppercase tracking-[0.12em] leading-[1.1] text-[#1a1a1a]">
            Цифровое меню
            <br />
            <span className="text-[#3c6e71]">для вашего заведения</span>
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-[#7a7a7a] max-w-xl leading-relaxed">
            Создайте меню за 10 минут, распечатайте QR-код — и принимайте заказы
            прямо на ваш экран.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="inline-flex h-14 items-center justify-center rounded-sm bg-[#3c6e71] px-10 text-sm font-semibold uppercase tracking-[0.04em] text-white transition-all hover:bg-[#325d5f] active:opacity-85"
            >
              Начать бесплатно
              <ArrowRight className="ml-3 h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center rounded-sm border border-[#d9d9d9] px-10 text-sm font-semibold uppercase tracking-[0.04em] text-[#353535] transition-all hover:border-[#c4c4c4]"
            >
              Войти
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1120px] px-5 sm:px-10 py-24">
        <div className="mb-16">
          <h2 className="text-2xl sm:text-[32px] font-bold uppercase tracking-[0.12em] text-[#1a1a1a]">Всё что нужно для общепита</h2>
          <p className="mt-4 text-[#7a7a7a] text-base max-w-md">
            Зарегистрируйтесь, добавьте меню — гости уже могут заказывать.
          </p>
        </div>
        <div className="grid gap-px sm:grid-cols-2 bg-[#d9d9d9] border border-[#d9d9d9]">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white p-8 transition-all hover:bg-[#f7f7f7]"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-sm bg-[#eef6f6] text-[#3c6e71]">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1a1a1a] mb-2">{f.title}</h3>
              <p className="text-sm text-[#7a7a7a] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1120px] px-5 sm:px-10 pb-24">
        <div className="bg-[#1a1a1a] p-12 sm:p-20 text-white">
          <h2 className="text-2xl sm:text-[32px] font-bold uppercase tracking-[0.12em]">Готовы попробовать?</h2>
          <p className="mt-4 text-[#a0a0a0] text-base max-w-sm">
            Регистрация за 30 секунд. Начните принимать заказы уже сегодня.
          </p>
          <Link
            href="/register"
            className="mt-10 inline-flex h-14 items-center justify-center rounded-sm bg-[#3c6e71] px-10 text-sm font-semibold uppercase tracking-[0.04em] text-white transition-all hover:bg-[#4f8e91] active:opacity-85"
          >
            Создать меню
            <ArrowRight className="ml-3 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e8e8e8] py-10">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-10">
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            {footerLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs font-bold uppercase tracking-[0.08em] text-[#a0a0a0] transition-colors hover:text-[#3c6e71]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="text-center text-xs text-[#c4c4c4]">
              © {new Date().getFullYear()} {COMPANY.brand} · {COMPANY.legalName} · ИНН {COMPANY.inn}
            </span>
            <Link href="/superadmin" className="text-[10px] text-[#d9d9d9] transition-colors hover:text-[#a0a0a0]">
              SA
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

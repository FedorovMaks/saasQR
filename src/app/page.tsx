import Link from "next/link";
import { QrCode, ShoppingBag, Bell, Smartphone, ArrowRight, Zap } from "lucide-react";
import { COMPANY } from "@/lib/legal";

const footerLinks = [
  { href: "/pricing", label: "Тарифы" },
  { href: "/offer", label: "Оферта" },
  { href: "/privacy", label: "Конфиденциальность" },
  { href: "/contacts", label: "Контакты" },
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
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eef2ff] via-white to-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-blue-500/[0.05] blur-[120px]" />

        <div className="relative mx-auto max-w-3xl px-6 pt-24 pb-28 sm:pt-32 sm:pb-36 text-center">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-blue-500/10 px-6 py-2.5 text-base font-extrabold text-[#2563eb] mb-10">
            <Zap className="h-5 w-5" />
            Попробуйте 7 дней за 1₽
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.05]">
            Цифровое меню
            <br />
            <span className="text-[#2563eb]">для вашего заведения</span>
          </h1>

          <p className="mt-8 text-xl sm:text-2xl text-gray-400 max-w-xl mx-auto leading-relaxed font-semibold">
            Создайте меню за 10 минут, распечатайте QR-код — и принимайте заказы
            прямо на ваш экран.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex h-16 items-center justify-center rounded-2xl bg-[#2563eb] px-12 text-xl font-extrabold text-white shadow-xl shadow-blue-500/25 transition-all hover:shadow-2xl hover:shadow-blue-500/35 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98]"
            >
              Начать бесплатно
              <ArrowRight className="ml-3 h-6 w-6" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-16 items-center justify-center rounded-2xl bg-white border-2 border-gray-200 px-12 text-xl font-extrabold text-gray-700 shadow-sm transition-all hover:border-blue-200 hover:text-[#2563eb] hover:-translate-y-1 active:translate-y-0"
            >
              Войти
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black">Всё что нужно для общепита</h2>
          <p className="mt-5 text-gray-400 text-xl font-semibold max-w-md mx-auto">
            Зарегистрируйтесь, добавьте меню — гости уже могут заказывать.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl bg-[#f0f2f8] p-8 transition-all hover:bg-white hover:shadow-[0_8px_40px_rgba(37,99,235,0.08)] hover:-translate-y-1"
            >
              <div className="mb-5 inline-flex rounded-2xl bg-blue-500/10 p-4 text-[#2563eb] group-hover:bg-[#2563eb] group-hover:text-white transition-all">
                <f.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black mb-2">{f.title}</h3>
              <p className="text-base text-gray-400 leading-relaxed font-semibold">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="rounded-3xl bg-[#2563eb] p-12 sm:p-20 text-center text-white shadow-2xl shadow-blue-500/25">
          <h2 className="text-4xl sm:text-5xl font-black">Готовы попробовать?</h2>
          <p className="mt-5 text-blue-100 text-xl font-semibold max-w-sm mx-auto">
            Регистрация за 30 секунд. Начните принимать заказы уже сегодня.
          </p>
          <Link
            href="/register"
            className="mt-12 inline-flex h-16 items-center justify-center rounded-2xl bg-white px-12 text-xl font-extrabold text-[#2563eb] shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
          >
            Создать меню
            <ArrowRight className="ml-3 h-6 w-6" />
          </Link>
        </div>
      </section>
      {/* Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="mx-auto max-w-4xl px-6">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {footerLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-bold text-gray-400 transition-colors hover:text-[#2563eb]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="text-center text-xs font-medium text-gray-300">
              © {new Date().getFullYear()} {COMPANY.brand} · {COMPANY.legalName} · ИНН {COMPANY.inn}
            </span>
            <Link href="/superadmin" className="text-[10px] text-gray-200 transition-colors hover:text-gray-400">
              SA
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

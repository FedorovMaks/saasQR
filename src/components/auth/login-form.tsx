"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff, Mail } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    setLoginEmail(email);

    try {
      // Check email verification before attempting login
      const checkRes = await fetch("/api/auth/check-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();
      if (!checkData.verified) {
        setNeedsVerification(true);
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Неверный email или пароль");
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail }),
      });
      setResendDone(true);
    } catch { /* ignore */ }
    setResendLoading(false);
  }

  return (
    <div className="rounded-3xl bg-white p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black">Войти в QRMenu</h1>
        <p className="text-base text-gray-400 mt-3 font-semibold">
          Введите email и пароль для доступа к панели управления
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {needsVerification && (
          <div className="rounded-2xl bg-amber-50 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm font-bold text-amber-800">
                Подтвердите вашу почту перед входом
              </p>
            </div>
            <p className="text-xs text-amber-700">
              Мы отправили письмо на <strong>{loginEmail}</strong>. Проверьте папку &laquo;Спам&raquo;.
            </p>
            {resendDone ? (
              <p className="text-xs font-bold text-green-600">Письмо отправлено повторно!</p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-xs font-bold text-[#2563eb] hover:underline disabled:opacity-50"
              >
                {resendLoading ? "Отправляем..." : "Отправить письмо повторно"}
              </button>
            )}
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 p-4 text-base font-bold text-red-600">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="text-base font-bold text-gray-500 mb-2 block">Email</label>
          <input
            id="email" name="email" type="email"
            placeholder="mail@example.com" required disabled={loading}
            className="w-full h-14 rounded-2xl border-0 bg-[#f0f2f8] px-5 text-base font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-base font-bold text-gray-500 mb-2 block">Пароль</label>
          <div className="relative">
            <input
              id="password" name="password" type={showPassword ? "text" : "password"}
              placeholder="Ваш пароль" required disabled={loading}
              className="w-full h-14 rounded-2xl border-0 bg-[#f0f2f8] px-5 pr-14 text-base font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full h-14 rounded-2xl bg-[#2563eb] text-white font-extrabold text-lg shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? "Вход..." : "Войти"}
        </button>

        <p className="text-center text-base text-gray-400 font-semibold">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-extrabold text-[#2563eb] hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </div>
  );
}

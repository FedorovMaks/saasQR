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
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        try {
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
        } catch { /* ignore */ }
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
    <div className="border border-[#d9d9d9] bg-white p-10">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-extrabold uppercase tracking-[0.12em] text-[#1a1a1a]">Войти</h1>
        <p className="text-sm text-[#7a7a7a] mt-3">
          Введите email и пароль для доступа к панели управления
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {needsVerification && (
          <div className="border border-[#d4a83a] bg-[#fef8ec] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[#9a7209] shrink-0" />
              <p className="text-sm font-bold text-[#9a7209]">
                Подтвердите вашу почту перед входом
              </p>
            </div>
            <p className="text-xs text-[#9a7209]">
              Мы отправили письмо на <strong>{loginEmail}</strong>. Проверьте папку &laquo;Спам&raquo;.
            </p>
            {resendDone ? (
              <p className="text-xs font-bold text-[#256841]">Письмо отправлено повторно!</p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-xs font-bold text-[#3c6e71] hover:underline disabled:opacity-50"
              >
                {resendLoading ? "Отправляем..." : "Отправить письмо повторно"}
              </button>
            )}
          </div>
        )}
        {error && (
          <div className="border border-[#a82828] bg-[#fdf0f0] p-4 text-sm font-bold text-[#a82828]">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="text-xs font-bold uppercase tracking-[0.08em] text-[#7a7a7a] mb-2 block">Email</label>
          <input
            id="email" name="email" type="email"
            placeholder="mail@example.com" required disabled={loading}
            className="w-full h-12 border-b border-[#d9d9d9] bg-transparent px-0 text-sm text-[#1a1a1a] placeholder:text-[#c4c4c4] focus:outline-none focus:border-[#3c6e71] transition-colors disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-xs font-bold uppercase tracking-[0.08em] text-[#7a7a7a] mb-2 block">Пароль</label>
          <div className="relative">
            <input
              id="password" name="password" type={showPassword ? "text" : "password"}
              placeholder="Ваш пароль" required disabled={loading}
              className="w-full h-12 border-b border-[#d9d9d9] bg-transparent px-0 pr-10 text-sm text-[#1a1a1a] placeholder:text-[#c4c4c4] focus:outline-none focus:border-[#3c6e71] transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-[#353535] transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full h-12 rounded-sm bg-[#3c6e71] text-white text-sm font-semibold uppercase tracking-[0.04em] transition-all hover:bg-[#325d5f] active:opacity-85 disabled:opacity-50"
        >
          {loading ? "Вход..." : "Войти"}
        </button>

        <p className="text-center text-sm text-[#7a7a7a]">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-bold text-[#3c6e71] hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </div>
  );
}

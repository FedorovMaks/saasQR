"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Mail } from "lucide-react";

export function RegisterForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        setLoading(false);
        return;
      }
      if (data.needsVerification) {
        setRegisteredEmail(email);
        setEmailSent(true);
      }
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="border border-[#d9d9d9] bg-white p-10 text-center">
        <Mail className="h-12 w-12 text-[#3c6e71] mx-auto mb-4" />
        <h1 className="text-xl font-extrabold uppercase tracking-[0.12em] text-[#1a1a1a] mb-3">Проверьте почту</h1>
        <p className="text-sm text-[#7a7a7a] mb-2">
          Мы отправили письмо с подтверждением на
        </p>
        <p className="text-base font-bold text-[#1a1a1a] mb-6">{registeredEmail}</p>
        <p className="text-sm text-[#a0a0a0] mb-6">
          Нажмите на ссылку в письме, чтобы подтвердить email и войти в аккаунт.
          Если письма нет — проверьте папку &laquo;Спам&raquo;.
        </p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-sm border border-[#d9d9d9] px-6 text-sm font-semibold uppercase tracking-[0.04em] text-[#353535] hover:border-[#c4c4c4] transition-all"
        >
          На страницу входа
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-[#d9d9d9] bg-white p-10">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-extrabold uppercase tracking-[0.12em] text-[#1a1a1a]">Создать аккаунт</h1>
        <p className="text-sm text-[#7a7a7a] mt-3">
          Зарегистрируйтесь, чтобы создать ваше цифровое меню
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div className="border border-[#a82828] bg-[#fdf0f0] p-4 text-sm font-bold text-[#a82828]">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="text-xs font-bold uppercase tracking-[0.08em] text-[#7a7a7a] mb-2 block">Имя</label>
          <input
            id="name" name="name" type="text"
            placeholder="Ваше имя" required minLength={2} disabled={loading}
            className="w-full h-12 border-b border-[#d9d9d9] bg-transparent px-0 text-sm text-[#1a1a1a] placeholder:text-[#c4c4c4] focus:outline-none focus:border-[#3c6e71] transition-colors disabled:opacity-50"
          />
        </div>

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
              placeholder="Минимум 6 символов" required minLength={6} disabled={loading}
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
          {loading ? "Регистрация..." : "Зарегистрироваться"}
        </button>

        <p className="text-center text-sm text-[#7a7a7a]">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-bold text-[#3c6e71] hover:underline">Войти</Link>
        </p>
      </form>
    </div>
  );
}

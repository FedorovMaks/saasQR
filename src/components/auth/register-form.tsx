"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Регистрация успешна, но не удалось войти автоматически");
        router.push("/login");
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

  return (
    <div className="rounded-3xl bg-white p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black">Создать аккаунт</h1>
        <p className="text-base text-gray-400 mt-3 font-semibold">
          Зарегистрируйтесь, чтобы создать ваше цифровое меню
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {error && (
          <div className="rounded-2xl bg-red-50 p-4 text-base font-bold text-red-600">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="text-base font-bold text-gray-500 mb-2 block">Имя</label>
          <input
            id="name" name="name" type="text"
            placeholder="Ваше имя" required minLength={2} disabled={loading}
            className="w-full h-14 rounded-2xl border-0 bg-[#f0f2f8] px-5 text-base font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all disabled:opacity-50"
          />
        </div>

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
              placeholder="Минимум 6 символов" required minLength={6} disabled={loading}
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
          {loading ? "Регистрация..." : "Зарегистрироваться"}
        </button>

        <p className="text-center text-base text-gray-400 font-semibold">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-extrabold text-[#2563eb] hover:underline">Войти</Link>
        </p>
      </form>
    </div>
  );
}

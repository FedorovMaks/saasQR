"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

export function JoinForm({
  token,
  venueName,
}: {
  token: string;
  venueName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/staff/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Готово!</h1>
            <p className="text-gray-400 font-semibold mt-2">
              Вы добавлены как официант в <strong className="text-gray-700">{venueName}</strong>
            </p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full h-14 rounded-2xl bg-[#3c6e71] text-white font-extrabold text-lg shadow-lg shadow-none transition-all hover:shadow-xl active:scale-[0.97]"
          >
            Войти в систему
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-[#3c6e71] flex items-center justify-center shadow-lg shadow-none mb-4">
            <Store className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black">Присоединиться</h1>
          <p className="text-gray-400 font-semibold mt-1">
            Вас приглашают как официанта в
          </p>
          <p className="text-lg font-black mt-1">{venueName}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-500 mb-1.5 block">
              Имя и фамилия
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              required
              minLength={2}
              disabled={loading}
              className="w-full h-14 rounded-2xl border-0 bg-white px-5 text-base font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-500 mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ivan@example.com"
              required
              disabled={loading}
              className="w-full h-14 rounded-2xl border-0 bg-white px-5 text-base font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-500 mb-1.5 block">
              Пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                required
                minLength={6}
                disabled={loading}
                className="w-full h-14 rounded-2xl border-0 bg-white px-5 pr-14 text-base font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all disabled:opacity-50"
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

          {error && (
            <p className="text-sm text-red-500 font-semibold text-center bg-red-50 rounded-2xl py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-[#3c6e71] text-white font-extrabold text-lg shadow-lg shadow-none transition-all hover:shadow-xl active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Регистрация...</>
            ) : (
              "Зарегистрироваться"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

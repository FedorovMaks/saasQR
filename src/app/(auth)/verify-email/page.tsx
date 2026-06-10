"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Недействительная ссылка");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMsg(data.error || "Ошибка подтверждения");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Ошибка соединения с сервером");
      });
  }, [token]);

  return (
    <div className="rounded-3xl bg-white p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-center">
      {status === "loading" && (
        <div className="space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <h1 className="text-2xl font-black">Подтверждаем вашу почту...</h1>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-black">Email подтверждён!</h1>
          <p className="text-gray-400 font-semibold">
            Теперь вы можете войти в свой аккаунт.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-14 items-center justify-center rounded-2xl bg-[#3c6e71] px-10 text-lg font-extrabold text-white shadow-lg shadow-none transition-all hover:shadow-xl active:scale-[0.98]"
          >
            Войти
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-black">Ошибка</h1>
          <p className="text-gray-400 font-semibold">{errorMsg}</p>
          <div className="flex flex-col gap-3 mt-6">
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-[#3c6e71] px-10 text-lg font-extrabold text-white shadow-lg shadow-none transition-all hover:shadow-xl active:scale-[0.98]"
            >
              На страницу входа
            </Link>
            <Link
              href="/register"
              className="text-sm font-bold text-gray-400 hover:text-[#3c6e71] transition-colors"
            >
              Зарегистрироваться заново
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl bg-white p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <h1 className="text-2xl font-black mt-4">Загрузка...</h1>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

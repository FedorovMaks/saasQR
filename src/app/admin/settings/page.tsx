"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  User,
  Lock,
  Mail,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
} from "lucide-react";

type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
};

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563eb]/10 text-[#2563eb]">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-12 rounded-2xl border-0 bg-[#f0f2f8] px-4 pr-12 text-sm font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Name
  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Email
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Delete
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/settings")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setName(data.name || "");
      })
      .catch(() => toast.error("Не удалось загрузить профиль"))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    setNameLoading(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_name", name }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setProfile((p) => (p ? { ...p, name } : p));
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Ошибка соединения");
    }
    setNameLoading(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Ошибка соединения");
    }
    setPasswordLoading(false);
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_email",
          newEmail,
          password: emailPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        if (data.requiresRelogin) {
          setTimeout(() => signOut({ callbackUrl: "/login" }), 2000);
        }
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Ошибка соединения");
    }
    setEmailLoading(false);
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Аккаунт удалён");
        setTimeout(() => signOut({ callbackUrl: "/" }), 1500);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Ошибка соединения");
    }
    setDeleteLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black">Настройки</h1>
        <p className="text-gray-400 font-semibold mt-1">
          Управление вашим аккаунтом
        </p>
      </div>

      {/* Name */}
      <SectionCard icon={User} title="Имя">
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="text-sm font-bold text-gray-500 mb-1.5 block"
            >
              Отображаемое имя
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              disabled={nameLoading}
              className="w-full h-12 rounded-2xl border-0 bg-[#f0f2f8] px-4 text-sm font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={nameLoading || !name.trim() || name === profile?.name}
            className="h-10 px-6 rounded-xl bg-[#2563eb] text-sm font-extrabold text-white transition-all hover:shadow-lg active:scale-[0.97] disabled:opacity-50 disabled:shadow-none"
          >
            {nameLoading ? "Сохранение..." : "Сохранить"}
          </button>
        </form>
      </SectionCard>

      {/* Password */}
      <SectionCard icon={Lock} title="Пароль">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label
              htmlFor="currentPassword"
              className="text-sm font-bold text-gray-500 mb-1.5 block"
            >
              Текущий пароль
            </label>
            <PasswordInput
              id="currentPassword"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Введите текущий пароль"
              disabled={passwordLoading}
            />
          </div>
          <div>
            <label
              htmlFor="newPassword"
              className="text-sm font-bold text-gray-500 mb-1.5 block"
            >
              Новый пароль
            </label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Минимум 6 символов"
              disabled={passwordLoading}
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="text-sm font-bold text-gray-500 mb-1.5 block"
            >
              Подтвердите новый пароль
            </label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Повторите новый пароль"
              disabled={passwordLoading}
            />
          </div>
          <button
            type="submit"
            disabled={
              passwordLoading ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
            className="h-10 px-6 rounded-xl bg-[#2563eb] text-sm font-extrabold text-white transition-all hover:shadow-lg active:scale-[0.97] disabled:opacity-50 disabled:shadow-none"
          >
            {passwordLoading ? "Сохранение..." : "Изменить пароль"}
          </button>
        </form>
      </SectionCard>

      {/* Email */}
      <SectionCard icon={Mail} title="Email">
        <div className="mb-4">
          <p className="text-sm text-gray-400">
            Текущий email:{" "}
            <span className="font-bold text-gray-700">{profile?.email}</span>
          </p>
        </div>
        <form onSubmit={handleChangeEmail} className="space-y-4">
          <div>
            <label
              htmlFor="newEmail"
              className="text-sm font-bold text-gray-500 mb-1.5 block"
            >
              Новый email
            </label>
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="новый@email.com"
              disabled={emailLoading}
              className="w-full h-12 rounded-2xl border-0 bg-[#f0f2f8] px-4 text-sm font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
            />
          </div>
          <div>
            <label
              htmlFor="emailPassword"
              className="text-sm font-bold text-gray-500 mb-1.5 block"
            >
              Пароль для подтверждения
            </label>
            <PasswordInput
              id="emailPassword"
              value={emailPassword}
              onChange={setEmailPassword}
              placeholder="Введите текущий пароль"
              disabled={emailLoading}
            />
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 font-semibold">
            После смены email потребуется повторная авторизация и подтверждение
            новой почты.
          </div>
          <button
            type="submit"
            disabled={emailLoading || !newEmail || !emailPassword}
            className="h-10 px-6 rounded-xl bg-[#2563eb] text-sm font-extrabold text-white transition-all hover:shadow-lg active:scale-[0.97] disabled:opacity-50 disabled:shadow-none"
          >
            {emailLoading ? "Сохранение..." : "Изменить email"}
          </button>
        </form>
      </SectionCard>

      {/* Delete account */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-red-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <Trash2 className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-black text-red-600">Удаление аккаунта</h2>
        </div>

        {!deleteConfirm ? (
          <div>
            <p className="text-sm text-gray-400 font-semibold mb-4">
              При удалении аккаунта все ваши заведения, меню и данные будут
              безвозвратно удалены.
            </p>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="h-10 px-6 rounded-xl bg-red-50 text-sm font-extrabold text-red-600 hover:bg-red-100 transition-all"
            >
              Удалить аккаунт
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">
                  Это действие необратимо
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Все заведения, меню, заказы и данные сотрудников будут удалены
                  навсегда.
                </p>
              </div>
            </div>
            <div>
              <label
                htmlFor="deletePassword"
                className="text-sm font-bold text-gray-500 mb-1.5 block"
              >
                Введите пароль для подтверждения
              </label>
              <PasswordInput
                id="deletePassword"
                value={deletePassword}
                onChange={setDeletePassword}
                placeholder="Ваш пароль"
                disabled={deleteLoading}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || !deletePassword}
                className="h-10 px-6 rounded-xl bg-red-600 text-sm font-extrabold text-white hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Удалить навсегда
              </button>
              <button
                onClick={() => {
                  setDeleteConfirm(false);
                  setDeletePassword("");
                }}
                disabled={deleteLoading}
                className="h-10 px-6 rounded-xl bg-[#f0f2f8] text-sm font-extrabold text-gray-600 hover:bg-gray-200 transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account info */}
      {profile?.createdAt && (
        <p className="text-xs text-gray-300 font-medium text-center pb-4">
          Аккаунт создан{" "}
          {new Date(profile.createdAt).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

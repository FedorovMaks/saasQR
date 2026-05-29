"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Store,
  Search,
  Crown,
  ChevronRight,
  ArrowLeft,
  X,
  Shield,
  Loader2,
  Ban,
  Trash2,
  AlertTriangle,
} from "lucide-react";

type Stats = {
  totalUsers: number;
  totalVenues: number;
  plans: Record<string, number>;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  planExpiresAt: string | null;
  trialEndsAt: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
  _count: { venues: number; staffRoles: number };
};

type UserDetail = {
  user: UserRow & {
    updatedAt: string;
    venues: {
      id: string;
      name: string;
      slug: string;
      isActive: boolean;
      createdAt: string;
      _count: { categories: number; tables: number; staff: number };
    }[];
    staffRoles: {
      id: string;
      role: string;
      isActive: boolean;
      venue: { id: string; name: string };
    }[];
  };
};

const PLAN_COLORS: Record<string, string> = {
  BASIC: "bg-gray-700 text-gray-300",
  BUSINESS: "bg-blue-900 text-blue-300",
  PRO: "bg-purple-900 text-purple-300",
};

const PLAN_LABELS: Record<string, string> = {
  BASIC: "Basic",
  BUSINESS: "Business",
  PRO: "Pro",
};

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-gray-800 flex items-center justify-center">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
        <span className="text-sm font-bold text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export function SuperAdminDashboard({ stats }: { stats: Stats }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (planFilter !== "ALL") params.set("plan", planFilter);
      const res = await fetch(`/api/superadmin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, planFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeout);
  }, [fetchUsers]);

  async function openUserDetail(userId: string) {
    setDetailLoading(true);
    setDeleteConfirm(false);
    try {
      const res = await fetch(`/api/superadmin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
      }
    } catch { /* ignore */ }
    setDetailLoading(false);
  }

  async function deleteUser(userId: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/superadmin/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedUser(null);
        setDeleteConfirm(false);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка удаления");
      }
    } catch {
      alert("Ошибка соединения");
    }
    setDeleting(false);
  }

  async function updateUserPlan(userId: string, plan: string) {
    setUpdatingPlan(true);
    try {
      const res = await fetch(`/api/superadmin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        // Refresh detail
        await openUserDetail(userId);
        fetchUsers();
      }
    } catch { /* ignore */ }
    setUpdatingPlan(false);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("ru-RU", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  // Detail view
  if (selectedUser) {
    const u = selectedUser.user;
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedUser(null)}
          className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к списку
        </button>

        {/* User header */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black">{u.name || "Без имени"}</h2>
                {u.isSuperAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-red-900/50 px-2 py-0.5 text-xs font-bold text-red-400">
                    <Shield className="h-3 w-3" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-gray-400 font-medium mt-1">{u.email}</p>
              <p className="text-xs text-gray-500 mt-2">
                Зарегистрирован: {formatDate(u.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex rounded-lg px-3 py-1 text-sm font-bold ${PLAN_COLORS[u.plan]}`}>
                {PLAN_LABELS[u.plan]}
              </span>
              {u.planExpiresAt && (
                <p className="text-xs text-gray-500 mt-1">
                  до {formatDate(u.planExpiresAt)}
                </p>
              )}
            </div>
          </div>

          {/* Plan switcher */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs font-bold text-gray-500 mb-2">Переключить тариф:</p>
            <div className="flex gap-2 flex-wrap">
              {["BASIC", "BUSINESS", "PRO"].map((p) => (
                <button
                  key={p}
                  onClick={() => updateUserPlan(u.id, p)}
                  disabled={updatingPlan || u.plan === p}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    u.plan === p
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                  } disabled:opacity-50`}
                >
                  {PLAN_LABELS[p]}
                </button>
              ))}
              {u.plan !== "BASIC" && (
                <button
                  onClick={() => updateUserPlan(u.id, "BASIC")}
                  disabled={updatingPlan}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-red-900/50 text-red-400 hover:bg-red-900 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Отменить подписку
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Store} label="Заведения" value={u.venues.length} />
          <StatCard icon={Users} label="Сотрудники" value={u.venues.reduce((sum, v) => sum + v._count.staff, 0)} />
        </div>

        {/* Venues */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
          <h3 className="text-sm font-bold text-gray-400 mb-3">Заведения ({u.venues.length})</h3>
          {u.venues.length === 0 ? (
            <p className="text-gray-500 text-sm">Нет заведений</p>
          ) : (
            <div className="space-y-2">
              {u.venues.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3">
                  <div>
                    <p className="font-bold text-sm">{v.name}</p>
                    <p className="text-xs text-gray-500">/{v.slug} · {formatDate(v.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{v._count.categories} кат.</span>
                    <span>{v._count.tables} стол.</span>
                    <span>{v._count.staff} сотр.</span>
                    {!v.isActive && (
                      <span className="text-red-400 font-bold">Удалено</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff roles */}
        {u.staffRoles.length > 0 && (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
            <h3 className="text-sm font-bold text-gray-400 mb-3">Роли сотрудника</h3>
            <div className="space-y-2">
              {u.staffRoles.map((sr) => (
                <div key={sr.id} className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-2.5 text-sm">
                  <span>{sr.venue.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{sr.role}</span>
                    <span className={sr.isActive ? "text-green-400" : "text-red-400"}>
                      {sr.isActive ? "Активен" : "Неактивен"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete user */}
        {!u.isSuperAdmin && (
          <div className="rounded-2xl bg-gray-900 border border-red-900/50 p-5">
            <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Удаление пользователя
            </h3>
            {!deleteConfirm ? (
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  Все заведения, меню, заказы и данные пользователя будут удалены безвозвратно.
                </p>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-red-900/30 text-red-400 hover:bg-red-900/60 transition-all"
                >
                  Удалить пользователя
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl bg-red-900/30 p-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-300">Это действие необратимо</p>
                    <p className="text-xs text-red-400/70 mt-1">
                      Пользователь <strong>{u.email}</strong> и все его данные будут удалены навсегда.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteUser(u.id)}
                    disabled={deleting}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Удалить навсегда
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-gray-800 text-gray-400 hover:bg-gray-700 transition-all"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Main list view
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Панель управления</h1>
        <p className="text-gray-500 font-medium mt-1">Все пользователи и статистика платформы</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Users} label="Пользователи" value={stats.totalUsers} />
        <StatCard icon={Store} label="Заведения" value={stats.totalVenues} />
        <StatCard
          icon={Crown}
          label="Подписки"
          value={`${(stats.plans.BUSINESS || 0) + (stats.plans.PRO || 0)}`}
          sub={`${stats.plans.BUSINESS || 0} Business · ${stats.plans.PRO || 0} Pro`}
        />
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по email или имени..."
            className="w-full h-10 rounded-xl bg-gray-900 border border-gray-800 pl-10 pr-4 text-sm font-medium text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-600"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {["ALL", "BASIC", "BUSINESS", "PRO"].map((p) => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                planFilter === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600"
              }`}
            >
              {p === "ALL" ? "Все" : PLAN_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Users list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-12 text-center">
          <p className="text-gray-500 font-medium">Пользователи не найдены</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_120px_80px_80px_40px] gap-4 px-5 py-3 border-b border-gray-800 text-xs font-bold text-gray-500">
            <span>Пользователь</span>
            <span>Тариф</span>
            <span>Заведения</span>
            <span>Дата</span>
            <span></span>
          </div>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => openUserDetail(u.id)}
              className="w-full grid grid-cols-1 sm:grid-cols-[1fr_120px_80px_80px_40px] gap-1 sm:gap-4 px-5 py-3.5 border-b border-gray-800/50 text-left hover:bg-gray-800/30 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm truncate">{u.name || "Без имени"}</p>
                  {u.isSuperAdmin && (
                    <Shield className="h-3 w-3 text-red-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              <div className="flex items-center">
                <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${PLAN_COLORS[u.plan]}`}>
                  {PLAN_LABELS[u.plan]}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-400">
                {u._count.venues}
              </div>
              <div className="flex items-center text-xs text-gray-500">
                {formatDate(u.createdAt)}
              </div>
              <div className="flex items-center justify-end">
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </div>
            </button>
          ))}
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}

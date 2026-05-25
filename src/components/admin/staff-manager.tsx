"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserPlus,
  Link2,
  Copy,
  Check,
  Trash2,
  Loader2,
  Users,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

type StaffMember = {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

export function StaffManager({ venueId }: { venueId: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [generatedPasswords, setGeneratedPasswords] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch(`/api/venues/${venueId}/staff`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  async function createInvite() {
    setCreating(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/staff/invite`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        const url = `${window.location.origin}/join/${data.token}`;
        setInviteUrl(url);
        toast.success("Ссылка-приглашение создана");
      } else {
        toast.error("Ошибка создания ссылки");
      }
    } catch {
      toast.error("Ошибка соединения");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Ссылка скопирована");
    setTimeout(() => setCopied(false), 2000);
  }

  async function removeStaff(staffId: string) {
    if (!confirm("Удалить этого сотрудника?")) return;
    setRemoving(staffId);
    try {
      const res = await fetch(`/api/venues/${venueId}/staff`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      if (res.ok) {
        setStaff((prev) => prev.filter((s) => s.id !== staffId));
        toast.success("Сотрудник удалён");
      }
    } catch {
      toast.error("Ошибка");
    } finally {
      setRemoving(null);
    }
  }

  async function resetPassword(staffId: string) {
    if (!confirm("Сбросить пароль сотруднику? Старый пароль перестанет работать.")) return;
    setResetting(staffId);
    try {
      const res = await fetch(`/api/venues/${venueId}/staff/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedPasswords((prev) => ({ ...prev, [staffId]: data.password }));
        setVisiblePasswords((prev) => new Set(prev).add(staffId));
        toast.success("Пароль сброшен");
      } else {
        const data = await res.json();
        toast.error(data.error || "Ошибка сброса");
      }
    } catch {
      toast.error("Ошибка соединения");
    } finally {
      setResetting(null);
    }
  }

  function togglePasswordVisibility(staffId: string) {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  }

  async function copyPassword(staffId: string) {
    const pw = generatedPasswords[staffId];
    if (!pw) return;
    await navigator.clipboard.writeText(pw);
    toast.success("Пароль скопирован");
  }

  return (
    <div className="space-y-6">
      {/* Invite button */}
      <button
        onClick={createInvite}
        disabled={creating}
        className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-[#2563eb] text-white font-extrabold text-base shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl active:scale-[0.97] disabled:opacity-50"
      >
        {creating ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <UserPlus className="h-5 w-5" />
        )}
        Пригласить сотрудника
      </button>

      {/* Invite link */}
      {inviteUrl && (
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
            Ссылка-приглашение (7 дней)
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-xl bg-[#f0f2f8] px-4 py-3 min-w-0">
              <Link2 className="h-4 w-4 text-[#2563eb] shrink-0" />
              <p className="text-sm text-gray-600 font-medium truncate">
                {inviteUrl}
              </p>
            </div>
            <button
              onClick={copyLink}
              className="shrink-0 h-12 w-12 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center shadow-md shadow-blue-500/15 transition-all hover:shadow-lg active:scale-95"
            >
              {copied ? (
                <Check className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Staff list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#2563eb]" />
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-[#f0f2f8] flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-black text-gray-700">Нет сотрудников</h3>
          <p className="text-sm text-gray-400 font-semibold mt-1">
            Нажмите «Пригласить» и отправьте ссылку официанту
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Сотрудники · {staff.length}
          </p>
          {staff.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-full bg-[#2563eb]/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-[#2563eb]">
                      {(s.user.name || s.user.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-base">
                      {s.user.name || "Без имени"}
                    </p>
                    <p className="text-sm text-gray-400 font-medium">
                      {s.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resetPassword(s.id)}
                    disabled={resetting === s.id}
                    className="h-10 w-10 rounded-xl bg-[#f0f2f8] flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-[#2563eb] transition-colors"
                    title="Сбросить пароль"
                  >
                    {resetting === s.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => removeStaff(s.id)}
                    disabled={removing === s.id}
                    className="h-10 w-10 rounded-xl bg-[#f0f2f8] flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Удалить сотрудника"
                  >
                    {removing === s.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Generated password display */}
              {generatedPasswords[s.id] && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
                  <KeyRound className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm font-bold text-green-700">Новый пароль:</span>
                  <code className="text-sm font-black text-green-800 tracking-wider">
                    {visiblePasswords.has(s.id)
                      ? generatedPasswords[s.id]
                      : "••••••••"}
                  </code>
                  <button
                    onClick={() => togglePasswordVisibility(s.id)}
                    className="text-green-600 hover:text-green-800 transition-colors"
                  >
                    {visiblePasswords.has(s.id) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => copyPassword(s.id)}
                    className="text-green-600 hover:text-green-800 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

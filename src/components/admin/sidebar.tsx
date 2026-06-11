"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Store,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  ClipboardList,
  Download,
  Bell,
  BellOff,
  BellRing,
  Shield,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { usePushNotifications } from "@/hooks/use-push";

const ownerNavItems = [
  { href: "/admin", label: "Заведения", icon: Store },
  { href: "/admin/billing", label: "Тарифы", icon: CreditCard },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isWaiter = session?.user?.role === "waiter";
  const staffVenueIds = session?.user?.staffVenueIds || [];

  const isSuperAdmin = session?.user?.isSuperAdmin === true;

  const navItems = isWaiter
    ? staffVenueIds.map((venueId) => ({
        href: `/admin/venues/${venueId}/orders`,
        label: "Заказы",
        icon: ClipboardList,
      }))
    : [
        ...ownerNavItems,
        ...(isSuperAdmin
          ? [{ href: "/superadmin", label: "Super Admin", icon: Shield }]
          : []),
      ];

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin" || pathname.startsWith("/admin/venues")
            : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-sm px-4 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-[#eef6f6] text-[#3c6e71] font-semibold"
                : "text-[#7a7a7a] hover:bg-[#f7f7f7] hover:text-[#353535]"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  }

  return (
    <button
      onClick={handleInstall}
      className="w-full flex items-center gap-3 rounded-sm px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-[#3c6e71] bg-[#eef6f6] hover:bg-[#d4e8e9] transition-all"
    >
      <Download className="h-4 w-4" />
      Установить
    </button>
  );
}

function EnablePushButton() {
  const { state, subscribe, unsubscribe } = usePushNotifications();

  if (state === "loading") {
    return (
      <div className="w-full flex items-center gap-3 rounded-sm px-4 py-2.5 text-xs font-medium text-[#a0a0a0] bg-[#f7f7f7]">
        <Bell className="h-4 w-4 animate-pulse" />
        Проверка...
      </div>
    );
  }

  if (state === "subscribed") {
    return (
      <button
        onClick={() => {
          if (confirm("Отключить уведомления о новых заказах?")) unsubscribe();
        }}
        className="w-full flex items-center justify-between gap-3 rounded-sm px-4 py-2.5 text-xs font-semibold text-[#256841] bg-[#eef7f0] hover:bg-[#d5edda] transition-all active:opacity-85"
      >
        <span className="flex items-center gap-3">
          <BellRing className="h-4 w-4" />
          Уведомления вкл.
        </span>
        <span className="text-[10px] text-[#256841]/60">Откл.</span>
      </button>
    );
  }

  if (state === "denied") {
    return (
      <div className="w-full flex items-center gap-3 rounded-sm px-4 py-2.5 text-xs font-medium text-[#a82828] bg-[#fdf0f0]">
        <BellOff className="h-4 w-4" />
        Уведомления заблокированы
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <div className="w-full flex items-center gap-3 rounded-sm px-4 py-2.5 text-xs font-medium text-[#9a7209] bg-[#fef8ec]">
        <Bell className="h-4 w-4" />
        Установите для уведомлений
      </div>
    );
  }

  return (
    <button
      onClick={subscribe}
      className="w-full flex items-center gap-3 rounded-sm px-4 py-2.5 text-xs font-semibold text-[#9a7209] bg-[#fef8ec] hover:bg-[#f5ebd0] transition-all active:opacity-85"
    >
      <Bell className="h-4 w-4" />
      Включить уведомления
    </button>
  );
}

function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 rounded-sm px-3 py-2.5 hover:bg-[#f7f7f7] transition-all"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef6f6] text-xs font-bold text-[#3c6e71] shrink-0">
          {session?.user?.name?.[0]?.toUpperCase() ||
            session?.user?.email?.[0]?.toUpperCase() ||
            "?"}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-[#1a1a1a]">
              {session?.user?.name || "Пользователь"}
            </p>
            {session?.user?.plan && session.user.plan !== "BASIC" && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-[#eef6f6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#3c6e71]">
                {session.user.plan === "PRO" ? "Про" : "Бизнес"}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-[#a0a0a0]">
            {session?.user?.email}
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-[#c4c4c4] shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 border border-[#d9d9d9] bg-white overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[#e8e8e8]">
            <p className="text-sm font-medium text-[#1a1a1a]">{session?.user?.name}</p>
            <p className="text-xs text-[#a0a0a0]">{session?.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-[#a82828] hover:bg-[#fdf0f0] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}

function Logo() {
  return (
    <Link href="/admin" className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#3c6e71] text-white text-xs font-extrabold tracking-tight">
        TM
      </div>
      <span className="font-extrabold text-base uppercase tracking-[0.12em] text-[#1a1a1a]">TapMenu</span>
    </Link>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <div className="flex h-14 items-center justify-between border-b border-[#e8e8e8] px-5 md:hidden bg-white">
        <Logo />
        <button
          onClick={() => setMobileOpen(true)}
          className="h-9 w-9 rounded-sm bg-[#f0f0f0] flex items-center justify-center"
        >
          <Menu className="h-4 w-4 text-[#353535]" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-[#e8e8e8] flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex h-14 items-center justify-between px-5 border-b border-[#e8e8e8]">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                className="h-8 w-8 rounded-sm bg-[#f0f0f0] flex items-center justify-center"
              >
                <X className="h-4 w-4 text-[#353535]" />
              </button>
            </div>
            <div className="flex-1 px-3 py-4">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-[#e8e8e8] p-3 space-y-1.5">
              <InstallAppButton />
              <EnablePushButton />
              <UserMenu />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-white border-r border-[#e8e8e8]">
        <div className="flex h-14 items-center px-5">
          <Logo />
        </div>
        <div className="flex-1 px-3 py-4">
          <NavLinks />
        </div>
        <div className="border-t border-[#e8e8e8] p-3 space-y-1.5">
          <InstallAppButton />
          <EnablePushButton />
          <UserMenu />
        </div>
      </aside>
    </>
  );
}

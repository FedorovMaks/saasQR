"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Store,
  QrCode,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  ClipboardList,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

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

  const navItems = isWaiter
    ? staffVenueIds.map((venueId) => ({
        href: `/admin/venues/${venueId}/orders`,
        label: "Заказы",
        icon: ClipboardList,
      }))
    : ownerNavItems;

  return (
    <nav className="flex flex-col gap-1.5">
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
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-bold transition-all",
              isActive
                ? "bg-[#2563eb]/10 text-[#2563eb]"
                : "text-gray-400 hover:bg-[#f0f2f8] hover:text-gray-600"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
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
        className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-[#f0f2f8] transition-all"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563eb]/10 text-sm font-black text-[#2563eb] shrink-0">
          {session?.user?.name?.[0]?.toUpperCase() ||
            session?.user?.email?.[0]?.toUpperCase() ||
            "?"}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold">
              {session?.user?.name || "Пользователь"}
            </p>
            {session?.user?.plan && session.user.plan !== "BASIC" && (
              <span className="shrink-0 inline-flex items-center rounded-lg bg-[#2563eb]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#2563eb]">
                {session.user.plan === "PRO" ? "Про" : "Бизнес"}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-gray-400 font-medium">
            {session?.user?.email}
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-gray-400 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold">{session?.user?.name}</p>
            <p className="text-xs text-gray-400">{session?.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
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
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-lg shadow-blue-500/20">
        <QrCode className="h-5 w-5" />
      </div>
      <span className="font-black text-xl">QRMenu</span>
    </Link>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5 md:hidden bg-white">
        <Logo />
        <button
          onClick={() => setMobileOpen(true)}
          className="h-10 w-10 rounded-2xl bg-[#f0f2f8] flex items-center justify-center"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex h-16 items-center justify-between px-5 border-b border-gray-100">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 px-4 py-5">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-gray-100 p-4">
              <UserMenu />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-72 md:flex-col bg-white border-r border-gray-100">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <div className="flex-1 px-4 py-5">
          <NavLinks />
        </div>
        <div className="border-t border-gray-100 p-4">
          <UserMenu />
        </div>
      </aside>
    </>
  );
}

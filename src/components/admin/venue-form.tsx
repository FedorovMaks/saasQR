"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { slugify } from "@/lib/utils";
import { toast } from "sonner";
import { Check, X, Loader2, Lock, Copy } from "lucide-react";
import { ImageUpload } from "@/components/admin/image-upload";
import { SITE_URL } from "@/lib/config";

const PRESET_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#7c3aed", "#ea580c",
  "#db2777", "#0d9488", "#d97706", "#1e1e1e",
];

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface VenueFormProps {
  venue?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    address: string | null;
    logoUrl: string | null;
    accentColor: string;
    yookassaShopId: string | null;
    yookassaSecretKey: string | null;
    legalForm: string | null;
    legalName: string | null;
    legalInn: string | null;
    legalOgrn: string | null;
    legalEmail: string | null;
    legalPhone: string | null;
  };
  userPlan?: string;
}

export function VenueForm({ venue, userPlan = "BASIC" }: VenueFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(venue?.name || "");
  const [slug, setSlug] = useState(venue?.slug || "");
  const [description, setDescription] = useState(venue?.description || "");
  const [address, setAddress] = useState(venue?.address || "");
  const [logoUrl, setLogoUrl] = useState(venue?.logoUrl || "");
  const [accentColor, setAccentColor] = useState(venue?.accentColor || "#2563eb");
  const [hexInput, setHexInput] = useState(venue?.accentColor || "#2563eb");
  const [hue, setHue] = useState(220); // default blue
  const [yookassaShopId, setYookassaShopId] = useState(venue?.yookassaShopId || "");
  const [yookassaSecretKey, setYookassaSecretKey] = useState(venue?.yookassaSecretKey || "");
  const [legalForm, setLegalForm] = useState(venue?.legalForm || "");
  const [legalName, setLegalName] = useState(venue?.legalName || "");
  const [legalInn, setLegalInn] = useState(venue?.legalInn || "");
  const [legalOgrn, setLegalOgrn] = useState(venue?.legalOgrn || "");
  const [legalEmail, setLegalEmail] = useState(venue?.legalEmail || "");
  const [legalPhone, setLegalPhone] = useState(venue?.legalPhone || "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!venue);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  const canCustomizeDesign = userPlan !== "BASIC";

  const checkSlug = useCallback(
    async (slugToCheck: string) => {
      if (!slugToCheck || slugToCheck.length < 2) {
        setSlugStatus("idle");
        return;
      }
      setSlugStatus("checking");
      try {
        const params = new URLSearchParams({ slug: slugToCheck });
        if (venue?.id) params.set("excludeId", venue.id);
        const res = await fetch(`/api/venues/check-slug?${params}`);
        const data = await res.json();
        setSlugStatus(data.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    },
    [venue?.id]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (slug) checkSlug(slug);
    }, 500);
    return () => clearTimeout(timeout);
  }, [slug, checkSlug]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 50)
    );
  }

  function handleColorChange(color: string) {
    setAccentColor(color);
    setHexInput(color);
  }

  function handleHexInputChange(value: string) {
    setHexInput(value);
    // Auto-add # if missing
    const hex = value.startsWith("#") ? value : `#${value}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      setAccentColor(hex);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (slugStatus === "taken") {
      toast.error("Этот slug уже занят");
      return;
    }
    setLoading(true);

    try {
      const url = venue ? `/api/venues/${venue.id}` : "/api/venues";
      const method = venue ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, slug, description, address,
          logoUrl: logoUrl || undefined,
          accentColor: canCustomizeDesign ? accentColor : undefined,
          yookassaShopId: yookassaShopId || undefined,
          yookassaSecretKey: yookassaSecretKey || undefined,
          legalForm: legalForm || undefined,
          legalName: legalName || undefined,
          legalInn: legalInn || undefined,
          legalOgrn: legalOgrn || undefined,
          legalEmail: legalEmail || undefined,
          legalPhone: legalPhone || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Ошибка сохранения");
        return;
      }

      toast.success(venue ? "Заведение обновлено" : "Заведение создано");
      router.push("/admin");
      router.refresh();
    } catch {
      toast.error("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {venue ? "Редактировать заведение" : "Новое заведение"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Бриз Кофейня"
              required
              minLength={2}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (адрес меню) *</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="briiz"
                  required
                  minLength={2}
                  disabled={loading}
                  className="pr-8"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {slugStatus === "checking" && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {slugStatus === "available" && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {slugStatus === "taken" && (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Адрес меню: site.com/<strong>{slug || "..."}</strong>
            </p>
            {slugStatus === "taken" && (
              <p className="text-xs text-destructive">
                Этот slug уже занят
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Уютная кофейня у моря..."
              rows={3}
              disabled={loading}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Адрес</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ул. Набережная, 15"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Логотип</Label>
            <ImageUpload
              value={logoUrl || null}
              onChange={(url) => setLogoUrl(url || "")}
              folder="venues"
            />
          </div>

          {/* Color picker — gated by plan */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Цвет меню
              {!canCustomizeDesign && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600 border border-amber-200">
                  <Lock className="h-3 w-3" />
                  Бизнес
                </span>
              )}
            </Label>
            {canCustomizeDesign ? (
              <div className="space-y-3">
                {/* Horizontal rainbow slider */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={hue}
                    onChange={(e) => {
                      const h = parseInt(e.target.value);
                      setHue(h);
                      const hex = hslToHex(h, 80, 50);
                      handleColorChange(hex);
                    }}
                    className="w-full h-8 rounded-xl appearance-none cursor-pointer"
                    style={{
                      background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                    }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  {/* Color preview */}
                  <div
                    className="h-10 w-10 rounded-xl shrink-0 border border-gray-200"
                    style={{ backgroundColor: accentColor }}
                  />
                  {/* Hex input */}
                  <Input
                    value={hexInput}
                    onChange={(e) => handleHexInputChange(e.target.value)}
                    placeholder="#2563eb"
                    className="w-32 font-mono"
                    maxLength={7}
                  />
                </div>
                {/* Preset colors */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleColorChange(c)}
                      className="relative h-8 w-8 rounded-lg transition-all hover:scale-110 active:scale-95"
                      style={{
                        backgroundColor: c,
                        ...(accentColor === c ? { outline: "2px solid", outlineColor: c, outlineOffset: "2px" } : {}),
                      }}
                    >
                      {accentColor === c && (
                        <Check className="h-3.5 w-3.5 text-white absolute inset-0 m-auto drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 p-4 text-center">
                <Lock className="h-5 w-5 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">
                  Кастомизация дизайна доступна на тарифе Бизнес и выше
                </p>
                <a
                  href="/admin/billing"
                  className="text-sm font-bold text-[#2563eb] hover:underline mt-1 inline-block"
                >
                  Перейти к тарифам
                </a>
              </div>
            )}
          </div>

          {/* YooKassa payment settings — only for existing venues */}
          {venue && (
            <div className="space-y-4 rounded-2xl border border-dashed border-gray-200 p-4">
              <div>
                <h4 className="text-sm font-bold">Онлайн-оплата (ЮKassa)</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Укажите ключи из вашего аккаунта ЮKassa для приёма онлайн-платежей
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yookassaShopId">Shop ID</Label>
                <Input
                  id="yookassaShopId"
                  value={yookassaShopId}
                  onChange={(e) => setYookassaShopId(e.target.value)}
                  placeholder="123456"
                  disabled={loading}
                  autoComplete="off"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yookassaSecretKey">Секретный ключ</Label>
                <Input
                  id="yookassaSecretKey"
                  type="password"
                  value={yookassaSecretKey}
                  onChange={(e) => setYookassaSecretKey(e.target.value)}
                  placeholder="live_..."
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              {yookassaShopId && yookassaSecretKey ? (
                <p className="text-xs text-green-600 font-medium">
                  ✓ Онлайн-оплата активна — гости смогут оплачивать заказы
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Без ключей заказы создаются без онлайн-оплаты
                </p>
              )}
            </div>
          )}

          {/* Legal info → auto-generated offer/requisites page */}
          {venue && (
            <div className="space-y-4 rounded-2xl border border-dashed border-gray-200 p-4">
              <div>
                <h4 className="text-sm font-bold">
                  Юридическая информация (для подключения оплаты)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Заполните — и мы автоматически создадим публичную страницу с
                  офертой и реквизитами. Её ссылку вставите в ЮKassa при подключении.
                </p>
                <a
                  href="/admin/help/payments"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb] hover:underline"
                >
                  📘 Как подключить оплату — пошаговая инструкция →
                </a>
              </div>

              <div className="space-y-2">
                <Label htmlFor="legalForm">Форма</Label>
                <select
                  id="legalForm"
                  value={legalForm}
                  onChange={(e) => setLegalForm(e.target.value)}
                  disabled={loading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">— выберите —</option>
                  <option value="Самозанятый">Самозанятый (НПД)</option>
                  <option value="ИП">ИП</option>
                  <option value="ООО">ООО</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="legalName">ФИО / Наименование</Label>
                <Input
                  id="legalName"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Иванов Иван Иванович / ООО «Ромашка»"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="legalInn">ИНН</Label>
                  <Input
                    id="legalInn"
                    value={legalInn}
                    onChange={(e) => setLegalInn(e.target.value)}
                    placeholder="590423271267"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalOgrn">ОГРН / ОГРНИП</Label>
                  <Input
                    id="legalOgrn"
                    value={legalOgrn}
                    onChange={(e) => setLegalOgrn(e.target.value)}
                    placeholder="если есть"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="legalEmail">E-mail</Label>
                  <Input
                    id="legalEmail"
                    value={legalEmail}
                    onChange={(e) => setLegalEmail(e.target.value)}
                    placeholder="mail@example.ru"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalPhone">Телефон</Label>
                  <Input
                    id="legalPhone"
                    value={legalPhone}
                    onChange={(e) => setLegalPhone(e.target.value)}
                    placeholder="+7 999 123-45-67"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 space-y-2.5">
                <p className="text-xs font-bold text-[#2563eb]">
                  Готовые ссылки для ЮKassa:
                </p>
                <CopyableUrl label="Адрес сайта" url={`${SITE_URL}/${venue.slug}`} />
                <CopyableUrl
                  label="Страница с реквизитами и офертой"
                  url={`${SITE_URL}/${venue.slug}/info`}
                />
                <p className="text-[11px] text-blue-500/80">
                  Сначала заполните данные выше и сохраните — затем вставьте эти
                  ссылки в форму подключения ЮKassa.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading || slugStatus === "taken"}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : venue ? (
                "Сохранить"
              ) : (
                "Создать заведение"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin")}
              disabled={loading}
            >
              Отмена
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

function CopyableUrl({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-gray-500">{label}</p>
        <p className="truncate font-mono text-xs text-gray-700">{url}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success("Ссылка скопирована");
            setTimeout(() => setCopied(false), 2000);
          } catch {
            toast.error("Не удалось скопировать");
          }
        }}
        className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#2563eb] transition-colors hover:bg-blue-100"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

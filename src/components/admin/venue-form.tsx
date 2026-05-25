"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { slugify } from "@/lib/utils";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { ImageUpload } from "@/components/admin/image-upload";

const ACCENT_COLORS = [
  { value: "#2563eb", label: "Синий" },
  { value: "#dc2626", label: "Красный" },
  { value: "#16a34a", label: "Зелёный" },
  { value: "#7c3aed", label: "Фиолетовый" },
  { value: "#ea580c", label: "Оранжевый" },
  { value: "#db2777", label: "Розовый" },
  { value: "#0d9488", label: "Бирюзовый" },
  { value: "#d97706", label: "Янтарный" },
  { value: "#1e1e1e", label: "Чёрный" },
];

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
  };
}

export function VenueForm({ venue }: VenueFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(venue?.name || "");
  const [slug, setSlug] = useState(venue?.slug || "");
  const [description, setDescription] = useState(venue?.description || "");
  const [address, setAddress] = useState(venue?.address || "");
  const [logoUrl, setLogoUrl] = useState(venue?.logoUrl || "");
  const [accentColor, setAccentColor] = useState(venue?.accentColor || "#2563eb");
  const [yookassaShopId, setYookassaShopId] = useState(venue?.yookassaShopId || "");
  const [yookassaSecretKey, setYookassaSecretKey] = useState(venue?.yookassaSecretKey || "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!venue);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

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
          accentColor,
          yookassaShopId: yookassaShopId || undefined,
          yookassaSecretKey: yookassaSecretKey || undefined,
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

          <div className="space-y-2">
            <Label>Цвет меню</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAccentColor(c.value)}
                  className="relative h-10 w-10 rounded-xl transition-all hover:scale-110 active:scale-95"
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {accentColor === c.value && (
                    <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Акцентный цвет кнопок и элементов в меню гостя
            </p>
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

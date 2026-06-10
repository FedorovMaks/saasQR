"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CategoryList } from "@/components/admin/category-list";
import { MenuItemList } from "@/components/admin/menu-item-list";
import { Plus, ExternalLink, ArrowLeft } from "lucide-react";

type Variant = {
  id: string;
  label: string;
  price: number;
  sortOrder: number;
};

type Item = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isStopped: boolean;
  sortOrder: number;
  categoryId: string;
  variants: Variant[];
  calories: number | null;
  proteins: number | null;
  fats: number | null;
  carbs: number | null;
  composition: string | null;
};

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  items: Item[];
};

type Venue = {
  id: string;
  name: string;
  slug: string;
  categories: Category[];
};

export function MenuManager({ venue }: { venue: Venue }) {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    venue.categories[0]?.id || null
  );

  const selectedCategory = venue.categories.find(
    (c) => c.id === selectedCategoryId
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f0f0] text-gray-500 hover:bg-[#e4e8f2] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Меню — {venue.name}</h1>
            <p className="text-sm text-muted-foreground">
              Управляйте категориями и позициями
            </p>
          </div>
        </div>
        <Link
          href={`/${venue.slug}`}
          target="_blank"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#f0f0f0] px-4 text-sm font-extrabold text-gray-600 hover:bg-[#e4e8f2] transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Как гость
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Categories panel */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Категории
          </h2>
          <CategoryList
            venueId={venue.id}
            categories={venue.categories}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            onUpdate={() => router.refresh()}
          />
        </div>

        {/* Items panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {selectedCategory
                ? `Позиции — ${selectedCategory.name}`
                : "Выберите категорию"}
            </h2>
          </div>
          {selectedCategory ? (
            <MenuItemList
              venueId={venue.id}
              category={selectedCategory}
              onUpdate={() => router.refresh()}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              <Plus className="mx-auto h-8 w-8 mb-2" />
              <p>Создайте категорию слева, чтобы добавлять позиции</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

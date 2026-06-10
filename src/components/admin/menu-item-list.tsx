"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/admin/image-upload";
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Ban,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
  items: Item[];
};

interface MenuItemListProps {
  venueId: string;
  category: Category;
  onUpdate: () => void;
}

interface FormVariant {
  id?: string;
  label: string;
  price: string;
}

function SortableItem({
  item,
  venueId,
  onEdit,
  onDelete,
  onUpdate,
}: {
  item: Item;
  venueId: string;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(String(item.price / 100));
  const [togglingStop, setTogglingStop] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function handleToggleStop() {
    setTogglingStop(true);
    try {
      await fetch(`/api/venues/${venueId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStopped: !item.isStopped }),
      });
      onUpdate();
    } catch {
      toast.error("Ошибка");
    } finally {
      setTogglingStop(false);
    }
  }

  async function handlePriceSave() {
    const newPrice = Math.round(parseFloat(priceValue) * 100);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Некорректная цена");
      return;
    }
    try {
      await fetch(`/api/venues/${venueId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: newPrice }),
      });
      setEditingPrice(false);
      onUpdate();
    } catch {
      toast.error("Ошибка");
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-md border p-3",
        item.isStopped && "opacity-60",
        isDragging && "opacity-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground shrink-0"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.name}
          width={48}
          height={48}
          className="rounded object-cover shrink-0"
          style={{ width: 48, height: 48 }}
        />
      ) : (
        <div className="w-12 h-12 rounded bg-muted shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{item.name}</p>
          {item.isStopped && (
            <Badge variant="destructive" className="text-xs shrink-0">
              Стоп
            </Badge>
          )}
          {item.variants.length > 0 && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {item.variants.length} вар.
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">
            {item.description}
          </p>
        )}
      </div>

      {/* Inline price */}
      <div className="shrink-0">
        {editingPrice ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePriceSave();
            }}
            className="flex items-center gap-1"
          >
            <Input
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              className="w-20 h-7 text-sm"
              autoFocus
              onBlur={() => setEditingPrice(false)}
            />
          </form>
        ) : (
          <button
            onClick={() => setEditingPrice(true)}
            className="text-sm font-medium hover:underline"
            title="Нажмите для редактирования цены"
          >
            {formatPrice(item.price)}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleToggleStop}
          disabled={togglingStop}
          className={cn(
            "p-1 rounded",
            item.isStopped
              ? "text-green-600 hover:bg-green-50"
              : "text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
          )}
          title={item.isStopped ? "Вернуть в меню" : "В стоп-лист"}
        >
          {togglingStop ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : item.isStopped ? (
            <Check className="h-4 w-4" />
          ) : (
            <Ban className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={onEdit}
          className="p-1 text-muted-foreground hover:text-foreground rounded"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-muted-foreground hover:text-destructive rounded"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function MenuItemList({ venueId, category, onUpdate }: MenuItemListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formVariants, setFormVariants] = useState<FormVariant[]>([]);
  // КБЖУ + состав
  const [formCalories, setFormCalories] = useState("");
  const [formProteins, setFormProteins] = useState("");
  const [formFats, setFormFats] = useState("");
  const [formCarbs, setFormCarbs] = useState("");
  const [formComposition, setFormComposition] = useState("");
  const [formHasNutrition, setFormHasNutrition] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function openCreate() {
    setEditingItem(null);
    setFormName("");
    setFormDesc("");
    setFormPrice("");
    setFormImage(null);
    setFormVariants([]);
    setFormCalories("");
    setFormProteins("");
    setFormFats("");
    setFormCarbs("");
    setFormComposition("");
    setFormHasNutrition(false);
    setDialogOpen(true);
  }

  function openEdit(item: Item) {
    setEditingItem(item);
    setFormName(item.name);
    setFormDesc(item.description || "");
    setFormPrice(String(item.price / 100));
    setFormImage(item.imageUrl);
    setFormVariants(
      item.variants.map((v) => ({
        id: v.id,
        label: v.label,
        price: String(v.price / 100),
      }))
    );
    setFormCalories(item.calories != null ? String(item.calories) : "");
    setFormProteins(item.proteins != null ? String(item.proteins) : "");
    setFormFats(item.fats != null ? String(item.fats) : "");
    setFormCarbs(item.carbs != null ? String(item.carbs) : "");
    setFormComposition(item.composition || "");
    setFormHasNutrition(
      item.calories != null ||
        item.proteins != null ||
        item.fats != null ||
        item.carbs != null
    );
    setDialogOpen(true);
  }

  function addVariant() {
    setFormVariants([...formVariants, { label: "", price: "" }]);
  }

  function updateVariant(index: number, field: "label" | "price", value: string) {
    const updated = [...formVariants];
    updated[index] = { ...updated[index], [field]: value };
    setFormVariants(updated);
  }

  function removeVariant(index: number) {
    setFormVariants(formVariants.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!formName.trim()) return;
    const priceNum = Math.round(parseFloat(formPrice) * 100);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Некорректная цена");
      return;
    }

    const variants = formVariants
      .filter((v) => v.label.trim())
      .map((v) => ({
        id: v.id,
        label: v.label.trim(),
        price: Math.round(parseFloat(v.price) * 100) || 0,
      }));

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/venues/${venueId}/items/${editingItem.id}`
        : `/api/venues/${venueId}/items`;
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          price: priceNum,
          categoryId: category.id,
          imageUrl: formImage || undefined,
          calories: formHasNutrition && formCalories ? parseInt(formCalories) : null,
          proteins: formHasNutrition && formProteins ? parseFloat(formProteins) : null,
          fats: formHasNutrition && formFats ? parseFloat(formFats) : null,
          carbs: formHasNutrition && formCarbs ? parseFloat(formCarbs) : null,
          composition: formComposition.trim() || null,
          variants,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Ошибка");
        return;
      }

      toast.success(editingItem ? "Позиция обновлена" : "Позиция добавлена");
      setDialogOpen(false);
      onUpdate();
    } catch {
      toast.error("Ошибка соединения");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Item) {
    if (!confirm(`Удалить "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/venues/${venueId}/items/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Ошибка удаления");
        return;
      }
      toast.success("Позиция удалена");
      onUpdate();
    } catch {
      toast.error("Ошибка соединения");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = category.items;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    try {
      await fetch(`/api/venues/${venueId}/items/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((i) => i.id) }),
      });
      onUpdate();
    } catch {
      toast.error("Ошибка сортировки");
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={category.items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {category.items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                venueId={venueId}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item)}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {category.items.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>В этой категории пока нет позиций</p>
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={openCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Добавить позицию
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Редактировать позицию" : "Новая позиция"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Капучино"
                required
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Классический капучино на свежем молоке"
                rows={2}
                disabled={saving}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label>Цена (руб.) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="250"
                required
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label>Фото</Label>
              <ImageUpload
                value={formImage}
                onChange={setFormImage}
                folder="items"
              />
            </div>

            {/* Composition */}
            <div className="space-y-2">
              <Label>Состав / Ингредиенты</Label>
              <textarea
                value={formComposition}
                onChange={(e) => setFormComposition(e.target.value)}
                placeholder="Молоко, эспрессо, ваниль..."
                rows={2}
                disabled={saving}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
            </div>

            {/* КБЖУ (опционально) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>КБЖУ (на 100 г / 100 мл)</Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formHasNutrition}
                  aria-label="Указать КБЖУ"
                  onClick={() => setFormHasNutrition((v) => !v)}
                  disabled={saving}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
                    formHasNutrition ? "bg-[#3c6e71]" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                      formHasNutrition ? "translate-x-[18px]" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
              {formHasNutrition ? (
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Ккал</span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={formCalories}
                      onChange={(e) => setFormCalories(e.target.value)}
                      placeholder="250"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Белки, г</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formProteins}
                      onChange={(e) => setFormProteins(e.target.value)}
                      placeholder="12"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Жиры, г</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formFats}
                      onChange={(e) => setFormFats(e.target.value)}
                      placeholder="8"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Углев., г</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formCarbs}
                      onChange={(e) => setFormCarbs(e.target.value)}
                      placeholder="30"
                      disabled={saving}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  КБЖУ не указано — включите тумблер, чтобы добавить пищевую ценность.
                </p>
              )}
            </div>

            {/* Variants */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Варианты (размеры)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addVariant}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Добавить
                </Button>
              </div>
              {formVariants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={v.label}
                    onChange={(e) => updateVariant(i, "label", e.target.value)}
                    placeholder="S / M / L"
                    className="flex-1"
                    disabled={saving}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={v.price}
                    onChange={(e) => updateVariant(i, "price", e.target.value)}
                    placeholder="Цена"
                    className="w-24"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => removeVariant(i)}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving || !formName.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Сохранить" : "Добавить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

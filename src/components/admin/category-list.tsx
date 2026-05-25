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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { GripVertical, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  items: { id: string }[];
};

interface CategoryListProps {
  venueId: string;
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: () => void;
}

function SortableCategory({
  category,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors",
        isSelected ? "border-primary bg-accent" : "hover:bg-accent/50",
        isDragging && "opacity-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        onClick={onSelect}
        className="flex-1 text-left truncate font-medium"
      >
        {category.name}
      </button>
      <Badge variant="secondary" className="text-xs">
        {category.items.length}
      </Badge>
      <button
        onClick={onEdit}
        className="text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function CategoryList({
  venueId,
  categories,
  selectedId,
  onSelect,
  onUpdate,
}: CategoryListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function openCreate() {
    setEditingCategory(null);
    setCategoryName("");
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!categoryName.trim()) return;
    setSaving(true);
    try {
      const url = editingCategory
        ? `/api/venues/${venueId}/categories/${editingCategory.id}`
        : `/api/venues/${venueId}/categories`;
      const method = editingCategory ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Ошибка");
        return;
      }

      const data = await res.json();
      toast.success(editingCategory ? "Категория обновлена" : "Категория создана");
      setDialogOpen(false);

      if (!editingCategory) {
        onSelect(data.id);
      }
      onUpdate();
    } catch {
      toast.error("Ошибка соединения");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Удалить категорию "${cat.name}"?`)) return;
    try {
      const res = await fetch(
        `/api/venues/${venueId}/categories/${cat.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error("Ошибка удаления");
        return;
      }
      toast.success("Категория удалена");
      if (selectedId === cat.id) onSelect(null);
      onUpdate();
    } catch {
      toast.error("Ошибка соединения");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    try {
      await fetch(`/api/venues/${venueId}/categories/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((c) => c.id) }),
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
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {categories.map((cat) => (
              <SortableCategory
                key={cat.id}
                category={cat}
                isSelected={cat.id === selectedId}
                onSelect={() => onSelect(cat.id)}
                onEdit={() => openEdit(cat)}
                onDelete={() => handleDelete(cat)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button variant="outline" size="sm" className="w-full" onClick={openCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Добавить категорию
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Редактировать категорию" : "Новая категория"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Например: Напитки"
              autoFocus
              disabled={saving}
            />
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={saving || !categoryName.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCategory ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

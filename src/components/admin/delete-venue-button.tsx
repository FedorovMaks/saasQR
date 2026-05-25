"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteVenueButton({
  venueId,
  venueName,
}: {
  venueId: string;
  venueName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Удалить заведение "${venueName}"? Это действие нельзя отменить.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/venues/${venueId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Ошибка удаления");
        return;
      }
      toast.success("Заведение удалено");
      router.refresh();
    } catch {
      toast.error("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}

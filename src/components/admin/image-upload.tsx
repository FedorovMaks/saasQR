"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  folder = "venues",
  className,
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "Ошибка загрузки");
          return;
        }

        onChange(data.url);
      } catch {
        toast.error("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    },
    [folder, onChange]
  );

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  if (value) {
    return (
      <div className={cn("relative inline-block", className)}>
        <Image
          src={value}
          alt="Загруженное изображение"
          width={200}
          height={200}
          className="rounded-lg object-cover border"
          style={{ width: 200, height: 200 }}
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
          onClick={() => onChange(null)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
        dragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50",
        loading && "pointer-events-none opacity-50",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      ) : (
        <Upload className="h-8 w-8 text-muted-foreground" />
      )}
      <p className="mt-2 text-sm text-muted-foreground">
        {loading ? "Загрузка..." : "Нажмите или перетащите изображение"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        JPEG, PNG, WebP до 5 МБ
      </p>
    </div>
  );
}

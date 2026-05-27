import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sharp from "sharp";
import crypto from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 800;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "venues";

    if (!file) {
      return NextResponse.json({ error: "Файл не выбран" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Допустимые форматы: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Файл слишком большой (максимум 5 МБ)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const processed = await sharp(buffer)
      .resize(MAX_WIDTH, MAX_WIDTH, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    const filename = `${folder}/${crypto.randomUUID()}.webp`;

    // Use Vercel Blob in production, local filesystem in development
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(filename, processed, {
        access: "public",
        contentType: "image/webp",
      });
      return NextResponse.json({ url: blob.url });
    } else {
      // Local development — save to public/uploads
      const { writeFile, mkdir } = await import("fs/promises");
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
      const localFilename = `${crypto.randomUUID()}.webp`;
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, localFilename), processed);
      const url = `/uploads/${folder}/${localFilename}`;
      return NextResponse.json({ url });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки файла" },
      { status: 500 }
    );
  }
}

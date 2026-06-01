"use client";

import { useState, useEffect, useRef } from "react";
import { Download, QrCode, Copy, Check, Printer } from "lucide-react";
import { toast } from "sonner";
import { SITE_URL } from "@/lib/config";

export function VenueQR({
  venueId,
  slug,
  venueName,
}: {
  venueId: string;
  slug: string;
  venueName: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Always use the canonical public domain so the QR works from any phone,
  // even if the admin is opened on localhost or vercel.app.
  const menuUrl = `${SITE_URL}/${slug}`;

  // Generate QR on client using canvas (lightweight, no API call needed for preview)
  useEffect(() => {
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(menuUrl, {
        width: 512,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "H",
      }).then(setQrDataUrl);
    });
  }, [menuUrl]);

  const handleDownload = async () => {
    try {
      const res = await fetch(
        `/api/venues/${venueId}/qr?host=${encodeURIComponent(SITE_URL)}`
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${slug}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("QR-код скачан");
    } catch {
      toast.error("Ошибка скачивания");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR-код — ${venueName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; padding: 40px; }
          img { width: 400px; height: 400px; }
          h1 { font-size: 28px; margin-top: 24px; font-weight: 900; }
          p { font-size: 16px; color: #666; margin-top: 8px; }
          .hint { font-size: 14px; color: #999; margin-top: 16px; border: 2px dashed #ddd; padding: 12px 24px; border-radius: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <img src="${qrDataUrl}" alt="QR" />
        <h1>${venueName}</h1>
        <p>Отсканируйте QR-код для просмотра меню</p>
        <div class="hint">Укажите номер столика при оформлении заказа</div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563eb]/10 text-[#2563eb]">
          <QrCode className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black">QR-код меню</h3>
          <p className="text-sm text-gray-400 font-medium">
            Распечатайте и разместите на столиках
          </p>
        </div>
      </div>

      {/* QR Preview */}
      <div className="flex flex-col items-center">
        <div className="rounded-2xl bg-white border-2 border-[#f0f2f8] p-4 mb-4">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR-код меню"
              className="w-48 h-48"
              draggable={false}
            />
          ) : (
            <div className="w-48 h-48 bg-[#f0f2f8] rounded-xl animate-pulse" />
          )}
        </div>

        {/* Menu URL */}
        <div className="w-full rounded-2xl bg-[#f0f2f8] px-4 py-3 mb-4">
          <p className="text-sm text-center font-bold text-gray-500 truncate">
            {menuUrl}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 w-full">
          <button
            onClick={handleDownload}
            className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563eb] text-sm font-extrabold text-white shadow-md shadow-blue-500/15 transition-all hover:shadow-lg active:scale-[0.97]"
          >
            <Download className="h-4 w-4" />
            Скачать
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#f0f2f8] px-5 text-sm font-extrabold text-gray-600 transition-all hover:bg-[#e4e8f2] active:scale-[0.97]"
          >
            <Printer className="h-4 w-4" />
          </button>
          <button
            onClick={handleCopyLink}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#f0f2f8] px-5 text-sm font-extrabold text-gray-600 transition-all hover:bg-[#e4e8f2] active:scale-[0.97]"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

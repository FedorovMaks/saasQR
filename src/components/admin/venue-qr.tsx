"use client";

import { useState, useEffect } from "react";
import { Download, QrCode, Copy, Check, Printer, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { SITE_URL } from "@/lib/config";

type Mode = "single" | "tables";

const CTA = "Наведите камеру — меню и заказ";
const MAX_TABLES = 100;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function VenueQR({
  venueId,
  slug,
  venueName,
  logoUrl,
  accentColor = "#3c6e71",
}: {
  venueId: string;
  slug: string;
  venueName: string;
  logoUrl?: string | null;
  accentColor?: string;
}) {
  const [mode, setMode] = useState<Mode>("single");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Per-table state
  const [tableCount, setTableCount] = useState(10);
  const [tableQrs, setTableQrs] = useState<{ n: number; url: string }[]>([]);
  const [generating, setGenerating] = useState(false);

  const menuUrl = `${SITE_URL}/${slug}`;
  // Logos only embed in the print window if absolute (relative paths won't resolve there)
  const printableLogo = logoUrl && logoUrl.startsWith("http") ? logoUrl : null;

  // Single venue QR (preview)
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

  // Per-table QR generation
  useEffect(() => {
    if (mode !== "tables") return;
    const count = Math.min(Math.max(1, tableCount || 1), MAX_TABLES);
    let cancelled = false;
    setGenerating(true);
    import("qrcode").then(async (QRCode) => {
      const items: { n: number; url: string }[] = [];
      for (let n = 1; n <= count; n++) {
        const url = await QRCode.toDataURL(`${menuUrl}?table=${n}`, {
          width: 512,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
          errorCorrectionLevel: "H",
        });
        items.push({ n, url });
      }
      if (!cancelled) {
        setTableQrs(items);
        setGenerating(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode, tableCount, menuUrl]);

  const handleDownloadSingle = async () => {
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

  const handlePrintSingle = () => {
    if (!qrDataUrl) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>QR — ${escapeHtml(venueName)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; padding: 40px; }
        img { width: 400px; height: 400px; }
        h1 { font-size: 28px; margin-top: 24px; font-weight: 800; }
        p { font-size: 16px; color: #666; margin-top: 8px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <img src="${qrDataUrl}" alt="QR" />
        <h1>${escapeHtml(venueName)}</h1>
        <p>${CTA}</p>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    win.document.close();
  };

  const handlePrintTables = () => {
    if (tableQrs.length === 0) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const logoHtml = printableLogo
      ? `<img class="logo" src="${printableLogo}" alt="" />`
      : "";
    const cards = tableQrs
      .map(
        (t) => `
        <div class="card">
          <div class="top">${logoHtml}<span class="venue">${escapeHtml(venueName)}</span></div>
          <div class="num">${t.n}</div>
          <img class="qr" src="${t.url}" alt="Столик ${t.n}" />
          <div class="cta">${CTA}</div>
        </div>`
      )
      .join("");
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>QR для столов — ${escapeHtml(venueName)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { margin: 1cm; }
        body { font-family: Arial, sans-serif; }
        .grid { display: flex; flex-wrap: wrap; gap: 0.4cm; justify-content: flex-start; }
        .card {
          width: 8.5cm; min-height: 8.5cm;
          border: 1px dashed #c4c4c4; border-radius: 6px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 0.4cm; page-break-inside: avoid; text-align: center;
        }
        .top { display: flex; align-items: center; gap: 9px; min-height: 1.4cm; }
        .logo { height: 1.2cm; width: auto; object-fit: contain; }
        .venue { font-size: 16pt; font-weight: 800; color: #1a1a1a; }
        .num { font-size: 22pt; font-weight: 800; line-height: 1; color: ${accentColor}; margin: 0.05cm 0 0.15cm; }
        .qr { width: 4.8cm; height: 4.8cm; }
        .cta { font-size: 9.5pt; color: #353535; margin-top: 0.2cm; }
        @media print { .card { border-color: #d9d9d9; } }
      </style></head>
      <body>
        <div class="grid">${cards}</div>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    win.document.close();
  };

  const downloadOneTable = (n: number, url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${slug}-stol-${n}.png`;
    a.click();
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3c6e71]/10 text-[#3c6e71]">
          <QrCode className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black">QR-код меню</h3>
          <p className="text-sm text-gray-400 font-medium">
            Распечатайте и разместите на столиках
          </p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="inline-flex w-full rounded-2xl bg-[#f0f0f0] p-1 mb-5">
        <button
          onClick={() => setMode("single")}
          className={`flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-extrabold transition-all ${
            mode === "single" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
          }`}
        >
          <QrCode className="h-4 w-4" />
          Один QR
        </button>
        <button
          onClick={() => setMode("tables")}
          className={`flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-extrabold transition-all ${
            mode === "tables" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          QR по столикам
        </button>
      </div>

      {mode === "single" ? (
        <div className="flex flex-col items-center">
          <div className="rounded-2xl bg-white border-2 border-[#f0f0f0] p-4 mb-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR-код меню" className="w-48 h-48" draggable={false} />
            ) : (
              <div className="w-48 h-48 bg-[#f0f0f0] rounded-xl animate-pulse" />
            )}
          </div>

          <div className="w-full rounded-2xl bg-[#f0f0f0] px-4 py-3 mb-4">
            <p className="text-sm text-center font-bold text-gray-500 truncate">{menuUrl}</p>
          </div>

          <div className="flex gap-2.5 w-full">
            <button
              onClick={handleDownloadSingle}
              className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#3c6e71] text-sm font-extrabold text-white transition-all hover:bg-[#325d5f] active:scale-[0.97]"
            >
              <Download className="h-4 w-4" />
              Скачать
            </button>
            <button
              onClick={handlePrintSingle}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#f0f0f0] px-5 text-sm font-extrabold text-gray-600 transition-all hover:bg-[#e4e8f2] active:scale-[0.97]"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={handleCopyLink}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#f0f0f0] px-5 text-sm font-extrabold text-gray-600 transition-all hover:bg-[#e4e8f2] active:scale-[0.97]"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Один QR на всё заведение. Гость вводит номер столика вручную.
          </p>
        </div>
      ) : (
        <div>
          {/* Table count */}
          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1">
              <label className="text-xs font-bold uppercase tracking-[0.04em] text-gray-400 mb-1.5 block">
                Сколько столиков?
              </label>
              <input
                type="number"
                min={1}
                max={MAX_TABLES}
                value={tableCount}
                onChange={(e) => setTableCount(Math.min(Math.max(1, Number(e.target.value) || 1), MAX_TABLES))}
                className="w-full h-11 rounded-2xl border border-[#d9d9d9] bg-[#f7f9fa] px-4 text-sm font-bold text-gray-900 focus:outline-none focus:border-[#3c6e71] focus:bg-white transition-colors"
              />
            </div>
            <button
              onClick={handlePrintTables}
              disabled={generating || tableQrs.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#3c6e71] px-5 text-sm font-extrabold text-white transition-all hover:bg-[#325d5f] active:scale-[0.97] disabled:opacity-60"
            >
              <Printer className="h-4 w-4" />
              Печать макета
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Для каждого столика свой QR с номером — гость ничего не вводит. «Печать макета» откроет
            лист с номерками (номер + QR + призыв) под нарезку. Можно скачать отдельные PNG для типографии.
          </p>

          {/* Preview grid */}
          {generating ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              Генерация QR…
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {tableQrs.map((t) => (
                <button
                  key={t.n}
                  onClick={() => downloadOneTable(t.n, t.url)}
                  title={`Скачать QR столика ${t.n}`}
                  className="group flex flex-col items-center rounded-2xl border border-[#f0f0f0] p-2 hover:border-[#3c6e71] hover:bg-[#eef6f6] transition-all"
                >
                  <img src={t.url} alt={`Столик ${t.n}`} className="w-full aspect-square" />
                  <span className="mt-1 text-xs font-bold text-gray-600 flex items-center gap-1">
                    Стол {t.n}
                    <Download className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

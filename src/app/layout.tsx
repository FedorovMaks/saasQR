import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

// Display font — bold geometric, used for venue name & section headings
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "QRMenu — Цифровое меню для вашего заведения",
  description:
    "SaaS-платформа для малого общепита. Создайте цифровое меню, генерируйте QR-код, принимайте заказы.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
    shortcut: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QRMenu",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} ${unbounded.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}>
        <SessionProvider>
          <ServiceWorkerRegister />
          {children}
          <InstallPrompt />
        </SessionProvider>
      </body>
    </html>
  );
}

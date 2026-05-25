import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "QRMenu — Цифровое меню для вашего заведения",
  description:
    "SaaS-платформа для малого общепита. Создайте цифровое меню, генерируйте QR-код, принимайте заказы.",
  manifest: "/manifest.json",
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
    <html lang="ru" className={`${nunito.variable} h-full antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-nunito), system-ui, sans-serif" }}>
        <SessionProvider>
          <ServiceWorkerRegister />
          {children}
          <InstallPrompt />
        </SessionProvider>
      </body>
    </html>
  );
}

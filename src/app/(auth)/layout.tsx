import Link from "next/link";
import { QrCode } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 bg-[#f0f2f8]">
      <Link
        href="/"
        className="mb-10 flex items-center gap-3 text-2xl font-black transition-colors hover:text-primary"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
          <QrCode className="h-6 w-6" />
        </div>
        QRMenu
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

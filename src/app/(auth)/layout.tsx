import Link from "next/link";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 bg-white">
      <Link
        href="/"
        className="mb-10 flex items-center gap-3 text-xl font-extrabold uppercase tracking-[0.12em] text-[#1a1a1a] transition-colors hover:text-[#3c6e71]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#3c6e71] text-white text-sm font-extrabold tracking-tight">
          TM
        </div>
        TapMenu
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Protected routes — require authentication
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin") ||
    pathname.startsWith("/api/venues") ||
    pathname.startsWith("/api/superadmin") ||
    pathname.startsWith("/api/user") ||
    pathname.startsWith("/api/upload")
  ) {
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Superadmin routes — require isSuperAdmin
    if (pathname.startsWith("/superadmin") || pathname.startsWith("/api/superadmin")) {
      if (!token.isSuperAdmin) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/superadmin/:path*",
    "/api/venues/:path*",
    "/api/superadmin/:path*",
    "/api/user/:path*",
    "/api/upload/:path*",
  ],
};

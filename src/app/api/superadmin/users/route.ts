import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const plan = searchParams.get("plan") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    // Hide staff-only users (waiters) — show owners and standalone users only
    OR: [
      { venues: { some: {} } },           // has own venues = owner
      { staffRoles: { none: {} } },        // no staff roles = registered user (not waiter)
    ],
  };
  if (search) {
    where.AND = [
      {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }
  if (plan && plan !== "ALL") {
    where.plan = plan;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        planExpiresAt: true,
        trialEndsAt: true,
        isSuperAdmin: true,
        emailVerified: true,
        createdAt: true,
        _count: {
          select: {
            venues: true,
            staffRoles: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total });
}

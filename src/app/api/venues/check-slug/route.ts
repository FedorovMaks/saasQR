import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const excludeId = searchParams.get("excludeId");

  if (!slug) {
    return NextResponse.json({ available: false });
  }

  const existing = await prisma.venue.findUnique({
    where: { slug },
    select: { id: true },
  });

  const available = !existing || existing.id === excludeId;

  return NextResponse.json({ available });
}

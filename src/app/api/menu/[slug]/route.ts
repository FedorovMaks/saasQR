import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const venue = await prisma.venue.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      address: true,
      logoUrl: true,
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          sortOrder: true,
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              imageUrl: true,
              isStopped: true,
              variants: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  label: true,
                  price: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!venue || !venue) {
    return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
  }

  return NextResponse.json(venue);
}

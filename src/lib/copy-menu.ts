import { prisma } from "./prisma";

/**
 * Скопировать всё меню (категории → позиции → варианты) из одного заведения
 * в другое. Оба заведения должны принадлежать ownerId — иначе бросает ошибку.
 * Возвращает количество скопированных категорий и позиций.
 */
export async function copyMenu(
  sourceVenueId: string,
  targetVenueId: string,
  ownerId: string
): Promise<{ categories: number; items: number }> {
  if (sourceVenueId === targetVenueId) {
    throw new Error("Нельзя копировать меню в то же заведение");
  }

  // Проверка владельца обоих заведений
  const [source, target] = await Promise.all([
    prisma.venue.findFirst({
      where: { id: sourceVenueId, ownerId },
      select: { id: true },
    }),
    prisma.venue.findFirst({
      where: { id: targetVenueId, ownerId },
      select: { id: true },
    }),
  ]);

  if (!source || !target) {
    throw new Error("Заведение не найдено или доступ запрещён");
  }

  const categories = await prisma.category.findMany({
    where: { venueId: sourceVenueId, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          variants: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  let itemCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const category of categories) {
      await tx.category.create({
        data: {
          venueId: targetVenueId,
          name: category.name,
          sortOrder: category.sortOrder,
          isActive: true,
          items: {
            create: category.items.map((item) => {
              itemCount++;
              return {
                name: item.name,
                description: item.description,
                price: item.price,
                imageUrl: item.imageUrl,
                isStopped: item.isStopped,
                sortOrder: item.sortOrder,
                isActive: true,
                calories: item.calories,
                proteins: item.proteins,
                fats: item.fats,
                carbs: item.carbs,
                composition: item.composition,
                variants: {
                  create: item.variants.map((v) => ({
                    label: v.label,
                    price: v.price,
                    sortOrder: v.sortOrder,
                  })),
                },
              };
            }),
          },
        },
      });
    }
  });

  return { categories: categories.length, items: itemCount };
}

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@tap-menu.ru" },
    update: {},
    create: {
      email: "demo@tap-menu.ru",
      name: "Демо Владелец",
      hashedPassword,
    },
  });

  const venue = await prisma.venue.upsert({
    where: { slug: "briiz" },
    update: {},
    create: {
      name: "Бриз Кофейня",
      slug: "briiz",
      description: "Уютная кофейня у моря",
      address: "ул. Набережная, 15",
      ownerId: user.id,
    },
  });

  const drinks = await prisma.category.create({
    data: {
      name: "Напитки",
      sortOrder: 0,
      venueId: venue.id,
    },
  });

  const food = await prisma.category.create({
    data: {
      name: "Еда",
      sortOrder: 1,
      venueId: venue.id,
    },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        name: "Капучино",
        description: "Классический капучино на свежем молоке",
        price: 25000,
        sortOrder: 0,
        categoryId: drinks.id,
      },
      {
        name: "Латте",
        description: "Нежный латте с ванильным сиропом",
        price: 28000,
        sortOrder: 1,
        categoryId: drinks.id,
      },
      {
        name: "Круассан",
        description: "Свежий масляный круассан",
        price: 18000,
        sortOrder: 0,
        categoryId: food.id,
      },
      {
        name: "Сэндвич с курицей",
        description: "На чиабатте с соусом песто",
        price: 35000,
        sortOrder: 1,
        categoryId: food.id,
      },
    ],
  });

  const latte = await prisma.menuItem.findFirst({
    where: { name: "Латте", categoryId: drinks.id },
  });

  if (latte) {
    await prisma.menuVariant.createMany({
      data: [
        { menuItemId: latte.id, label: "S (250мл)", price: 22000, sortOrder: 0 },
        { menuItemId: latte.id, label: "M (350мл)", price: 28000, sortOrder: 1 },
        { menuItemId: latte.id, label: "L (450мл)", price: 34000, sortOrder: 2 },
      ],
    });
  }

  console.log("Seed completed successfully");
  console.log(`  User: ${user.email} / password123`);
  console.log(`  Venue: ${venue.name} (/${venue.slug})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

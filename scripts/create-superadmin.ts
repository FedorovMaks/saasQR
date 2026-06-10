import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPERADMIN_EMAIL || "superadmin@tap-menu.ru";
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = "Super Admin";

  if (!password) {
    console.error(
      "Задайте SUPERADMIN_PASSWORD перед запуском, например:\n" +
        "  SUPERADMIN_PASSWORD='ваш-пароль' npx tsx scripts/create-superadmin.ts"
    );
    process.exit(1);
  }

  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { isSuperAdmin: true, hashedPassword, emailVerified: true },
    create: {
      email,
      hashedPassword,
      name,
      isSuperAdmin: true,
      emailVerified: true,
      plan: "PRO",
    },
  });

  console.log("Super admin created/updated:", user.id, user.email);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

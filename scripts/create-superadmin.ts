import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "superadmin@qrmenu.app";
  const password = "QrM3nu$uperAdm1n!";
  const name = "Super Admin";

  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { isSuperAdmin: true, hashedPassword },
    create: {
      email,
      hashedPassword,
      name,
      isSuperAdmin: true,
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

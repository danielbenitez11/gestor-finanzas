import "dotenv/config";
import { prisma } from "./src/lib/prisma";

async function main() {
  // El segundo se crea como admin y lo bajamos a usuario normal, para que la
  // contrasena quede cifrada igual que en el login.
  await prisma.user.updateMany({
    where: { email: "demo-normal@local.test" },
    data: { role: "user" },
  });

  const users = await prisma.user.findMany({
    where: { email: { endsWith: "@local.test" } },
    select: { email: true, name: true, role: true, banned: true },
  });
  console.log("Usuarios de prueba:");
  for (const u of users) console.log(`  ${u.email}  |  ${u.name}  |  rol: ${u.role}`);
}

main().finally(() => prisma.$disconnect());

import "dotenv/config";
import { prisma } from "./src/lib/prisma";

/**
 * Borra SOLO los usuarios de prueba (los de dominio @local.test) creados
 * durante el desarrollo de la Fase 5. Tu cuenta admin@admin.com no entra en
 * el filtro y no se toca.
 */
async function main() {
  const aBorrar = await prisma.user.findMany({
    where: { email: { endsWith: "@local.test" } },
    select: { email: true, name: true, _count: { select: { transactions: true } } },
  });

  console.log("Se van a borrar estos usuarios de prueba:");
  for (const u of aBorrar) {
    console.log(`  ${u.email}  (${u.name}) · ${u._count.transactions} movimientos`);
  }
  if (aBorrar.length === 0) console.log("  (ninguno)");

  const { count } = await prisma.user.deleteMany({
    where: { email: { endsWith: "@local.test" } },
  });
  console.log(`\nBorrados: ${count}`);

  console.log("\n=== Usuarios que quedan ===");
  const quedan = await prisma.user.findMany({
    select: { email: true, name: true, role: true, _count: { select: { transactions: true } } },
  });
  for (const u of quedan) {
    console.log(`  ${u.email}  |  ${u.name}  |  ${u.role}  |  ${u._count.transactions} movimientos`);
  }
}

main().finally(() => prisma.$disconnect());

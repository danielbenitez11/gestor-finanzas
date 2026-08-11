import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 exige un "driver adapter": el módulo concreto que sabe hablar con
// nuestra base de datos. Aquí es SQLite, un simple fichero en el disco.
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

// En desarrollo Next.js recarga los módulos en cada cambio. Sin este truco se
// crearía un PrismaClient nuevo en cada recarga hasta agotar las conexiones,
// así que lo guardamos en el objeto global y lo reutilizamos.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

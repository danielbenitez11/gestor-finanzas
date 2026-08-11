import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Conexión a la base de datos.
 *
 * Prisma 7 exige un "driver adapter": el módulo concreto que sabe hablar con
 * la base de datos. Aquí hay dos, y se elige solo según el entorno:
 *
 *   · En tu ordenador     -> fichero SQLite en prisma/dev.db
 *   · En producción       -> Turso (el mismo SQLite, pero alojado)
 *
 * El dialecto es el mismo en los dos casos, así que el esquema, las consultas
 * y las migraciones no cambian: lo único que cambia es por dónde se conecta.
 */
function crearAdaptador() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;

  if (tursoUrl) {
    return new PrismaLibSql({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  return new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
}

// En desarrollo Next.js recarga los módulos en cada cambio. Sin este truco se
// crearía un PrismaClient nuevo en cada recarga hasta agotar las conexiones,
// así que lo guardamos en el objeto global y lo reutilizamos.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: crearAdaptador() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

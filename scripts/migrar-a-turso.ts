/**
 * Copia tu base de datos local (prisma/dev.db) a Turso: primero crea las tablas
 * y después traslada todas las filas.
 *
 *   $env:TURSO_DATABASE_URL="libsql://gastos-xxxx.turso.io"
 *   $env:TURSO_AUTH_TOKEN="tu-token"
 *   npm run migrar-a-turso
 *
 * Existe porque la CLI de Turso no tiene instalador para Windows: haría falta
 * WSL solo para lanzar `turso db import`. Aquí se hace lo mismo desde Node, que
 * ya está instalado, hablando con Turso por HTTP.
 *
 * Con `--solo-esquema` crea las tablas vacías y no copia nada, por si prefieres
 * empezar de cero en producción.
 */
import "dotenv/config";

import { execFileSync } from "node:child_process";

import { createClient } from "@libsql/client";
import Database from "better-sqlite3";

/** La base de datos de origen, la misma que usa la aplicación en tu ordenador. */
const FICHERO_LOCAL = (process.env.DATABASE_URL ?? "file:./prisma/dev.db").replace(
  /^file:/,
  "",
);

/** Tablas internas que no forman parte del esquema de la aplicación. */
const IGNORADAS = new Set(["_prisma_migrations", "sqlite_sequence"]);

/**
 * El SQL que crea todas las tablas, generado por Prisma a partir del esquema.
 * Es el mismo que imprime `npm run db:sql`.
 */
function sqlDelEsquema(): string {
  return execFileSync(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema",
      "prisma/schema.prisma",
      "--script",
    ],
    { encoding: "utf8", shell: true },
  );
}

/**
 * Parte el volcado SQL en sentencias sueltas. Turso ejecuta una por llamada,
 * así que no vale con mandar el fichero entero.
 */
function separarSentencias(sql: string): string[] {
  const sentencias: string[] = [];
  let actual = "";

  for (const linea of sql.split("\n")) {
    if (linea.trim().startsWith("--") || linea.trim() === "") continue;
    actual += linea + "\n";
    if (linea.trimEnd().endsWith(";")) {
      sentencias.push(actual.trim());
      actual = "";
    }
  }

  if (actual.trim()) sentencias.push(actual.trim());
  return sentencias;
}

/** Las claves foráneas de una tabla: qué columna apunta a qué tabla. */
function clavesForaneas(db: Database.Database, tabla: string) {
  return db.prepare(`PRAGMA foreign_key_list("${tabla}")`).all() as Array<{
    table: string;
    from: string;
  }>;
}

/** Las columnas que forman la clave primaria de una tabla. */
function clavePrimaria(db: Database.Database, tabla: string): string[] {
  const columnas = db.prepare(`PRAGMA table_info("${tabla}")`).all() as Array<{
    name: string;
    pk: number;
  }>;
  return columnas.filter((c) => c.pk > 0).map((c) => c.name);
}

/**
 * Ordena las tablas de forma que ninguna se copie antes que aquellas a las que
 * apunta. Si se insertaran los movimientos antes que los usuarios, cada fila
 * chocaría contra su clave foránea: el `userId` señalaría a un usuario que
 * todavía no existe.
 */
function ordenarPorDependencias(db: Database.Database, tablas: string[]): string[] {
  const dependencias = new Map<string, string[]>();

  for (const tabla of tablas) {
    dependencias.set(
      tabla,
      // Una tabla puede apuntarse a sí misma; eso no impone ningún orden.
      [...new Set(clavesForaneas(db, tabla).map((r) => r.table))].filter(
        (t) => t !== tabla && tablas.includes(t),
      ),
    );
  }

  const ordenadas: string[] = [];
  const visitando = new Set<string>();

  function visitar(tabla: string) {
    if (ordenadas.includes(tabla)) return;
    // Un ciclo entre tablas no se puede ordenar. No lo hay en este esquema,
    // pero si algún día lo hubiera, mejor seguir que quedarse en bucle.
    if (visitando.has(tabla)) return;

    visitando.add(tabla);
    for (const dependencia of dependencias.get(tabla) ?? []) visitar(dependencia);
    visitando.delete(tabla);

    ordenadas.push(tabla);
  }

  for (const tabla of tablas) visitar(tabla);
  return ordenadas;
}

/** Adapta un valor de better-sqlite3 a lo que acepta el cliente de Turso. */
function valorParaTurso(valor: unknown) {
  if (Buffer.isBuffer(valor)) return new Uint8Array(valor);
  return valor as string | number | bigint | null;
}

async function main() {
  const soloEsquema = process.argv.includes("--solo-esquema");

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error(
      "\nFaltan las credenciales de Turso. En PowerShell:\n\n" +
        '  $env:TURSO_DATABASE_URL="libsql://gastos-xxxx.turso.io"\n' +
        '  $env:TURSO_AUTH_TOKEN="tu-token"\n\n' +
        "Las dos aparecen en el panel de la base de datos en turso.tech.\n",
    );
    process.exit(1);
  }

  const turso = createClient({ url, authToken });

  // Crear tablas sobre una base que ya tiene datos mezclaría dos esquemas y
  // duplicaría filas. Si hay algo, que lo borre quien sabe lo que hay.
  const yaExiste = await turso.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%'",
  );

  if (yaExiste.rows.length > 0) {
    console.error(
      `\nLa base de datos de Turso ya tiene ${yaExiste.rows.length} tablas:\n` +
        `  ${yaExiste.rows.map((f) => f.name).join(", ")}\n\n` +
        "Este script solo sabe llenar una base vacía. Si quieres rehacerla,\n" +
        "bórrala desde el panel de turso.tech, crea otra y vuelve a ejecutarlo.\n",
    );
    process.exit(1);
  }

  console.log(`\nConectado a ${url}\n`);

  // --- 1. El esquema ---
  const sentencias = separarSentencias(sqlDelEsquema());
  console.log(`Creando el esquema (${sentencias.length} sentencias)...`);
  await turso.batch(sentencias, "write");

  if (soloEsquema) {
    console.log("\nEsquema creado. No se ha copiado ningún dato (--solo-esquema).\n");
    return;
  }

  // --- 2. Los datos ---
  const local = new Database(FICHERO_LOCAL, { readonly: true });

  const tablas = (
    local
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as Array<{ name: string }>
  )
    .map((f) => f.name)
    .filter((nombre) => !IGNORADAS.has(nombre));

  console.log("\nCopiando datos:\n");

  const orden = ordenarPorDependencias(local, tablas);
  const copiadas = new Set<string>();

  /**
   * Columnas que hubo que dejar en blanco al insertar, por tabla.
   *
   * `transaction` y `debt` se apuntan la una a la otra: un gasto puede haber
   * generado una deuda, y el cobro de esa deuda es otro gasto. Con ese círculo
   * no existe ningún orden que contente a las dos, así que la referencia que
   * mira "hacia atrás" se deja a null y se rellena al final, cuando ya está
   * todo dentro. Turso comprueba las claves foráneas de verdad (SQLite de
   * fichero, por defecto, no), y sin esto la copia fallaría.
   */
  const pendientes = new Map<string, string[]>();

  let total = 0;

  for (const tabla of orden) {
    const filas = local.prepare(`SELECT * FROM "${tabla}"`).all() as Array<
      Record<string, unknown>
    >;

    copiadas.add(tabla);

    if (filas.length === 0) {
      console.log(`  ${tabla.padEnd(20)} vacía`);
      continue;
    }

    const diferidas = [
      ...new Set(
        clavesForaneas(local, tabla)
          .filter((fk) => !copiadas.has(fk.table) || fk.table === tabla)
          .map((fk) => fk.from),
      ),
    ];

    if (diferidas.some((columna) => filas.some((f) => f[columna] !== null))) {
      pendientes.set(tabla, diferidas);
    }

    const columnas = Object.keys(filas[0]);
    const sql =
      `INSERT INTO "${tabla}" (${columnas.map((c) => `"${c}"`).join(", ")}) ` +
      `VALUES (${columnas.map(() => "?").join(", ")})`;

    // En lotes: una sola llamada con miles de filas agota la petición HTTP.
    const TAMANO_LOTE = 100;
    for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
      await turso.batch(
        filas.slice(i, i + TAMANO_LOTE).map((fila) => ({
          sql,
          args: columnas.map((columna) =>
            diferidas.includes(columna) ? null : valorParaTurso(fila[columna]),
          ),
        })),
        "write",
      );
    }

    const aviso = pendientes.has(tabla) ? "  (referencias cruzadas aparte)" : "";
    console.log(`  ${tabla.padEnd(20)} ${filas.length} filas${aviso}`);
    total += filas.length;
  }

  // Segunda pasada: las referencias que quedaron en blanco.
  for (const [tabla, columnas] of pendientes) {
    const pk = clavePrimaria(local, tabla);
    const condicion = pk.map((c) => `"${c}" = ?`).join(" AND ");

    for (const columna of columnas) {
      const filas = local
        .prepare(
          `SELECT "${columna}", ${pk.map((c) => `"${c}"`).join(", ")} ` +
            `FROM "${tabla}" WHERE "${columna}" IS NOT NULL`,
        )
        .all() as Array<Record<string, unknown>>;

      if (filas.length === 0) continue;

      await turso.batch(
        filas.map((fila) => ({
          sql: `UPDATE "${tabla}" SET "${columna}" = ? WHERE ${condicion}`,
          args: [
            valorParaTurso(fila[columna]),
            ...pk.map((c) => valorParaTurso(fila[c])),
          ],
        })),
        "write",
      );

      console.log(`  ${`${tabla}.${columna}`.padEnd(20)} ${filas.length} enlazadas`);
    }
  }

  local.close();
  console.log(`\nListo: ${total} filas copiadas a Turso.\n`);
}

main().catch((error) => {
  console.error("\nLa migración ha fallado:", error);
  process.exit(1);
});

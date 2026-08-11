import { prisma } from "@/lib/prisma";

export type MonthPoint = {
  /** Clave estable "2026-08", útil como key de React. */
  key: string;
  /** Etiqueta corta para el eje: "ago". */
  label: string;
  /** Etiqueta completa para el tooltip: "agosto de 2026". */
  labelLargo: string;
  ingresosCents: number;
  /** Siempre positivo, para que la barra crezca hacia arriba. */
  gastosCents: number;
  /** Saldo acumulado al cierre de ese mes. */
  saldoCents: number;
};

const MESES_VENTANA = 6;

const etiquetaCorta = new Intl.DateTimeFormat("es-ES", { month: "short" });
const etiquetaLarga = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});

/**
 * Devuelve los últimos seis meses con sus ingresos, gastos y saldo acumulado.
 *
 * No se traen todos los movimientos del usuario: solo los de la ventana, más
 * una única suma con todo lo anterior para saber de qué saldo se parte. Así el
 * coste no crece según se acumulan años de historial.
 */
export async function getMonthlySeries(userId: string): Promise<MonthPoint[]> {
  const hoy = new Date();
  const inicioVentana = new Date(
    hoy.getFullYear(),
    hoy.getMonth() - (MESES_VENTANA - 1),
    1,
  );

  const [anteriores, movimientos] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, date: { lt: inicioVentana } },
      _sum: { amountCents: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: inicioVentana } },
      select: { type: true, amountCents: true, date: true },
      orderBy: { date: "asc" },
    }),
  ]);

  // Creamos los seis meses vacíos para que un mes sin movimientos aparezca
  // igualmente en el gráfico, con un cero, en lugar de desaparecer del eje.
  const meses = new Map<string, MonthPoint>();
  for (let i = 0; i < MESES_VENTANA; i++) {
    const fecha = new Date(
      hoy.getFullYear(),
      hoy.getMonth() - (MESES_VENTANA - 1) + i,
      1,
    );
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    meses.set(key, {
      key,
      label: etiquetaCorta.format(fecha).replace(".", ""),
      labelLargo: etiquetaLarga.format(fecha),
      ingresosCents: 0,
      gastosCents: 0,
      saldoCents: 0,
    });
  }

  for (const m of movimientos) {
    const key = `${m.date.getFullYear()}-${String(m.date.getMonth() + 1).padStart(2, "0")}`;
    const punto = meses.get(key);
    if (!punto) continue;

    if (m.type === "INCOME") punto.ingresosCents += m.amountCents;
    if (m.type === "EXPENSE") punto.gastosCents += Math.abs(m.amountCents);
  }

  // El saldo se arrastra mes a mes partiendo de lo acumulado antes de la
  // ventana. Aquí sí entran los ajustes: mueven el saldo aunque no sean ni
  // ingreso ni gasto del mes.
  const porMes = new Map<string, number>();
  for (const m of movimientos) {
    const key = `${m.date.getFullYear()}-${String(m.date.getMonth() + 1).padStart(2, "0")}`;
    porMes.set(key, (porMes.get(key) ?? 0) + m.amountCents);
  }

  let acumulado = anteriores._sum.amountCents ?? 0;
  for (const punto of meses.values()) {
    acumulado += porMes.get(punto.key) ?? 0;
    punto.saldoCents = acumulado;
  }

  return [...meses.values()];
}

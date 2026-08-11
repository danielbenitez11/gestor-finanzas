import { prisma } from "@/lib/prisma";
import { cobrosHasta, esIngreso } from "@/lib/recurring";

/**
 * Crea los movimientos que faltan por todas las reglas activas del usuario.
 *
 * Es idempotente: consulta qué mensualidades existen ya y solo inserta las que
 * faltan. Aun así, si dos peticiones coincidieran en el tiempo, la restricción
 * de unicidad de la base de datos es la que garantiza de verdad que no haya
 * cobros duplicados; por eso se ignora el error P2002.
 *
 * Devuelve cuántos movimientos se han creado.
 */
export async function generarCobrosPendientes(userId: string): Promise<number> {
  const reglas = await prisma.recurringRule.findMany({
    where: { userId, active: true },
    include: { charges: { select: { periodKey: true } } },
  });

  let creados = 0;

  for (const regla of reglas) {
    const yaCobrados = new Set(
      regla.charges.map((c) => c.periodKey).filter((k): k is string => k !== null),
    );

    const previstos = cobrosHasta(
      regla.startDate,
      regla.dayOfMonth,
      regla.totalInstallments,
    );

    const pendientes = previstos.filter((c) => !yaCobrados.has(c.periodKey));

    for (const cobro of pendientes) {
      const etiquetaCuota =
        regla.totalInstallments !== null
          ? ` (${cobro.numeroCuota}/${regla.totalInstallments})`
          : "";

      // El tipo y el signo salen de la clase de regla: un salario entra, una
      // suscripción o una cuota salen. El importe se guarda siempre positivo en
      // la regla; el signo se decide aquí, como en el resto de la aplicación.
      const entra = esIngreso(regla.kind);

      try {
        await prisma.transaction.create({
          data: {
            userId,
            type: entra ? "INCOME" : "EXPENSE",
            amountCents: entra
              ? Math.abs(regla.amountCents)
              : -Math.abs(regla.amountCents),
            description: `${regla.name}${etiquetaCuota}`,
            date: cobro.fecha,
            recurringId: regla.id,
            periodKey: cobro.periodKey,
          },
        });
        creados++;
      } catch (error) {
        // P2002 = violación de unicidad: otra petición se nos adelantó con esta
        // misma mensualidad. Es exactamente lo que queremos que pase.
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          continue;
        }
        throw error;
      }
    }

    // Una financiación se apaga sola cuando ya se han generado todas sus cuotas.
    if (
      regla.totalInstallments !== null &&
      yaCobrados.size + pendientes.length >= regla.totalInstallments
    ) {
      await prisma.recurringRule.update({
        where: { id: regla.id },
        data: { active: false },
      });
    }
  }

  return creados;
}

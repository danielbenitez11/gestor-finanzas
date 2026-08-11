/**
 * Cálculos puros de suscripciones y financiaciones.
 *
 * Este archivo NO importa Prisma a propósito: lo usa también el formulario del
 * navegador para calcular la cuota mientras escribes. Si importara la base de
 * datos, esta acabaría empaquetada en el JavaScript que se descarga el cliente.
 * La parte que toca la base de datos vive en recurring-generate.ts.
 */

export const RECURRING_KINDS = ["SUBSCRIPTION", "LOAN", "INCOME"] as const;
export type RecurringKind = (typeof RECURRING_KINDS)[number];

export const RECURRING_LABELS: Record<RecurringKind, string> = {
  SUBSCRIPTION: "Suscripción",
  LOAN: "Financiación",
  INCOME: "Ingreso",
};

/** Las suscripciones y las financiaciones restan; el salario suma. */
export function esIngreso(kind: string): boolean {
  return kind === "INCOME";
}

/** Solo las financiaciones tienen un número fijo de cuotas y por tanto un final. */
export function tieneCuotas(kind: string): boolean {
  return kind === "LOAN";
}

export function isRecurringKind(value: unknown): value is RecurringKind {
  return RECURRING_KINDS.includes(value as RecurringKind);
}

/** Tope de seguridad: nunca generamos más cobros atrasados que estos de una vez. */
export const MAX_COBROS_ATRASADOS = 120;

/**
 * Fecha de cobro dentro de un mes concreto.
 *
 * `new Date(año, mes + 1, 0)` da el último día de ese mes (el día 0 del mes
 * siguiente es el último del actual). Así, si pides el 31 en febrero, cobras
 * el 28 —o el 29 en bisiesto— en vez de irte al 3 de marzo, que es lo que haría
 * JavaScript por su cuenta.
 */
export function fechaDeCobro(anio: number, mes: number, dia: number): Date {
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  return new Date(anio, mes, Math.min(dia, ultimoDia));
}

/** Clave del periodo: "2026-08". Es lo que impide cobrar dos veces el mismo mes. */
export function clavePeriodo(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Cuota mensual de un préstamo (sistema francés, el habitual en España).
 *
 *            i
 *   c = P · ─────────────
 *           1 − (1+i)^−n
 *
 * donde i es el interés MENSUAL e n el número de cuotas. Sin intereses la
 * fórmula se indetermina (0/0), así que ese caso se resuelve dividiendo.
 *
 * @param principalCents importe financiado, en céntimos
 * @param meses número de cuotas
 * @param tinBp TIN anual en puntos básicos (5,25 % -> 525)
 */
export function calcularCuota(
  principalCents: number,
  meses: number,
  tinBp: number,
): number {
  if (meses <= 0) return 0;
  if (tinBp <= 0) return Math.round(principalCents / meses);

  const interesMensual = tinBp / 10_000 / 12;
  const factor =
    interesMensual / (1 - Math.pow(1 + interesMensual, -meses));

  return Math.round(principalCents * factor);
}

export type CobroPrevisto = {
  periodKey: string;
  fecha: Date;
  /** 1, 2, 3... Solo tiene sentido en financiaciones. */
  numeroCuota: number;
};

/**
 * Lista los cobros que ya deberían haberse producido desde `startDate` hasta
 * `hasta` (hoy, normalmente). No consulta la base de datos: es solo el
 * calendario teórico de la regla.
 */
export function cobrosHasta(
  startDate: Date,
  dayOfMonth: number,
  totalInstallments: number | null,
  hasta: Date = new Date(),
): CobroPrevisto[] {
  const cobros: CobroPrevisto[] = [];

  // El final del día para que el cobro de hoy mismo cuente.
  const limite = new Date(hasta);
  limite.setHours(23, 59, 59, 999);

  let anio = startDate.getFullYear();
  let mes = startDate.getMonth();

  for (let i = 0; i < MAX_COBROS_ATRASADOS; i++) {
    if (totalInstallments !== null && cobros.length >= totalInstallments) break;

    const fecha = fechaDeCobro(anio, mes, dayOfMonth);
    if (fecha > limite) break;

    cobros.push({
      periodKey: clavePeriodo(fecha),
      fecha,
      numeroCuota: cobros.length + 1,
    });

    mes++;
    if (mes > 11) {
      mes = 0;
      anio++;
    }
  }

  return cobros;
}

/**
 * Crea los movimientos que faltan por todas las reglas activas del usuario.
 *
 * Es idempotente: consulta qué mensualidades existen ya y solo inserta las que
 * faltan. Vive en recurring-generate.ts porque necesita la base de datos.
 */

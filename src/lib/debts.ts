/**
 * Constantes de deudas. Sin Prisma, para que también las pueda usar el
 * navegador.
 */

export const DEBT_DIRECTIONS = ["OWED_TO_ME", "I_OWE"] as const;
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

export const DEBT_LABELS: Record<DebtDirection, string> = {
  OWED_TO_ME: "Me deben",
  I_OWE: "Debo",
};

/** Cómo se lee en una ficha concreta: "Marta te debe" / "le debes a Luis". */
export const DEBT_VERBS: Record<DebtDirection, string> = {
  OWED_TO_ME: "te debe",
  I_OWE: "le debes",
};

export function isDebtDirection(value: unknown): value is DebtDirection {
  return DEBT_DIRECTIONS.includes(value as DebtDirection);
}

/** Lo que falta por cobrar o pagar. Nunca negativo. */
export function pendiente(amountCents: number, settledCents: number): number {
  return Math.max(0, amountCents - settledCents);
}

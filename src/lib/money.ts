/** Los tres tipos de movimiento. `as const` hace que TypeScript los trate como
 *  valores literales y no como texto cualquiera, así un typo se detecta al compilar. */
export const TRANSACTION_TYPES = ["INCOME", "EXPENSE", "ADJUSTMENT"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  INCOME: "Ingreso",
  EXPENSE: "Gasto",
  ADJUSTMENT: "Ajuste de saldo",
};

export function isTransactionType(value: unknown): value is TransactionType {
  return TRANSACTION_TYPES.includes(value as TransactionType);
}

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

/** 2550 -> "25,50 €" */
export function formatCents(cents: number): string {
  return euroFormatter.format(cents / 100);
}

/**
 * Convierte lo que el usuario escribe ("25,50", "25.50", "1.234,56") a céntimos.
 * Devuelve null si el texto no es un importe válido.
 *
 * Trabaja con las cifras como enteros en lugar de multiplicar por 100 un decimal,
 * porque en coma flotante 25,50 no se representa de forma exacta.
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[\s€]/g, "");
  if (cleaned === "") return null;

  // Si hay coma, es el separador decimal español y los puntos son de millares.
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;

  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const negative = normalized.startsWith("-");
  const [whole, fraction = ""] = normalized.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  return negative ? -cents : cents;
}

/**
 * Pasa de (tipo, importe positivo que escribe el usuario) al entero con signo
 * que guardamos: los gastos se almacenan en negativo para que el saldo sea
 * simplemente la suma de todos los movimientos.
 */
export function toSignedCents(type: TransactionType, cents: number): number {
  if (type === "EXPENSE") return -Math.abs(cents);
  if (type === "INCOME") return Math.abs(cents);
  return cents; // ADJUSTMENT admite los dos signos
}

"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAmountToCents } from "@/lib/money";
import {
  calcularCuota,
  cobrosHasta,
  isRecurringKind,
  MAX_COBROS_ATRASADOS,
} from "@/lib/recurring";
import { generarCobrosPendientes } from "@/lib/recurring-generate";

export type RecurringFormState = {
  error?: string;
  ok?: boolean;
  /** Cambia en cada creación correcta, para que el formulario sepa vaciarse. */
  resetId?: string;
  /** Cuando hay cobros atrasados, pedimos confirmación antes de crearlos. */
  confirmar?: {
    cuantos: number;
    totalCents: number;
    desde: string;
  };
};

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session.user;
}

const MAX_NOMBRE = 60;
const MAX_CUOTAS = 600; // 50 años, tope de cordura

export async function createRecurringRule(
  _prev: RecurringFormState,
  formData: FormData,
): Promise<RecurringFormState> {
  const user = await requireUser();

  const kind = formData.get("kind");
  if (!isRecurringKind(kind)) {
    return { error: "Tipo no válido." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Ponle un nombre." };
  if (name.length > MAX_NOMBRE) {
    return { error: `El nombre no puede pasar de ${MAX_NOMBRE} caracteres.` };
  }

  const startRaw = String(formData.get("startDate") ?? "");
  const startDate = startRaw ? new Date(`${startRaw}T00:00:00`) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) {
    return { error: "La fecha del primer cobro no es válida." };
  }

  // El día del mes sale de la propia fecha del primer cobro: si eliges el 3 de
  // septiembre, se cobra el 3 de cada mes. Un dato menos que rellenar.
  const dayOfMonth = startDate.getDate();

  let amountCents: number;
  let totalInstallments: number | null = null;
  let principalCents: number | null = null;
  let annualRateBp: number | null = null;

  // Las suscripciones y los ingresos comparten formulario: un solo importe que
  // se repite cada mes. Solo la financiación necesita cálculo.
  if (kind === "SUBSCRIPTION" || kind === "INCOME") {
    const importe = parseAmountToCents(String(formData.get("amount") ?? ""));
    if (importe === null || importe <= 0) {
      return { error: "El importe no es válido. Escríbelo así: 13,99" };
    }
    amountCents = importe;
  } else {
    const total = parseAmountToCents(String(formData.get("principal") ?? ""));
    if (total === null || total <= 0) {
      return { error: "El importe total no es válido." };
    }

    const cuotas = Number(formData.get("installments"));
    if (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > MAX_CUOTAS) {
      return { error: `El número de cuotas debe estar entre 1 y ${MAX_CUOTAS}.` };
    }

    // El TIN llega como "5,25" y se guarda como 525 puntos básicos.
    const tinTexto = String(formData.get("rate") ?? "").trim();
    const tinBp = tinTexto ? parseAmountToCents(tinTexto) : 0;
    if (tinBp === null || tinBp < 0) {
      return { error: "El interés no es válido. Escríbelo así: 5,25" };
    }

    // Si el usuario ajustó la cuota a mano, mandamos la suya; si no, la calculada.
    const cuotaManual = parseAmountToCents(String(formData.get("payment") ?? ""));
    const cuotaCalculada = calcularCuota(total, cuotas, tinBp);
    const cuota = cuotaManual !== null && cuotaManual > 0 ? cuotaManual : cuotaCalculada;

    if (cuota <= 0) {
      return { error: "No se ha podido calcular la cuota. Revisa los datos." };
    }

    amountCents = cuota;
    totalInstallments = cuotas;
    principalCents = total;
    annualRateBp = tinBp;
  }

  // ¿Cuántos cobros se crearían de golpe por tener fecha pasada?
  const previstos = cobrosHasta(startDate, dayOfMonth, totalInstallments);

  if (previstos.length >= MAX_COBROS_ATRASADOS) {
    return {
      error:
        `Esa fecha generaría más de ${MAX_COBROS_ATRASADOS} cobros. ` +
        "Revisa el año por si te has equivocado al teclear.",
    };
  }

  const confirmado = formData.get("confirmado") === "1";

  if (previstos.length > 1 && !confirmado) {
    const desde = previstos[0].fecha;
    return {
      confirmar: {
        cuantos: previstos.length,
        totalCents: previstos.length * amountCents,
        desde: desde.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
      },
    };
  }

  await prisma.recurringRule.create({
    data: {
      userId: user.id,
      kind,
      name,
      amountCents,
      dayOfMonth,
      startDate,
      totalInstallments,
      principalCents,
      annualRateBp,
    },
  });

  // Genera ya los cobros que tocaban, incluidos los atrasados.
  await generarCobrosPendientes(user.id);

  revalidatePath("/automaticos");
  revalidatePath("/");
  return { ok: true, resetId: crypto.randomUUID() };
}

/** Deja de generar cobros, pero conserva el histórico de lo ya pagado. */
export async function cancelRecurringRule(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Filtramos también por userId para que nadie cancele reglas ajenas.
  await prisma.recurringRule.updateMany({
    where: { id, userId: user.id },
    data: { active: false, cancelledAt: new Date() },
  });

  revalidatePath("/automaticos");
  revalidatePath("/");
}

/** Vuelve a activarla y genera lo que se haya perdido mientras estuvo parada. */
export async function resumeRecurringRule(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.recurringRule.updateMany({
    where: { id, userId: user.id },
    data: { active: true, cancelledAt: null },
  });

  await generarCobrosPendientes(user.id);

  revalidatePath("/automaticos");
  revalidatePath("/");
}

/**
 * Borra la regla. Los movimientos ya cobrados NO se borran: la relación está
 * declarada con onDelete: SetNull, así que se quedan en el histórico como
 * movimientos normales.
 */
export async function deleteRecurringRule(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.recurringRule.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/automaticos");
  revalidatePath("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAmountToCents } from "@/lib/money";
import { isDebtDirection, pendiente } from "@/lib/debts";

export type DebtFormState = {
  error?: string;
  ok?: boolean;
  resetId?: string;
};

const MAX_TEXTO = 60;
const MAX_CENTS = 100_000_000_00;

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session.user;
}

export async function createDebt(
  _prev: DebtFormState,
  formData: FormData,
): Promise<DebtFormState> {
  const user = await requireUser();

  const direction = formData.get("direction");
  if (!isDebtDirection(direction)) return { error: "Dirección no válida." };

  const person = String(formData.get("person") ?? "").trim();
  if (!person) return { error: "¿Quién? Escribe un nombre." };
  if (person.length > MAX_TEXTO) {
    return { error: `El nombre no puede pasar de ${MAX_TEXTO} caracteres.` };
  }

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "Escribe de qué es." };
  if (description.length > MAX_TEXTO) {
    return { error: `El concepto no puede pasar de ${MAX_TEXTO} caracteres.` };
  }

  const amountCents = parseAmountToCents(String(formData.get("amount") ?? ""));
  if (amountCents === null || amountCents <= 0) {
    return { error: "El importe no es válido. Escríbelo así: 16,00" };
  }
  if (amountCents > MAX_CENTS) {
    return { error: "El importe es demasiado grande. ¿Te has equivocado?" };
  }

  const dateRaw = String(formData.get("date") ?? "");
  const date = dateRaw ? new Date(`${dateRaw}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "La fecha no es válida." };

  await prisma.debt.create({
    data: { userId: user.id, direction, person, description, amountCents, date },
  });

  revalidatePath("/deudas");
  revalidatePath("/");
  return { ok: true, resetId: crypto.randomUUID() };
}

/**
 * Registra un cobro (o un pago) parcial o total.
 *
 * Este es el único punto donde una deuda toca el saldo: crea un movimiento real
 * por lo que ha cambiado de manos, ni un céntimo más. Lo que sigue pendiente
 * sigue sin contar.
 */
export async function settleDebt(
  _prev: DebtFormState,
  formData: FormData,
): Promise<DebtFormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "");
  const deuda = await prisma.debt.findFirst({ where: { id, userId: user.id } });
  if (!deuda) return { error: "Esa deuda no existe." };

  const queda = pendiente(deuda.amountCents, deuda.settledCents);
  if (queda === 0) return { error: "Esta deuda ya está saldada." };

  // Sin importe se entiende que se salda entera.
  const textoImporte = String(formData.get("amount") ?? "").trim();
  const importe = textoImporte ? parseAmountToCents(textoImporte) : queda;

  if (importe === null || importe <= 0) {
    return { error: "El importe no es válido." };
  }
  if (importe > queda) {
    return { error: "No puedes registrar más de lo que queda pendiente." };
  }

  const meDeben = deuda.direction === "OWED_TO_ME";

  // Las dos escrituras van juntas o no van: si se creara el movimiento pero
  // fallara la actualización de la deuda, el dinero aparecería dos veces.
  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: user.id,
        type: meDeben ? "INCOME" : "EXPENSE",
        amountCents: meDeben ? importe : -importe,
        description: meDeben
          ? `Cobro de ${deuda.person} · ${deuda.description}`
          : `Pago a ${deuda.person} · ${deuda.description}`,
        date: new Date(),
        debtId: deuda.id,
      },
    }),
    prisma.debt.update({
      where: { id: deuda.id },
      data: { settledCents: deuda.settledCents + importe },
    }),
  ]);

  revalidatePath("/deudas");
  revalidatePath("/");
  return { ok: true, resetId: crypto.randomUUID() };
}

/**
 * Borra la deuda. Los movimientos de cobro ya registrados NO se borran: ese
 * dinero cambió de manos de verdad y debe seguir en el saldo. Solo desaparece
 * la anotación de lo pendiente.
 */
export async function deleteDebt(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.debt.deleteMany({ where: { id, userId: user.id } });

  revalidatePath("/deudas");
  revalidatePath("/");
}

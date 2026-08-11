"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isTransactionType,
  parseAmountToCents,
  toSignedCents,
} from "@/lib/money";

/**
 * "use server" arriba del todo convierte cada función exportada de este archivo
 * en una Server Action: el navegador puede invocarla desde un formulario, pero
 * el código se ejecuta SIEMPRE en el servidor y nunca se envía al cliente.
 *
 * Consecuencia importante: cualquiera puede llamar a estas funciones con los
 * datos que quiera. Por eso cada una vuelve a comprobar la sesión y filtra por
 * el usuario de la sesión, nunca por un id que venga del formulario.
 */

export type FormState = {
  error?: string;
  ok?: boolean;
  /** Cambia en cada guardado correcto. El formulario lo usa para saber que debe
   *  vaciarse: dos guardados seguidos generan tokens distintos, así que también
   *  se vacía la segunda vez. */
  resetId?: string;
};

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session.user;
}

const MAX_DESCRIPTION = 100;
/** Un billón de céntimos: tope de cordura para detectar errores de tecleo. */
const MAX_CENTS = 100_000_000_00;

export async function createTransaction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const type = formData.get("type");
  if (!isTransactionType(type)) {
    return { error: "Tipo de movimiento no válido." };
  }

  const cents = parseAmountToCents(String(formData.get("amount") ?? ""));
  if (cents === null) {
    return { error: "El importe no es válido. Escríbelo así: 25,50" };
  }
  if (cents === 0) {
    return { error: "El importe no puede ser cero." };
  }
  if (Math.abs(cents) > MAX_CENTS) {
    return { error: "El importe es demasiado grande. ¿Te has equivocado?" };
  }
  // En ingresos y gastos el signo lo decide el tipo, no el usuario.
  if (type !== "ADJUSTMENT" && cents < 0) {
    return {
      error: "Escribe el importe en positivo: el tipo ya indica si suma o resta.",
    };
  }

  const description = String(formData.get("description") ?? "").trim();
  if (!description) {
    return { error: "Escribe una descripción." };
  }
  if (description.length > MAX_DESCRIPTION) {
    return { error: `La descripción no puede pasar de ${MAX_DESCRIPTION} caracteres.` };
  }

  const dateRaw = String(formData.get("date") ?? "");
  // El input date da "2026-08-10". Le añadimos la hora para que se interprete
  // como medianoche local y no como medianoche UTC, que podría caer en otro día.
  const date = dateRaw ? new Date(`${dateRaw}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) {
    return { error: "La fecha no es válida." };
  }

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type,
      amountCents: toSignedCents(type, cents),
      description,
      date,
    },
  });

  // Le dice a Next.js que los datos de esa página han cambiado y debe volver a
  // renderizarla. Sin esto seguirías viendo el saldo antiguo.
  revalidatePath("/");
  return { ok: true, resetId: crypto.randomUUID() };
}

export async function deleteTransaction(formData: FormData) {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Filtramos por id Y por userId a la vez. Si alguien manipulase el formulario
  // para enviar el id de un movimiento ajeno, la consulta no encontraría nada
  // en lugar de borrarlo. Nunca borres solo por el id que llega del navegador.
  await prisma.transaction.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/");
}

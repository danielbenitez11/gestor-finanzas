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
  type TransactionType,
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

type MovimientoValido = {
  type: TransactionType;
  cents: number;
  description: string;
  date: Date;
};

/**
 * Reglas de validación de un movimiento, en un solo sitio.
 *
 * Crear y editar comparten esta función a propósito: si estuvieran duplicadas,
 * tarde o temprano una se quedaría atrás y podrías guardar editando algo que no
 * te dejaría crear.
 */
function validarMovimiento(
  formData: FormData,
): MovimientoValido | { error: string } {
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

  return { type, cents, description, date };
}

export async function createTransaction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const datos = validarMovimiento(formData);
  if ("error" in datos) return { error: datos.error };

  // Atajo opcional: "he pagado 24 pero me deben 16". La deuda se crea colgada
  // del gasto en la misma operación, así que o se guardan las dos cosas o
  // ninguna. Nunca queda un gasto con la nota de la deuda a medias.
  const deudorNombre = String(formData.get("debtPerson") ?? "").trim();
  const deudorImporte = String(formData.get("debtAmount") ?? "").trim();

  let deuda: { person: string; amountCents: number } | null = null;

  if (deudorNombre || deudorImporte) {
    if (datos.type !== "EXPENSE") {
      return { error: "Lo de «me deben parte» solo tiene sentido en un gasto." };
    }
    if (!deudorNombre) return { error: "¿Quién te debe? Escribe un nombre." };

    const cents = parseAmountToCents(deudorImporte);
    if (cents === null || cents <= 0) {
      return { error: "Lo que te deben no es un importe válido." };
    }
    if (cents > datos.cents) {
      return { error: "No pueden deberte más de lo que has pagado." };
    }
    deuda = { person: deudorNombre, amountCents: cents };
  }

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: datos.type,
      amountCents: toSignedCents(datos.type, datos.cents),
      description: datos.description,
      date: datos.date,
      ...(deuda
        ? {
            debtsOriginated: {
              create: [
                {
                  userId: user.id,
                  direction: "OWED_TO_ME",
                  person: deuda.person,
                  description: datos.description,
                  amountCents: deuda.amountCents,
                  date: datos.date,
                },
              ],
            },
          }
        : {}),
    },
  });

  // Le dice a Next.js que los datos de esa página han cambiado y debe volver a
  // renderizarla. Sin esto seguirías viendo el saldo antiguo.
  revalidatePath("/");
  revalidatePath("/deudas");
  return { ok: true, resetId: crypto.randomUUID() };
}

export async function updateTransaction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el movimiento." };

  // Comprobamos que es suyo ANTES de tocar nada.
  const existente = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  });
  if (!existente) return { error: "Ese movimiento no existe." };

  const datos = validarMovimiento(formData);
  if ("error" in datos) return { error: datos.error };

  await prisma.transaction.update({
    where: { id: existente.id },
    data: {
      type: datos.type,
      amountCents: toSignedCents(datos.type, datos.cents),
      description: datos.description,
      date: datos.date,
    },
  });

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
  const movimiento = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  });
  if (!movimiento) return;

  // Si lo había generado una suscripción o financiación, dejamos constancia de
  // que esta mensualidad concreta no debe volver a crearse. Sin esto, el
  // generador la recrearía en la siguiente carga y parecería que el botón de
  // borrar no funciona.
  if (movimiento.recurringId && movimiento.periodKey) {
    await prisma.recurringSkip.upsert({
      where: {
        recurringId_periodKey: {
          recurringId: movimiento.recurringId,
          periodKey: movimiento.periodKey,
        },
      },
      create: {
        recurringId: movimiento.recurringId,
        periodKey: movimiento.periodKey,
      },
      update: {},
    });
  }

  await prisma.transaction.delete({ where: { id: movimiento.id } });

  revalidatePath("/");
}

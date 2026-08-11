"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export type AccountFormState = {
  error?: string;
  ok?: string;
  resetId?: string;
};

const MIN_PASSWORD = 8;

/**
 * Cambia la contraseña del usuario que está dentro.
 *
 * Pide la contraseña actual a propósito, aunque ya estés identificado: si
 * alguien se sentara en tu ordenador con la sesión abierta, sin ese paso
 * podría cambiarte la clave y dejarte fuera de tu propia cuenta.
 */
export async function changeOwnPasswordAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const repeatPassword = String(formData.get("repeatPassword") ?? "");

  if (!currentPassword) return { error: "Escribe tu contraseña actual." };
  if (newPassword.length < MIN_PASSWORD) {
    return { error: `La nueva contraseña necesita al menos ${MIN_PASSWORD} caracteres.` };
  }
  if (newPassword !== repeatPassword) {
    return { error: "Las dos contraseñas nuevas no coinciden." };
  }
  if (newPassword === currentPassword) {
    return { error: "La nueva contraseña es igual que la actual." };
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        // Cierra las sesiones abiertas en otros navegadores. Comprobado en la
        // práctica: también cae la sesión actual, así que hay que volver a
        // entrar. Es el comportamiento seguro, pero conviene avisarlo.
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch {
    // Mensaje genérico: no confirmamos si falló por la contraseña actual o por
    // otra cosa, para no dar pistas a quien esté probando a ciegas.
    return { error: "No se ha podido cambiar. ¿Es correcta tu contraseña actual?" };
  }

  return {
    ok: "Contraseña cambiada. Se han cerrado todas las sesiones, incluida esta: vuelve a entrar con la nueva.",
    resetId: crypto.randomUUID(),
  };
}

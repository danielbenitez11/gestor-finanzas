"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AdminFormState = {
  error?: string;
  ok?: string;
  resetId?: string;
};

const MIN_PASSWORD = 8;

/**
 * Toda acción de este archivo pasa por aquí. No basta con esconder el enlace en
 * la interfaz: cualquiera puede invocar una Server Action directamente, así que
 * el rol se comprueba en el servidor, en cada llamada, sin excepción.
 */
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/");
  return session.user;
}

/** Saca un mensaje legible de los errores que lanza Better Auth. */
function mensajeDeError(error: unknown, porDefecto: string): string {
  if (typeof error === "object" && error !== null) {
    const cuerpo = (error as { body?: { message?: string } }).body;
    if (cuerpo?.message) return cuerpo.message;
    const msg = (error as { message?: string }).message;
    if (msg) return msg;
  }
  return porDefecto;
}

/** Cuántos administradores activos quedan además de este. */
async function otrosAdminsActivos(exceptoId: string): Promise<number> {
  return prisma.user.count({
    where: {
      role: "admin",
      id: { not: exceptoId },
      OR: [{ banned: false }, { banned: null }],
    },
  });
}

export async function createUserAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "user";

  if (!email.includes("@")) return { error: "El correo no es válido." };
  if (!name) return { error: "Ponle un nombre." };
  if (password.length < MIN_PASSWORD) {
    return { error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.` };
  }

  const yaExiste = await prisma.user.findUnique({ where: { email } });
  if (yaExiste) return { error: `Ya hay un usuario con el correo ${email}.` };

  try {
    await auth.api.createUser({
      body: { email, name, password, role },
      headers: await headers(),
    });
  } catch (error) {
    return { error: mensajeDeError(error, "No se ha podido crear el usuario.") };
  }

  revalidatePath("/admin");
  return { ok: `Usuario ${name} creado.`, resetId: crypto.randomUUID() };
}

export async function setUserPasswordAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!userId) return { error: "Falta el usuario." };
  if (newPassword.length < MIN_PASSWORD) {
    return { error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.` };
  }

  try {
    await auth.api.setUserPassword({
      body: { userId, newPassword },
      headers: await headers(),
    });

    // Cerrar sus sesiones abiertas: si alguien seguía dentro con la contraseña
    // vieja, cambiarla debe echarlo fuera. Si no, cambiarla no serviría de nada.
    await auth.api.revokeUserSessions({
      body: { userId },
      headers: await headers(),
    });
  } catch (error) {
    return {
      error: mensajeDeError(error, "No se ha podido cambiar la contraseña."),
    };
  }

  revalidatePath("/admin");
  return { ok: "Contraseña cambiada y sesiones cerradas.", resetId: crypto.randomUUID() };
}

/** Desactivar: el usuario deja de poder entrar, pero sus datos siguen intactos. */
export async function banUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("id") ?? "");
  if (!userId) return;

  // No puedes desactivarte a ti mismo: te quedarías fuera sin forma de volver.
  if (userId === admin.id) return;

  await auth.api.banUser({
    body: { userId, banReason: "Desactivado por el administrador" },
    headers: await headers(),
  });

  revalidatePath("/admin");
}

export async function unbanUserAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("id") ?? "");
  if (!userId) return;

  await auth.api.unbanUser({ body: { userId }, headers: await headers() });
  revalidatePath("/admin");
}

/**
 * Borrado definitivo. Arrastra por cascada TODOS sus movimientos y reglas: así
 * está declarado en el esquema con onDelete: Cascade. No hay vuelta atrás.
 */
export async function removeUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("id") ?? "");
  if (!userId) return;

  // Ni borrarte a ti mismo, ni borrar al último administrador que queda.
  if (userId === admin.id) return;

  const objetivo = await prisma.user.findUnique({ where: { id: userId } });
  if (!objetivo) return;
  if (objetivo.role === "admin" && (await otrosAdminsActivos(userId)) === 0) return;

  await auth.api.removeUser({ body: { userId }, headers: await headers() });
  revalidatePath("/admin");
}

/** Asciende a admin o devuelve a usuario normal. */
export async function toggleRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("id") ?? "");
  if (!userId) return;

  // No puedes quitarte a ti mismo el rol de admin: perderías el panel.
  if (userId === admin.id) return;

  const objetivo = await prisma.user.findUnique({ where: { id: userId } });
  if (!objetivo) return;

  const nuevoRol = objetivo.role === "admin" ? "user" : "admin";

  // Y nunca dejar la aplicación sin ningún administrador activo.
  if (nuevoRol === "user" && (await otrosAdminsActivos(userId)) === 0) return;

  await auth.api.setRole({
    body: { userId, role: nuevoRol },
    headers: await headers(),
  });

  revalidatePath("/admin");
}

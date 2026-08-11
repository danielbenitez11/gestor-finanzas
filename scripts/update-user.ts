/**
 * Cambia el nombre, el correo o la contraseña de un usuario ya existente.
 *
 *   npm run editar-usuario -- correo@actual.com --nombre "Daniel Benítez"
 *   npm run editar-usuario -- correo@actual.com --password "NuevaClaveSegura"
 *   npm run editar-usuario -- correo@actual.com --email "nuevo@correo.com"
 *
 * Se pueden combinar varias opciones en la misma llamada.
 *
 * La contraseña NUNCA debe editarse a mano en la base de datos: lo que se
 * guarda es un hash, no el texto. Este script usa la misma función de cifrado
 * que el login, así que el resultado es válido.
 */
import "dotenv/config";

import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

/** Lee `--clave valor` de los argumentos de la terminal. */
function getFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;

  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`La opción --${name} necesita un valor.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const currentEmail = process.argv[2];

  if (!currentEmail || currentEmail.startsWith("--")) {
    console.error(
      'Uso: npm run editar-usuario -- correo@actual.com [--nombre "..."] [--email "..."] [--password "..."]',
    );
    process.exit(1);
  }

  const newName = getFlag("nombre");
  const newEmail = getFlag("email");
  const newPassword = getFlag("password");

  if (!newName && !newEmail && !newPassword) {
    console.error("No has indicado nada que cambiar.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: currentEmail } });
  if (!user) {
    console.error(`No existe ningún usuario con el correo ${currentEmail}.`);
    process.exit(1);
  }

  const changes: string[] = [];

  if (newName || newEmail) {
    if (newEmail && newEmail !== currentEmail) {
      const taken = await prisma.user.findUnique({ where: { email: newEmail } });
      if (taken) {
        console.error(`Ya hay otro usuario con el correo ${newEmail}.`);
        process.exit(1);
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(newName ? { name: newName } : {}),
        ...(newEmail ? { email: newEmail } : {}),
      },
    });

    if (newName) changes.push(`nombre: ${user.name} → ${newName}`);
    if (newEmail) changes.push(`correo: ${user.email} → ${newEmail}`);
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      console.error("La contraseña debe tener al menos 8 caracteres.");
      process.exit(1);
    }

    const credential = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    if (!credential) {
      console.error(
        "Este usuario no tiene contraseña configurada (entra por otro método).",
      );
      process.exit(1);
    }

    // $context da acceso a las utilidades internas de Better Auth, entre ellas
    // la función de hash que usa el propio login.
    const ctx = await auth.$context;
    const hashed = await ctx.password.hash(newPassword);
    await ctx.internalAdapter.updatePassword(user.id, hashed);

    // Al cambiar la contraseña cerramos las sesiones abiertas: si alguien había
    // entrado con la clave antigua, deja de tener acceso.
    const { count } = await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    changes.push("contraseña actualizada");
    changes.push(`sesiones cerradas: ${count}`);
  }

  console.log("\n Usuario actualizado\n");
  for (const change of changes) {
    console.log(`   ${change}`);
  }
  console.log("");
}

main()
  .catch((error) => {
    console.error("No se pudo actualizar el usuario:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

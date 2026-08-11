/**
 * Crea un usuario administrador desde la terminal.
 *
 *   npm run crear-admin -- correo@ejemplo.com "MiContraseña" "Mi Nombre"
 *
 * La aplicación tiene el registro público desactivado a propósito, así que la
 * primera cuenta hay que crearla por aquí. Este script levanta una instancia
 * aparte de Better Auth con el alta permitida, apuntando a la misma base de
 * datos, para que la contraseña se cifre exactamente igual que en el login.
 */
import "dotenv/config";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";

import { prisma } from "../src/lib/prisma";

function generatePassword(): string {
  const alphabet =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function main() {
  const [email, passwordArg, nameArg] = process.argv.slice(2);

  if (!email) {
    console.error(
      'Uso: npm run crear-admin -- correo@ejemplo.com "contraseña" "Nombre"',
    );
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`Ya existe un usuario con el correo ${email}.`);
    process.exit(1);
  }

  const password = passwordArg || generatePassword();
  const name = nameArg || email.split("@")[0];

  const seedAuth = betterAuth({
    database: prismaAdapter(prisma, { provider: "sqlite" }),
    emailAndPassword: { enabled: true },
    plugins: [admin()],
  });

  await seedAuth.api.signUpEmail({ body: { email, password, name } });

  // signUpEmail crea el usuario con el rol por defecto; lo ascendemos a admin.
  await prisma.user.update({
    where: { email },
    data: { role: "admin", emailVerified: true },
  });

  console.log("\n Administrador creado\n");
  console.log(`   Correo:      ${email}`);
  console.log(`   Contraseña:  ${password}`);
  console.log(`   Nombre:      ${name}\n`);
  if (!passwordArg) {
    console.log("   (contraseña generada al azar: guárdala en tu gestor)\n");
  }
}

main()
  .catch((error) => {
    console.error("No se pudo crear el administrador:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

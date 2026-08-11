import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/prisma";

/**
 * Dominios desde los que se acepta un inicio de sesión.
 *
 * Better Auth compara el dominio desde el que escribes la contraseña con
 * `BETTER_AUTH_URL`, y si no coinciden rechaza la petición con un 403. Es una
 * defensa contra CSRF: impide que otra web mande peticiones en tu nombre.
 *
 * El problema en Vercel es que un mismo despliegue vive en dos direcciones: el
 * dominio estable (gastos.vercel.app) y una URL única por despliegue
 * (gastos-a1b2c3-daniel.vercel.app), que es justo donde te deja Vercel al
 * pulsar "Visit" después de publicar. Entrar por esa segunda daba 403.
 *
 * Vercel expone las dos como variables del sistema, así que se añaden solas.
 * No se usa un comodín tipo `*.vercel.app`: eso daría por bueno el origen de
 * CUALQUIER aplicación alojada en Vercel, que es precisamente lo que la
 * comprobación trata de evitar.
 */
function origenesDeConfianza(): string[] {
  return [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]
    .filter((host): host is string => Boolean(host))
    .map((host) => `https://${host}`);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),

  trustedOrigins: origenesDeConfianza(),

  emailAndPassword: {
    enabled: true,
    // Solo el admin crea cuentas desde el panel, así que no hay registro público.
    disableSignUp: true,
  },

  rateLimit: {
    // Frena los ataques de fuerza bruta: Better Auth limita /sign-in/email a 3
    // intentos cada 10 segundos. El contador se guarda en la base de datos y no
    // en memoria porque en producción hay varias instancias del servidor, y una
    // cuenta en memoria por instancia no limita nada.
    storage: "database",
  },

  plugins: [
    // Añade roles (admin/user) y las operaciones de gestión de usuarios.
    admin(),
    // nextCookies debe ir siempre el último de la lista.
    nextCookies(),
  ],
});

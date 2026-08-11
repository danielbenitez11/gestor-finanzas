import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),

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

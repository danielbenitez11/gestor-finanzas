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

  plugins: [
    // Añade roles (admin/user) y las operaciones de gestión de usuarios.
    admin(),
    // nextCookies debe ir siempre el último de la lista.
    nextCookies(),
  ],
});

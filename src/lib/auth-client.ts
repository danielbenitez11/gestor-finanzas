import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

// Este cliente se usa desde el navegador (componentes con "use client").
// Para leer la sesión en el servidor se usa `auth.api.getSession` de @/lib/auth.
export const authClient = createAuthClient({
  plugins: [adminClient()],
});

export const { signIn, signOut, useSession } = authClient;

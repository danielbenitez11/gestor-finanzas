import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// Better Auth atiende todas sus rutas (/api/auth/sign-in, /sign-out, ...) desde
// aquí. El [...all] de la carpeta significa "captura cualquier subruta".
export const { GET, POST } = toNextJsHandler(auth);

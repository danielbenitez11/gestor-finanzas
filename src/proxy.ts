import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * En Next.js 16 esto se llama "proxy" (antes "middleware"): se ejecuta antes de
 * cada petición que encaje con el matcher de abajo.
 *
 * Aquí solo miramos si existe la cookie de sesión, sin consultar la base de
 * datos, para que sea rápido. Es una comprobación optimista: la validación de
 * verdad la hace cada página con `auth.api.getSession`. Nunca confíes solo en
 * esto para proteger datos.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/automaticos/:path*",
    "/deudas/:path*",
    "/admin/:path*",
    "/cuenta/:path*",
  ],
};

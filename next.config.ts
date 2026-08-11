import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `better-sqlite3` no es JavaScript: lleva dentro un binario compilado
  // (.node). Si Next.js intenta empaquetarlo junto al resto del código, el
  // binario se queda fuera y el servidor revienta al arrancar, aunque en
  // producción se use Turso y no llegue a abrirse ni un fichero: basta con que
  // `src/lib/prisma.ts` lo importe. Esto le dice a Next.js que lo deje donde
  // está y lo cargue de node_modules en tiempo de ejecución.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],

  // Oculta el círculo con la "N" que Next.js muestra abajo a la izquierda
  // mientras desarrollas. Solo aparecía en desarrollo, nunca en producción,
  // pero estorbaba. Los errores de compilación se siguen mostrando igual.
  devIndicators: false,

  // Cabeceras de seguridad. El navegador las respeta en todas las respuestas.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Impide que otra web te meta dentro de un <iframe> invisible y te
          // engañe para que pulses botones sin saberlo (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Evita que el navegador "adivine" el tipo de un fichero y acabe
          // ejecutando como script algo que no lo es.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Al salir hacia otra web no se filtra la ruta que estabas viendo.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // La aplicación no usa cámara, micrófono ni ubicación: se deniegan.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

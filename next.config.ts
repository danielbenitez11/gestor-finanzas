import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Oculta el círculo con la "N" que Next.js muestra abajo a la izquierda
  // mientras desarrollas. Solo aparecía en desarrollo, nunca en producción,
  // pero estorbaba. Los errores de compilación se siguen mostrando igual.
  devIndicators: false,
};

export default nextConfig;

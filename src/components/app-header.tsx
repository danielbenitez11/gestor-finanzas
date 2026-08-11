import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";

export function AppHeader({
  name,
  role,
  activo,
}: {
  name: string;
  role?: string | null;
  activo: "panel" | "automaticos" | "admin" | "cuenta";
}) {
  const enlace = (esteEs: typeof activo) =>
    "rounded-lg px-2.5 py-1.5 text-sm transition-colors " +
    (activo === esteEs
      ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50");

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-200 bg-white px-4 py-3 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="font-medium text-zinc-900 dark:text-zinc-50">
        {name}
        {role === "admin" && (
          <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-normal text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            admin
          </span>
        )}
      </span>

      <nav className="flex gap-1">
        <Link href="/" className={enlace("panel")}>
          Panel
        </Link>
        <Link href="/automaticos" className={enlace("automaticos")}>
          Pagos Automáticos
        </Link>
        {/* Esconder el enlace no es una medida de seguridad, solo de orden: la
            página /admin comprueba el rol por su cuenta en el servidor. */}
        {role === "admin" && (
          <Link href="/admin" className={enlace("admin")}>
            Usuarios
          </Link>
        )}
        <Link href="/cuenta" className={enlace("cuenta")}>
          Mi cuenta
        </Link>
      </nav>

      <div className="ml-auto">
        <LogoutButton />
      </div>
    </header>
  );
}

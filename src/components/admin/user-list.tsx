import {
  banUserAction,
  removeUserAction,
  toggleRoleAction,
  unbanUserAction,
} from "@/lib/admin-actions";
import { SetPasswordForm } from "@/components/admin/set-password-form";

export type UsuarioFila = {
  id: string;
  email: string;
  name: string;
  role: string | null;
  banned: boolean | null;
  createdAt: Date;
  movimientos: number;
  reglas: number;
};

const fecha = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function UserList({
  usuarios,
  yoId,
  otrosAdminsActivos,
}: {
  usuarios: UsuarioFila[];
  yoId: string;
  otrosAdminsActivos: number;
}) {
  return (
    <ul className="grid gap-3">
      {usuarios.map((u) => {
        const soyYo = u.id === yoId;
        const esAdmin = u.role === "admin";
        const desactivado = u.banned === true;
        // El último administrador no se puede degradar ni borrar: la aplicación
        // se quedaría sin nadie capaz de gestionar usuarios.
        const esUltimoAdmin = esAdmin && otrosAdminsActivos === 0;

        return (
          <li
            key={u.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {u.name}
                  </span>
                  {esAdmin && (
                    <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      admin
                    </span>
                  )}
                  {soyYo && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      tú
                    </span>
                  )}
                  {desactivado && (
                    <span
                      className="rounded px-1.5 py-0.5 text-xs"
                      style={{
                        color: "var(--estado-critico)",
                        border: "1px solid var(--estado-critico)",
                      }}
                    >
                      desactivado
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {u.email}
                </p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Alta el {fecha.format(u.createdAt)} · {u.movimientos} movimientos ·{" "}
                  {u.reglas} automáticos
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <SetPasswordForm userId={u.id} />

              {/* Sobre uno mismo no se ofrecen estas acciones: no se puede uno
                  desactivar, degradar ni borrar sin perder el acceso. */}
              {!soyYo && (
                <>
                  <form action={toggleRoleAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <button
                      type="submit"
                      disabled={esUltimoAdmin}
                      className="text-sm text-zinc-500 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400"
                      title={
                        esUltimoAdmin
                          ? "Es el único administrador activo"
                          : undefined
                      }
                    >
                      {esAdmin ? "Quitar admin" : "Hacer admin"}
                    </button>
                  </form>

                  {desactivado ? (
                    <form action={unbanUserAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        type="submit"
                        className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
                      >
                        Reactivar
                      </button>
                    </form>
                  ) : (
                    <form action={banUserAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        type="submit"
                        className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
                      >
                        Desactivar
                      </button>
                    </form>
                  )}

                  {/* El borrado es irreversible, así que va en dos pasos: al
                      desplegarlo se ve exactamente cuántos datos se pierden. */}
                  {!esUltimoAdmin && (
                    <details className="ml-auto">
                      <summary
                        className="cursor-pointer text-sm underline-offset-4 hover:underline"
                        style={{ color: "var(--estado-critico)" }}
                      >
                        Borrar
                      </summary>
                      <div
                        className="mt-2 rounded-lg border p-3 text-sm"
                        style={{ borderColor: "var(--estado-critico)" }}
                      >
                        <p style={{ color: "var(--estado-critico)" }}>
                          ▲ Se borrarán también sus {u.movimientos} movimientos y{" "}
                          {u.reglas} reglas automáticas. No se puede deshacer.
                        </p>
                        <form action={removeUserAction} className="mt-2">
                          <input type="hidden" name="id" value={u.id} />
                          <button
                            type="submit"
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                            style={{ backgroundColor: "var(--estado-critico)" }}
                          >
                            Sí, borrar a {u.name} definitivamente
                          </button>
                        </form>
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

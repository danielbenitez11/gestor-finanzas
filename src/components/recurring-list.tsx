import { formatCents } from "@/lib/money";
import {
  cancelRecurringRule,
  deleteRecurringRule,
  resumeRecurringRule,
} from "@/lib/recurring-actions";
import {
  esIngreso,
  fechaDeCobro,
  RECURRING_LABELS,
  type RecurringKind,
} from "@/lib/recurring";

export type ReglaConCobros = {
  id: string;
  kind: string;
  name: string;
  amountCents: number;
  dayOfMonth: number;
  startDate: Date;
  totalInstallments: number | null;
  principalCents: number | null;
  active: boolean;
  cobrosHechos: number;
};

const fechaLarga = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Próximo cobro de una regla activa: el mes que viene, mismo día. */
function proximoCobro(dayOfMonth: number): Date {
  const hoy = new Date();
  const candidato = fechaDeCobro(hoy.getFullYear(), hoy.getMonth(), dayOfMonth);
  if (candidato > hoy) return candidato;
  return fechaDeCobro(hoy.getFullYear(), hoy.getMonth() + 1, dayOfMonth);
}

export function RecurringList({ reglas }: { reglas: ReglaConCobros[] }) {
  if (reglas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Todavía no tienes nada automático. Añade tu nómina, una suscripción o una
        financiación y se irán apuntando solas cada mes.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {reglas.map((r) => {
        const entra = esIngreso(r.kind);
        const esPrestamo = r.totalInstallments !== null;
        const terminada = esPrestamo && r.cobrosHechos >= (r.totalInstallments ?? 0);
        const pendientes = esPrestamo
          ? Math.max(0, (r.totalInstallments ?? 0) - r.cobrosHechos)
          : 0;
        const quedaPorPagar = pendientes * r.amountCents;

        return (
          <li
            key={r.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {r.name}
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {RECURRING_LABELS[r.kind as RecurringKind] ?? r.kind}
                  </span>
                  {terminada ? (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      Pagada
                    </span>
                  ) : !r.active ? (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      Cancelada
                    </span>
                  ) : null}
                </p>

                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  Día {r.dayOfMonth} de cada mes · desde el{" "}
                  {fechaLarga.format(r.startDate)}
                </p>

                {esPrestamo && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    Cuota {r.cobrosHechos} de {r.totalInstallments}
                    {pendientes > 0 && (
                      <>
                        {" · "}quedan {formatCents(quedaPorPagar)}
                      </>
                    )}
                  </p>
                )}

                {r.active && !terminada && (
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {entra ? "Próximo ingreso" : "Próximo cobro"} el{" "}
                    {fechaLarga.format(proximoCobro(r.dayOfMonth))}
                  </p>
                )}
              </div>

              <span className="shrink-0 text-right">
                <span
                  className={
                    "block font-medium tabular-nums " +
                    (entra
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-900 dark:text-zinc-50")
                  }
                >
                  {entra ? "+" : "−"}
                  {formatCents(r.amountCents)}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  al mes
                </span>
              </span>
            </div>

            <div className="mt-3 flex gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              {!terminada &&
                (r.active ? (
                  <form action={cancelRecurringRule}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <form action={resumeRecurringRule}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
                    >
                      Reanudar
                    </button>
                  </form>
                ))}

              <form action={deleteRecurringRule} className="ml-auto">
                <input type="hidden" name="id" value={r.id} />
                <button
                  type="submit"
                  className="text-sm text-zinc-400 underline-offset-4 hover:underline"
                  title="Los cobros ya hechos se quedan en el histórico"
                >
                  Borrar la regla
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

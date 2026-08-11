"use client";

import { useActionState, useState } from "react";

import {
  deleteTransaction,
  updateTransaction,
  type FormState,
} from "@/lib/actions";
import {
  formatCents,
  TRANSACTION_LABELS,
  TRANSACTION_TYPES,
  type TransactionType,
} from "@/lib/money";

export type FilaMovimiento = {
  id: string;
  type: string;
  amountCents: number;
  description: string;
  /** Fecha ya formateada en el servidor, para no repetir el cálculo aquí. */
  fechaTexto: string;
  /** La misma fecha como "2026-08-11", que es lo que espera el input. */
  fechaISO: string;
  /** Nombre de la suscripción o financiación que lo generó, si la hubo. */
  generadoPor: string | null;
};

const initialState: FormState = {};

export function TransactionRow({ item }: { item: FilaMovimiento }) {
  const [editando, setEditando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  const [state, formAction, pending] = useActionState(
    updateTransaction,
    initialState,
  );

  // Al guardar bien, se cierra el formulario y vuelve la vista normal.
  const [ultimo, setUltimo] = useState<string | undefined>();
  if (state.resetId && state.resetId !== ultimo) {
    setUltimo(state.resetId);
    setEditando(false);
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400";

  if (editando) {
    return (
      <li className="px-4 py-3">
        <form action={formAction}>
          <input type="hidden" name="id" value={item.id} />

          <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
            <select
              name="type"
              defaultValue={item.type}
              className={inputClass + " sm:w-36"}
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TRANSACTION_LABELS[t]}
                </option>
              ))}
            </select>

            <input
              name="description"
              defaultValue={item.description}
              maxLength={100}
              required
              className={inputClass}
            />

            <input
              name="amount"
              inputMode="decimal"
              defaultValue={(Math.abs(item.amountCents) / 100)
                .toFixed(2)
                .replace(".", ",")}
              required
              className={inputClass + " sm:w-28"}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              name="date"
              type="date"
              defaultValue={item.fechaISO}
              required
              className={inputClass + " w-auto"}
            />

            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Cancelar
            </button>
          </div>

          {state.error && (
            <p
              role="alert"
              className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {state.error}
            </p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
          {item.description}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {item.fechaTexto}
          {" · "}
          {TRANSACTION_LABELS[item.type as TransactionType] ?? item.type}
          {item.generadoPor && ` · automático`}
        </p>
      </div>

      <span
        className={
          "shrink-0 font-medium tabular-nums " +
          (item.amountCents >= 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-zinc-900 dark:text-zinc-100")
        }
      >
        {item.amountCents > 0 ? "+" : ""}
        {formatCents(item.amountCents)}
      </span>

      {confirmandoBorrado ? (
        // La confirmación sustituye a los botones en vez de abrir una ventana:
        // no interrumpe, y el botón peligroso queda donde no estaba el dedo.
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {item.generadoPor ? `¿Borrar este cobro?` : "¿Seguro?"}
          </span>
          <form action={deleteTransaction}>
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              className="rounded px-2 py-1 text-sm font-medium text-white"
              style={{ backgroundColor: "var(--estado-critico)" }}
            >
              Sí
            </button>
          </form>
          <button
            type="button"
            onClick={() => setConfirmandoBorrado(false)}
            className="rounded px-2 py-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            No
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setConfirmandoBorrado(true)}
            aria-label={`Borrar ${item.description}`}
            className="rounded px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            Borrar
          </button>
        </div>
      )}
    </li>
  );
}

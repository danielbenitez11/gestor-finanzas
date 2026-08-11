"use client";

import { useActionState, useState } from "react";

import { deleteDebt, settleDebt, type DebtFormState } from "@/lib/debt-actions";
import { DEBT_VERBS, pendiente, type DebtDirection } from "@/lib/debts";
import { formatCents } from "@/lib/money";

export type FilaDeuda = {
  id: string;
  direction: string;
  person: string;
  description: string;
  amountCents: number;
  settledCents: number;
  fechaTexto: string;
};

const initialState: DebtFormState = {};

export function DebtRow({ deuda }: { deuda: FilaDeuda }) {
  const [abierto, setAbierto] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [state, formAction, pending] = useActionState(settleDebt, initialState);

  const queda = pendiente(deuda.amountCents, deuda.settledCents);
  const saldada = queda === 0;
  const meDeben = deuda.direction === "OWED_TO_ME";
  const parcial = deuda.settledCents > 0 && !saldada;

  const [importe, setImporte] = useState(
    (queda / 100).toFixed(2).replace(".", ","),
  );

  // Al registrar un cobro, se cierra el desplegable y se recalcula el importe
  // que queda por defecto.
  const [ultimo, setUltimo] = useState<string | undefined>();
  if (state.resetId && state.resetId !== ultimo) {
    setUltimo(state.resetId);
    setAbierto(false);
  }

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {deuda.person}{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">
              {DEBT_VERBS[deuda.direction as DebtDirection] ?? ""}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {deuda.description} · {deuda.fechaTexto}
          </p>
          {parcial && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Ya {meDeben ? "te ha devuelto" : "le has pagado"}{" "}
              {formatCents(deuda.settledCents)} de {formatCents(deuda.amountCents)}
            </p>
          )}
        </div>

        <span className="shrink-0 text-right">
          <span
            className={
              "block font-medium tabular-nums " +
              (saldada
                ? "text-zinc-400 line-through dark:text-zinc-500"
                : meDeben
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-900 dark:text-zinc-50")
            }
          >
            {formatCents(saldada ? deuda.amountCents : queda)}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {saldada ? "saldada" : "pendiente"}
          </span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        {!saldada &&
          (abierto ? (
            <form action={formAction} className="flex w-full flex-wrap items-start gap-2">
              <input type="hidden" name="id" value={deuda.id} />
              <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                {meDeben ? "¿Cuánto te ha dado?" : "¿Cuánto le has pagado?"}
                <input
                  name="amount"
                  inputMode="decimal"
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  className="w-24 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </label>
              <span className="self-center text-xs text-zinc-400">
                de {formatCents(queda)}
              </span>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
              >
                {pending ? "Guardando…" : "Registrar"}
              </button>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="self-center text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
              >
                Cancelar
              </button>
              {state.error && (
                <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">
                  {state.error}
                </p>
              )}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAbierto(true)}
              className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              {meDeben ? "Registrar cobro" : "Registrar pago"}
            </button>
          ))}

        {!abierto &&
          (confirmandoBorrado ? (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                ¿Borrar la anotación?
              </span>
              <form action={deleteDebt}>
                <input type="hidden" name="id" value={deuda.id} />
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
            <button
              type="button"
              onClick={() => setConfirmandoBorrado(true)}
              className="ml-auto text-sm text-zinc-400 underline-offset-4 hover:underline"
              title="Los cobros ya registrados se quedan en el histórico"
            >
              Borrar
            </button>
          ))}
      </div>
    </li>
  );
}

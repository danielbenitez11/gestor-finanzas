"use client";

import { useActionState, useState } from "react";

import { createTransaction, type FormState } from "@/lib/actions";
import { type TransactionType } from "@/lib/money";

const initialState: FormState = {};

/** Fecha de hoy como "2026-08-10", que es lo que espera <input type="date">. */
function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Etiqueta corta para los botones: en la columna estrecha "Ajuste de saldo"
 *  no cabe. El nombre completo se sigue usando en la lista de movimientos. */
const TABS: { type: TransactionType; corto: string; hint: string }[] = [
  { type: "EXPENSE", corto: "Gasto", hint: "Sale dinero" },
  { type: "INCOME", corto: "Ingreso", hint: "Entra dinero" },
  { type: "ADJUSTMENT", corto: "Ajuste", hint: "Corrige el saldo (admite negativo)" },
];

export function TransactionForm() {
  // useActionState conecta el formulario con la Server Action: `formAction` va
  // en el atributo action, `state` recibe lo que devuelve, y `pending` es true
  // mientras se está enviando.
  const [state, formAction, pending] = useActionState(
    createTransaction,
    initialState,
  );
  const [type, setType] = useState<TransactionType>("EXPENSE");

  // Los campos los controla React a propósito. React 19 vacía solo el
  // formulario en cuanto la Server Action termina, gane o falle; si no los
  // controláramos, un error de validación te borraría lo que acabas de escribir
  // justo cuando necesitas corregirlo.
  const [importe, setImporte] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(todayISO());

  // Lo de "me deben parte" va plegado: el 95 % de los gastos no lo necesitan y
  // no debe estorbar al apuntar una compra normal.
  const [conDeuda, setConDeuda] = useState(false);
  const [deudorNombre, setDeudorNombre] = useState("");
  const [deudorImporte, setDeudorImporte] = useState("");

  // Vaciado tras guardar. Se hace durante el renderizado y no en un efecto:
  // es el patrón que documenta React para ajustar estado cuando cambia algo de
  // fuera. React descarta este render a medias y vuelve a empezar con los
  // valores nuevos, sin llegar a pintar los antiguos.
  const [ultimoGuardado, setUltimoGuardado] = useState<string | undefined>();
  if (state.resetId && state.resetId !== ultimoGuardado) {
    setUltimoGuardado(state.resetId);
    setImporte("");
    setDescripcion("");
    setFecha(todayISO());
    setConDeuda(false);
    setDeudorNombre("");
    setDeudorImporte("");
  }

  const etiquetaActual = TABS.find((t) => t.type === type)?.corto ?? "movimiento";

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400";

  return (
    <form
      action={formAction}
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex gap-1.5" role="group" aria-label="Tipo de movimiento">
        {TABS.map(({ type: t, corto, hint }) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            title={hint}
            aria-pressed={type === t}
            className={
              "flex-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors " +
              (type === t
                ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700")
            }
          >
            {corto}
          </button>
        ))}
      </div>

      {/* El tipo viaja al servidor por aquí, porque los botones de arriba no son
          campos del formulario. */}
      <input type="hidden" name="type" value={type} />

      {/* Apilados y no en paralelo: la columna del formulario es estrecha y dos
          campos uno al lado del otro dejarían el selector de fecha sin sitio. */}
      <div className="mt-4 grid gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Importe
          </span>
          <input
            name="amount"
            inputMode="decimal"
            placeholder="25,50"
            required
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fecha
          </span>
          <input
            name="date"
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Descripción
        </span>
        <input
          name="description"
          placeholder={
            type === "ADJUSTMENT" ? "Saldo inicial" : "Compra en el súper"
          }
          maxLength={100}
          required
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className={inputClass}
        />
      </label>

      {/* Solo en gastos: en un ingreso o un ajuste no tiene sentido. */}
      {type === "EXPENSE" &&
        (conDeuda ? (
          <div className="mt-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Me deben parte
              </span>
              <button
                type="button"
                onClick={() => {
                  setConDeuda(false);
                  setDeudorNombre("");
                  setDeudorImporte("");
                }}
                className="text-xs text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
              >
                Quitar
              </button>
            </div>

            <div className="mt-2 grid gap-2">
              <input
                name="debtPerson"
                placeholder="¿Quién? (Marta)"
                maxLength={60}
                value={deudorNombre}
                onChange={(e) => setDeudorNombre(e.target.value)}
                className={inputClass}
              />
              <input
                name="debtAmount"
                inputMode="decimal"
                placeholder="¿Cuánto te debe? (16,00)"
                value={deudorImporte}
                onChange={(e) => setDeudorImporte(e.target.value)}
                className={inputClass}
              />
            </div>

            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              El gasto entero cuenta en tu saldo. Lo que te deben se apunta
              aparte y no suma hasta que te lo devuelvan.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConDeuda(true)}
            className="mt-3 text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            + Me deben parte de esto
          </button>
        ))}

      {state.error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Guardando…" : `Añadir ${etiquetaActual.toLowerCase()}`}
      </button>
    </form>
  );
}

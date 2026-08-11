"use client";

import { useActionState, useState } from "react";

import { createDebt, type DebtFormState } from "@/lib/debt-actions";
import { DEBT_LABELS, type DebtDirection } from "@/lib/debts";

const initialState: DebtFormState = {};

function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function DebtForm() {
  const [state, formAction, pending] = useActionState(createDebt, initialState);

  const [direction, setDirection] = useState<DebtDirection>("OWED_TO_ME");
  const [persona, setPersona] = useState("");
  const [concepto, setConcepto] = useState("");
  const [importe, setImporte] = useState("");
  const [fecha, setFecha] = useState(todayISO());

  const [ultimo, setUltimo] = useState<string | undefined>();
  if (state.resetId && state.resetId !== ultimo) {
    setUltimo(state.resetId);
    setPersona("");
    setConcepto("");
    setImporte("");
    setFecha(todayISO());
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400";
  const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

  const meDeben = direction === "OWED_TO_ME";

  return (
    <form
      action={formAction}
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex gap-1.5" role="group" aria-label="Dirección">
        {(["OWED_TO_ME", "I_OWE"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            aria-pressed={direction === d}
            className={
              "flex-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors " +
              (direction === d
                ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700")
            }
          >
            {DEBT_LABELS[d]}
          </button>
        ))}
      </div>
      <input type="hidden" name="direction" value={direction} />

      <label className="mt-4 flex flex-col gap-1.5">
        <span className={labelClass}>{meDeben ? "¿Quién te debe?" : "¿A quién debes?"}</span>
        <input
          name="person"
          required
          maxLength={60}
          placeholder="Marta"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className={labelClass}>¿De qué?</span>
        <input
          name="description"
          required
          maxLength={60}
          placeholder="Cena del sábado"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className={labelClass}>Importe</span>
        <input
          name="amount"
          inputMode="decimal"
          required
          placeholder="16,00"
          value={importe}
          onChange={(e) => setImporte(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className={labelClass}>Fecha</span>
        <input
          name="date"
          type="date"
          required
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={inputClass}
        />
      </label>

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        Esto no toca tu saldo. Solo cuando registres el{" "}
        {meDeben ? "cobro" : "pago"} se creará un movimiento de verdad.
      </p>

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
        {pending ? "Guardando…" : "Anotar"}
      </button>
    </form>
  );
}

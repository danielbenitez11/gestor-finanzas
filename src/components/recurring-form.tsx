"use client";

import { useActionState, useState } from "react";

import { formatCents, parseAmountToCents } from "@/lib/money";
import { calcularCuota, type RecurringKind } from "@/lib/recurring";
import {
  createRecurringRule,
  type RecurringFormState,
} from "@/lib/recurring-actions";

const initialState: RecurringFormState = {};

function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function RecurringForm() {
  const [state, formAction, pending] = useActionState(
    createRecurringRule,
    initialState,
  );
  const [kind, setKind] = useState<RecurringKind>("SUBSCRIPTION");

  // TODOS los campos son controlados por React a propósito. React 19 vacía solo
  // el formulario en cuanto la Server Action termina, gane o falle. Si los
  // dejáramos sin controlar, al pedir confirmación de los cobros atrasados se
  // borraría lo que acabas de escribir y no habría nada que confirmar.
  const [nombre, setNombre] = useState("");
  const [importe, setImporte] = useState("");
  const [fecha, setFecha] = useState(todayISO());

  const [principal, setPrincipal] = useState("");
  const [cuotas, setCuotas] = useState("12");
  const [tin, setTin] = useState("");
  const [cuotaEditada, setCuotaEditada] = useState<string | null>(null);

  // Vaciado tras crear. Durante el renderizado y no en un efecto: es el patrón
  // que documenta React para ajustar estado cuando cambia algo de fuera.
  const [ultimoGuardado, setUltimoGuardado] = useState<string | undefined>();
  if (state.resetId && state.resetId !== ultimoGuardado) {
    setUltimoGuardado(state.resetId);
    setNombre("");
    setImporte("");
    setFecha(todayISO());
    setPrincipal("");
    setCuotas("12");
    setTin("");
    setCuotaEditada(null);
  }

  const principalCents = parseAmountToCents(principal) ?? 0;
  const nCuotas = Number(cuotas) || 0;
  const tinBp = parseAmountToCents(tin) ?? 0;
  const cuotaCalculada =
    principalCents > 0 && nCuotas > 0
      ? calcularCuota(principalCents, nCuotas, tinBp)
      : 0;

  const totalAPagar = cuotaCalculada * nCuotas;
  const intereses = totalAPagar - principalCents;

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400";
  const labelClass =
    "text-sm font-medium text-zinc-700 dark:text-zinc-300";

  return (
    <form
      action={formAction}
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Tipo">
        {(
          [
            ["SUBSCRIPTION", "Suscripción"],
            ["LOAN", "Financiación"],
            ["INCOME", "Ingreso"],
          ] as const
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setKind(valor)}
            aria-pressed={kind === valor}
            className={
              "rounded-lg px-1 py-2 text-xs font-medium transition-colors " +
              (kind === valor
                ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700")
            }
          >
            {etiqueta}
          </button>
        ))}
      </div>
      <input type="hidden" name="kind" value={kind} />

      <label className="mt-4 flex flex-col gap-1.5">
        <span className={labelClass}>
          {kind === "LOAN" ? "Concepto" : "Nombre"}
        </span>
        <input
          name="name"
          placeholder={
            kind === "SUBSCRIPTION" ? "Netflix" : kind === "LOAN" ? "Sofá" : "Nómina"
          }
          maxLength={60}
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={inputClass}
        />
      </label>

      {kind !== "LOAN" ? (
        <label className="mt-3 flex flex-col gap-1.5">
          <span className={labelClass}>
            {kind === "INCOME" ? "Cuánto entra al mes" : "Importe al mes"}
          </span>
          <input
            name="amount"
            inputMode="decimal"
            placeholder={kind === "INCOME" ? "1800,00" : "13,99"}
            required
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            className={inputClass}
          />
        </label>
      ) : (
        <>
          <label className="mt-3 flex flex-col gap-1.5">
            <span className={labelClass}>Importe total</span>
            <input
              name="principal"
              inputMode="decimal"
              placeholder="1200,00"
              required
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className={inputClass}
            />
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Cuotas</span>
              <input
                name="installments"
                type="number"
                min={1}
                max={600}
                required
                value={cuotas}
                onChange={(e) => setCuotas(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>
                TIN %{" "}
                <span className="font-normal text-zinc-400">opcional</span>
              </span>
              <input
                name="rate"
                inputMode="decimal"
                placeholder="0"
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          {cuotaCalculada > 0 && (
            <div className="mt-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>
                  Cuota mensual{" "}
                  <span className="font-normal text-zinc-500 dark:text-zinc-400">
                    calculada, puedes ajustarla
                  </span>
                </span>
                <input
                  name="payment"
                  inputMode="decimal"
                  value={
                    cuotaEditada ??
                    (cuotaCalculada / 100).toFixed(2).replace(".", ",")
                  }
                  onChange={(e) => setCuotaEditada(e.target.value)}
                  className={inputClass}
                />
              </label>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Total a pagar {formatCents(totalAPagar)}
                {intereses > 0 && ` · ${formatCents(intereses)} de intereses`}
              </p>
            </div>
          )}
        </>
      )}

      <label className="mt-3 flex flex-col gap-1.5">
        <span className={labelClass}>
          {kind === "INCOME" ? "Primer ingreso" : "Primer cobro"}
        </span>
        <input
          name="startDate"
          type="date"
          required
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {kind === "INCOME"
            ? "Se ingresará ese mismo día de cada mes."
            : "Se cobrará ese mismo día de cada mes."}
        </span>
      </label>

      {state.error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      {/* Aviso antes de crear cobros atrasados de golpe. El input oculto es lo
          que convierte el siguiente envío en una confirmación. */}
      {state.confirmar && (
        <div
          role="alert"
          className="mt-3 rounded-lg border p-3 text-sm"
          style={{
            borderColor: "var(--estado-critico)",
            color: "var(--estado-critico)",
          }}
        >
          <p className="flex items-start gap-1.5">
            <span aria-hidden>▲</span>
            <span>
              Se crearán{" "}
              <strong>
                {state.confirmar.cuantos}{" "}
                {kind === "INCOME" ? "ingresos atrasados" : "cobros atrasados"}
              </strong>{" "}
              desde el {state.confirmar.desde}, por un total de{" "}
              {formatCents(state.confirmar.totalCents)}.
            </span>
          </p>
          <p className="mt-1.5 text-zinc-600 dark:text-zinc-400">
            Si no era eso, revisa la fecha del primer{" "}
            {kind === "INCOME" ? "ingreso" : "cobro"}.
          </p>
          <input type="hidden" name="confirmado" value="1" />
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending
          ? "Guardando…"
          : state.confirmar
            ? `Sí, crear los ${kind === "INCOME" ? "ingresos" : "cobros"}`
            : "Crear"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import {
  changeOwnPasswordAction,
  type AccountFormState,
} from "@/lib/account-actions";

const initialState: AccountFormState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changeOwnPasswordAction,
    initialState,
  );

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");

  const [ultimo, setUltimo] = useState<string | undefined>();
  if (state.resetId && state.resetId !== ultimo) {
    setUltimo(state.resetId);
    setActual("");
    setNueva("");
    setRepetida("");
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400";
  const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

  return (
    <form
      action={formAction}
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Contraseña actual</span>
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className={labelClass}>Nueva contraseña</span>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Mínimo 8 caracteres.
        </span>
      </label>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className={labelClass}>Repite la nueva</span>
        <input
          name="repeatPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          className={inputClass}
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <div
          role="status"
          className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        >
          <p>{state.ok}</p>
          <Link
            href="/login"
            className="mt-1 inline-block font-medium underline underline-offset-4"
          >
            Ir a entrar de nuevo
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || Boolean(state.ok)}
        className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Cambiando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

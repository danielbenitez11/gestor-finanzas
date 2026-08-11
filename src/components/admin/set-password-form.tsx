"use client";

import { useActionState, useState } from "react";

import { setUserPasswordAction, type AdminFormState } from "@/lib/admin-actions";

const initialState: AdminFormState = {};

export function SetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    setUserPasswordAction,
    initialState,
  );
  const [clave, setClave] = useState("");

  const [ultimo, setUltimo] = useState<string | undefined>();
  if (state.resetId && state.resetId !== ultimo) {
    setUltimo(state.resetId);
    setClave("");
  }

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400">
        Cambiar contraseña
      </summary>

      <form action={formAction} className="mt-2 flex flex-wrap items-start gap-2">
        <input type="hidden" name="userId" value={userId} />
        <input
          name="newPassword"
          type="text"
          required
          minLength={8}
          placeholder="Nueva contraseña"
          autoComplete="off"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>

        {state.error && (
          <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p
            role="status"
            className="w-full text-sm text-emerald-600 dark:text-emerald-400"
          >
            {state.ok}
          </p>
        )}
      </form>
    </details>
  );
}

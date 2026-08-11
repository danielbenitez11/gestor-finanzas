"use client";

import { useActionState, useState } from "react";

import { createUserAction, type AdminFormState } from "@/lib/admin-actions";

const initialState: AdminFormState = {};

/** Genera una contraseña razonable para no tener que inventarla. */
function generarClave(): string {
  const alfabeto = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState,
  );

  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [esAdmin, setEsAdmin] = useState(false);

  // Vaciado tras crear, con el patrón de ajuste durante el renderizado.
  const [ultimo, setUltimo] = useState<string | undefined>();
  if (state.resetId && state.resetId !== ultimo) {
    setUltimo(state.resetId);
    setEmail("");
    setNombre("");
    setClave("");
    setEsAdmin(false);
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
        <span className={labelClass}>Correo</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="ana@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className={labelClass}>Nombre</span>
        <input
          name="name"
          required
          maxLength={60}
          placeholder="Ana"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className={labelClass}>Contraseña inicial</span>
        <input
          name="password"
          type="text"
          required
          minLength={8}
          autoComplete="off"
          placeholder="mínimo 8 caracteres"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setClave(generarClave())}
          className="self-start text-xs text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Generar una al azar
        </button>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Se ve en pantalla para que puedas copiarla y dársela. Que la cambie al
          entrar.
        </span>
      </label>

      <label className="mt-3 flex items-center gap-2">
        <input
          type="checkbox"
          name="role"
          value="admin"
          checked={esAdmin}
          onChange={(e) => setEsAdmin(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          Hacerlo administrador
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
      {state.ok && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        >
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Creando…" : "Crear usuario"}
      </button>
    </form>
  );
}

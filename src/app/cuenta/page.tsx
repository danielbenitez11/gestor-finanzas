import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function CuentaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader
        name={session.user.name}
        role={session.user.role}
        activo="cuenta"
      />

      <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mi cuenta
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {session.user.name} · {session.user.email}
        </p>

        <h2 className="mt-8 mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Cambiar la contraseña
        </h2>
        <ChangePasswordForm />
      </div>
    </main>
  );
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { pendiente } from "@/lib/debts";
import { AppHeader } from "@/components/app-header";
import { DebtForm } from "@/components/debt-form";
import { DebtRow, type FilaDeuda } from "@/components/debt-row";

const TARJETA =
  "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

const fecha = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function DeudasPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const deudas = await prisma.debt.findMany({
    where: { userId: session.user.id },
    orderBy: [{ date: "desc" }],
  });

  const pendientes = deudas.filter(
    (d) => pendiente(d.amountCents, d.settledCents) > 0,
  );
  const saldadas = deudas.filter(
    (d) => pendiente(d.amountCents, d.settledCents) === 0,
  );

  const totalMeDeben = pendientes
    .filter((d) => d.direction === "OWED_TO_ME")
    .reduce((s, d) => s + pendiente(d.amountCents, d.settledCents), 0);
  const totalDebo = pendientes
    .filter((d) => d.direction === "I_OWE")
    .reduce((s, d) => s + pendiente(d.amountCents, d.settledCents), 0);

  const aFila = (d: (typeof deudas)[number]): FilaDeuda => ({
    id: d.id,
    direction: d.direction,
    person: d.person,
    description: d.description,
    amountCents: d.amountCents,
    settledCents: d.settledCents,
    fechaTexto: fecha.format(d.date),
  });

  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader name={session.user.name} role={session.user.role} activo="deudas" />

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <div className={TARJETA}>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Te deben</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCents(totalMeDeben)}
            </p>
          </div>

          <div className={TARJETA}>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Debes</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {formatCents(totalDebo)}
            </p>
          </div>

          <div className={TARJETA}>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Si se salda todo
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {totalMeDeben - totalDebo > 0 ? "+" : ""}
              {formatCents(totalMeDeben - totalDebo)}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Nada de esto cuenta en tu saldo todavía.
            </p>
          </div>
        </section>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-4">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Anotar una deuda
            </h2>
            <DebtForm />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Pendientes
            </h2>
            {pendientes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No tienes nada pendiente. Ni debes ni te deben.
              </p>
            ) : (
              <ul className="grid gap-3">
                {pendientes.map((d) => (
                  <DebtRow key={d.id} deuda={aFila(d)} />
                ))}
              </ul>
            )}

            {saldadas.length > 0 && (
              <>
                <h2 className="mt-8 mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Saldadas
                </h2>
                <ul className="grid gap-3">
                  {saldadas.map((d) => (
                    <DebtRow key={d.id} deuda={aFila(d)} />
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

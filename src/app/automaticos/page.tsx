import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { esIngreso } from "@/lib/recurring";
import { generarCobrosPendientes } from "@/lib/recurring-generate";
import { AppHeader } from "@/components/app-header";
import { RecurringForm } from "@/components/recurring-form";
import { RecurringList } from "@/components/recurring-list";

const TARJETA =
  "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

export default async function AutomaticosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const userId = session.user.id;

  // Al entrar se ponen al día los cobros que tocaran. Es idempotente, así que
  // recargar la página cien veces no genera ni un movimiento de más.
  await generarCobrosPendientes(userId);

  const reglas = await prisma.recurringRule.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { charges: true } } },
  });

  const activas = reglas.filter((r) => r.active);
  const ingresoMensual = activas
    .filter((r) => esIngreso(r.kind))
    .reduce((suma, r) => suma + r.amountCents, 0);
  const gastoMensual = activas
    .filter((r) => !esIngreso(r.kind))
    .reduce((suma, r) => suma + r.amountCents, 0);
  const netoMensual = ingresoMensual - gastoMensual;

  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader
        name={session.user.name}
        role={session.user.role}
        activo="automaticos"
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {/* Tres cifras en vez de una: con ingresos automáticos, "comprometido"
            por sí solo no dice si el mes te cuadra. */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className={TARJETA}>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Entra cada mes
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCents(ingresoMensual)}
            </p>
          </div>

          <div className={TARJETA}>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Sale cada mes
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {formatCents(gastoMensual)}
            </p>
          </div>

          <div className={TARJETA}>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Te queda</p>
            <p
              className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50"
              style={netoMensual < 0 ? { color: "var(--estado-critico)" } : undefined}
            >
              {formatCents(netoMensual)}
            </p>
            {netoMensual < 0 && (
              <p
                className="mt-1 flex items-start gap-1 text-xs"
                style={{ color: "var(--estado-critico)" }}
              >
                <span aria-hidden>▲</span>
                <span>Lo automático ya se come más de lo que entra</span>
              </p>
            )}
          </div>
        </section>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-4">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nueva regla
            </h2>
            <RecurringForm />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Tus movimientos automáticos
            </h2>
            <RecurringList
              reglas={reglas.map((r) => ({
                id: r.id,
                kind: r.kind,
                name: r.name,
                amountCents: r.amountCents,
                dayOfMonth: r.dayOfMonth,
                startDate: r.startDate,
                totalInstallments: r.totalInstallments,
                principalCents: r.principalCents,
                active: r.active,
                cobrosHechos: r._count.charges,
              }))}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlySeries } from "@/lib/charts";
import { formatCents } from "@/lib/money";
import { generarCobrosPendientes } from "@/lib/recurring-generate";
import { AppHeader } from "@/components/app-header";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import { BalanceChart } from "@/components/charts/balance-chart";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";

const TARJETA =
  "rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

// Este es un Server Component: se ejecuta en el servidor, así que puede leer la
// base de datos directamente. Nada de esto llega al navegador del usuario.
export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  // El proxy ya redirige, pero lo repetimos aquí porque es esta comprobación
  // la que de verdad protege los datos.
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Pone al día las suscripciones y financiaciones antes de calcular nada, para
  // que el saldo que se muestra ya incluya los cobros que tocaban. Es
  // idempotente: si ya estaban creados, no hace nada.
  await generarCobrosPendientes(userId);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Las consultas son independientes, así que se lanzan a la vez en lugar de
  // una detrás de otra.
  const [balance, monthIncome, monthExpense, transactions, serieMensual] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: { userId },
        _sum: { amountCents: true },
      }),
      // Filtramos por tipo y no por signo: un ajuste de saldo inicial mueve el
      // balance, pero no es un ingreso del mes y contarlo como tal engañaría.
      prisma.transaction.aggregate({
        where: { userId, date: { gte: startOfMonth }, type: "INCOME" },
        _sum: { amountCents: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, date: { gte: startOfMonth }, type: "EXPENSE" },
        _sum: { amountCents: true },
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 50,
      }),
      getMonthlySeries(userId),
    ]);

  const balanceCents = balance._sum.amountCents ?? 0;
  const incomeCents = monthIncome._sum.amountCents ?? 0;
  const expenseCents = Math.abs(monthExpense._sum.amountCents ?? 0);

  // La alarma solo tiene sentido si hay ingresos con los que comparar. Si aún
  // no has apuntado la nómina del mes, cualquier gasto "superaría" los ingresos
  // y la app estaría en rojo permanente: una alarma que salta siempre deja de
  // avisar de nada.
  const gastandoDeMas = incomeCents > 0 && expenseCents > incomeCents;
  const excesoCents = expenseCents - incomeCents;

  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader
        name={session.user.name}
        role={session.user.role}
        activo="panel"
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* Fila de cifras. Las tres tarjetas miden lo mismo, pero el saldo manda
            por el tamaño del número: la jerarquía la marca la tipografía, no
            el tamaño de la caja. */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className={`${TARJETA} p-5`}>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Saldo actual
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatCents(balanceCents)}
            </p>
          </div>

          <div className={`${TARJETA} p-5`}>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ingresos este mes
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {formatCents(incomeCents)}
            </p>
          </div>

          <div className={`${TARJETA} p-5`}>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Gastos este mes
            </p>
            <p
              className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50"
              style={gastandoDeMas ? { color: "var(--estado-critico)" } : undefined}
            >
              {formatCents(expenseCents)}
            </p>

            {/* El color nunca va solo: quien no distinga el rojo debe recibir
                el mismo aviso por escrito. */}
            {gastandoDeMas && (
              <p
                className="mt-1.5 flex items-start gap-1 text-xs"
                style={{ color: "var(--estado-critico)" }}
              >
                <span aria-hidden>▲</span>
                <span>{formatCents(excesoCents)} por encima de tus ingresos</span>
              </p>
            )}
          </div>
        </section>

        {/* Lo que se usa a diario. `items-start` es lo que permite que la
            columna del formulario se quede pegada arriba mientras la lista de
            al lado sigue creciendo hacia abajo. */}
        <section className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-4">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nuevo movimiento
            </h2>
            <TransactionForm />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Movimientos
            </h2>
            <TransactionList items={transactions} />
          </div>
        </section>

        {/* Las gráficas van al final: se consultan de vez en cuando, no cada día.
            El minmax(0,1fr) no es decorativo: por defecto una celda de rejilla
            tiene min-width:auto y no puede encoger por debajo de su contenido.
            El ResponsiveContainer de Recharts mide su hueco, crece, vuelve a
            medir... y el navegador se queda colgado. Con minmax(0,...) la celda
            puede encoger y el bucle no llega a producirse. */}
        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <BalanceChart data={serieMensual} />
          <IncomeExpenseChart data={serieMensual} />
        </section>
      </div>
    </main>
  );
}

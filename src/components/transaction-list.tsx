import { TransactionRow, type FilaMovimiento } from "@/components/transaction-row";

type Item = {
  id: string;
  type: string;
  amountCents: number;
  description: string;
  date: Date;
  recurring?: { name: string } | null;
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** "2026-08-11" a partir de la fecha local, que es lo que espera <input date>. */
function aISO(fecha: Date): string {
  const offset = fecha.getTimezoneOffset() * 60_000;
  return new Date(fecha.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Las fechas se formatean aquí, en el servidor, y viajan ya como texto. Si las
 * formateara el componente de cliente y su zona horaria no coincidiera con la
 * del servidor, React se quejaría de que lo pintado no cuadra.
 */
export function TransactionList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Aún no has apuntado ningún movimiento.
      </p>
    );
  }

  const filas: FilaMovimiento[] = items.map((item) => ({
    id: item.id,
    type: item.type,
    amountCents: item.amountCents,
    description: item.description,
    fechaTexto: dateFormatter.format(item.date),
    fechaISO: aISO(item.date),
    generadoPor: item.recurring?.name ?? null,
  }));

  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {filas.map((fila) => (
        <TransactionRow key={fila.id} item={fila} />
      ))}
    </ul>
  );
}

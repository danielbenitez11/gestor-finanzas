import { deleteTransaction } from "@/lib/actions";
import { formatCents, TRANSACTION_LABELS, type TransactionType } from "@/lib/money";

type Item = {
  id: string;
  type: string;
  amountCents: number;
  description: string;
  date: Date;
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// Este es un Server Component, así que puede usar la Server Action directamente
// en el atributo action del formulario. Sin JavaScript de por medio.
export function TransactionList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Aún no has apuntado ningún movimiento.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
              {item.description}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {dateFormatter.format(item.date)}
              {" · "}
              {TRANSACTION_LABELS[item.type as TransactionType] ?? item.type}
            </p>
          </div>

          <span
            className={
              "shrink-0 font-medium tabular-nums " +
              (item.amountCents >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-900 dark:text-zinc-100")
            }
          >
            {item.amountCents > 0 ? "+" : ""}
            {formatCents(item.amountCents)}
          </span>

          <form action={deleteTransaction}>
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              aria-label={`Borrar ${item.description}`}
              className="rounded px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            >
              Borrar
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

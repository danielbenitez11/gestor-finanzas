"use client";

import { formatCents } from "@/lib/money";

/** Piezas compartidas por los dos gráficos, para que se vean como un sistema. */

export const EJE_TEXTO = "var(--chart-texto)";
export const EJE_LINEA = "var(--chart-eje)";
export const REJILLA = "var(--chart-rejilla)";
export const SUPERFICIE = "var(--chart-superficie)";
export const SERIE_1 = "var(--chart-serie-1)";
export const SERIE_2 = "var(--chart-serie-2)";

/** Céntimos a euros redondos para las marcas del eje: 291570 -> "2916". */
const ejeFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
});

export function formatEjeY(cents: number): string {
  return ejeFormatter.format(cents / 100);
}

export const ejeComun = {
  stroke: EJE_LINEA,
  tick: { fill: EJE_TEXTO, fontSize: 12 },
  tickLine: false,
} as const;

type SerieTooltip = { nombre: string; color: string; cents: number };

/**
 * Tooltip propio en lugar del de Recharts: el suyo pinta el texto del color de
 * la serie, y el texto debe llevar siempre color de texto. La identidad la da
 * el cuadradito de color que va al lado, no la letra.
 */
export function TooltipCaja({
  titulo,
  series,
}: {
  titulo: string;
  series: SerieTooltip[];
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">{titulo}</p>
      {series.map((s) => (
        <p
          key={s.nombre}
          className="flex items-center gap-2 text-sm text-zinc-900 dark:text-zinc-100"
        >
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: s.color }}
          />
          <span className="text-zinc-600 dark:text-zinc-400">{s.nombre}</span>
          <span className="ml-auto font-medium tabular-nums">
            {formatCents(s.cents)}
          </span>
        </p>
      ))}
    </div>
  );
}

/** Leyenda en HTML: el texto lleva color de texto y el color va en el cuadrito. */
export function Leyenda({ items }: { items: { nombre: string; color: string }[] }) {
  return (
    <ul className="mb-3 flex gap-4">
      {items.map((i) => (
        <li
          key={i.nombre}
          className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
        >
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: i.color }}
          />
          {i.nombre}
        </li>
      ))}
    </ul>
  );
}

/**
 * Todo gráfico lleva su tabla equivalente. Un gráfico que solo se puede leer
 * mirándolo deja fuera a quien use lector de pantalla, y además es la forma
 * cómoda de consultar la cifra exacta.
 */
export function TablaDatos({
  columnas,
  filas,
}: {
  columnas: string[];
  filas: { clave: string; celdas: string[] }[];
}) {
  return (
    <details className="mt-3 group">
      <summary className="cursor-pointer text-xs text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400">
        Ver los datos en una tabla
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              {columnas.map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  className={
                    "py-1.5 font-medium text-zinc-500 dark:text-zinc-400 " +
                    (i === 0 ? "text-left" : "text-right")
                  }
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr
                key={f.clave}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                {f.celdas.map((celda, i) => (
                  <td
                    key={i}
                    className={
                      "py-1.5 text-zinc-700 dark:text-zinc-300 " +
                      (i === 0 ? "text-left" : "text-right tabular-nums")
                    }
                  >
                    {celda}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

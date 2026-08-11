"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonthPoint } from "@/lib/charts";
import { formatCents } from "@/lib/money";
import {
  ejeComun,
  formatEjeY,
  Leyenda,
  REJILLA,
  SERIE_1,
  SERIE_2,
  TablaDatos,
  TooltipCaja,
} from "./chart-parts";

type TooltipProps = {
  active?: boolean;
  payload?: { payload: MonthPoint }[];
};

function ContenidoTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const punto = payload[0].payload;
  return (
    <TooltipCaja
      titulo={punto.labelLargo}
      series={[
        { nombre: "Ingresos", color: SERIE_1, cents: punto.ingresosCents },
        { nombre: "Gastos", color: SERIE_2, cents: punto.gastosCents },
      ]}
    />
  );
}

export function IncomeExpenseChart({ data }: { data: MonthPoint[] }) {
  return (
    <figure className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <figcaption className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Ingresos y gastos por mes
      </figcaption>

      {/* Con dos series la leyenda es obligatoria: nadie debería tener que
          adivinar la identidad emparejando colores de memoria. */}
      <Leyenda
        items={[
          { nombre: "Ingresos", color: SERIE_1 },
          { nombre: "Gastos", color: SERIE_2 },
        ]}
      />

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            // 2px de hueco entre las dos barras del mismo mes: es el fondo el
            // que las separa, nunca un borde dibujado alrededor.
            barGap={2}
            barCategoryGap="28%"
          >
            <CartesianGrid stroke={REJILLA} strokeWidth={1} vertical={false} />

            <XAxis dataKey="label" {...ejeComun} />
            <YAxis
              {...ejeComun}
              width={52}
              tickFormatter={formatEjeY}
              axisLine={false}
            />

            <Tooltip
              content={<ContenidoTooltip />}
              cursor={{ fill: REJILLA, fillOpacity: 0.35 }}
            />

            {/* Barras finas, con la punta redondeada y el pie recto sobre la
                línea base. Nunca ocupan toda la ranura: el aire sobrante ayuda. */}
            <Bar
              dataKey="ingresosCents"
              fill={SERIE_1}
              maxBarSize={24}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="gastosCents"
              fill={SERIE_2}
              maxBarSize={24}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <TablaDatos
        columnas={["Mes", "Ingresos", "Gastos"]}
        filas={data.map((d) => ({
          clave: d.key,
          celdas: [
            d.labelLargo,
            formatCents(d.ingresosCents),
            formatCents(d.gastosCents),
          ],
        }))}
      />
    </figure>
  );
}

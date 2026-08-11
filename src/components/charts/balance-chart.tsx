"use client";

import {
  Area,
  AreaChart,
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
  REJILLA,
  SERIE_1,
  SUPERFICIE,
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
      series={[{ nombre: "Saldo", color: SERIE_1, cents: punto.saldoCents }]}
    />
  );
}

export function BalanceChart({ data }: { data: MonthPoint[] }) {
  // Una sola serie no lleva leyenda: el título ya dice qué se está pintando.
  return (
    <figure className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <figcaption className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Evolución del saldo
        <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
          últimos 6 meses
        </span>
      </figcaption>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              {/* El relleno es un velo del propio color, no un bloque saturado. */}
              <linearGradient id="degradadoSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIE_1} stopOpacity={0.18} />
                <stop offset="100%" stopColor={SERIE_1} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            {/* Rejilla fina, continua y solo horizontal: debe quedar por detrás. */}
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
              cursor={{ stroke: REJILLA, strokeWidth: 1 }}
            />

            <Area
              type="monotone"
              dataKey="saldoCents"
              stroke={SERIE_1}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="url(#degradadoSaldo)"
              // Punto de 8px de diámetro con anillo del color del fondo, para
              // que se distinga aunque se cruce con la línea.
              dot={{ r: 4, fill: SERIE_1, stroke: SUPERFICIE, strokeWidth: 2 }}
              activeDot={{ r: 5, fill: SERIE_1, stroke: SUPERFICIE, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <TablaDatos
        columnas={["Mes", "Saldo al cierre"]}
        filas={data.map((d) => ({
          clave: d.key,
          celdas: [d.labelLargo, formatCents(d.saldoCents)],
        }))}
      />
    </figure>
  );
}

"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown } from "lucide-react";
import type { PontoSerie } from "@/lib/queries";
import { formatBRL } from "@/lib/utils";

// Cores via CSS custom properties → adaptam ao tema claro/escuro sozinhas.
const COR_PRIMARIA = "hsl(var(--primary))";
const COR_GRADE = "hsl(var(--border))";
const COR_TICK = "hsl(var(--muted-foreground))";

const fmtK = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

/** Chip estático "Este mês" (janela fixa nesta fase). */
function ChipPeriodo() {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
      Este mês <ChevronDown className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}

function CabecalhoGrafico({
  titulo,
  valor,
}: {
  readonly titulo: string;
  readonly valor?: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {valor && <p className="mt-0.5 text-2xl font-bold tabular-nums">{valor}</p>}
      </div>
      <ChipPeriodo />
    </div>
  );
}

interface TooltipItem {
  readonly value?: number;
  readonly payload?: PontoSerie;
}
function ConteudoTooltip({
  active,
  payload,
  chave,
}: {
  readonly active?: boolean;
  readonly payload?: TooltipItem[];
  readonly chave: "valor" | "acumulado";
}) {
  if (!active || !payload || payload.length === 0) return null;
  const ponto = payload[0]?.payload;
  if (!ponto) return null;
  const valor = chave === "valor" ? ponto.valor : ponto.acumulado;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{ponto.rotulo}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{formatBRL(valor)}</p>
    </div>
  );
}

/** Área — evolução do faturamento acumulado no mês. */
export function GraficoEvolucao({ serie }: { readonly serie: readonly PontoSerie[] }) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      role="img"
      aria-label="Gráfico de área: evolução do faturamento acumulado no mês"
    >
      <CabecalhoGrafico titulo="Evolução do faturamento" />
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={serie as PontoSerie[]} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="grad-evolucao" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR_PRIMARIA} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COR_PRIMARIA} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={COR_GRADE} strokeDasharray="3 3" />
          <XAxis
            dataKey="rotulo"
            tickLine={false}
            axisLine={false}
            tick={{ fill: COR_TICK, fontSize: 11 }}
            interval={Math.max(0, Math.floor(serie.length / 6))}
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: COR_TICK, fontSize: 11 }}
            tickFormatter={fmtK}
            width={44}
          />
          <Tooltip content={<ConteudoTooltip chave="acumulado" />} cursor={{ stroke: COR_GRADE }} />
          <Area
            type="monotone"
            dataKey="acumulado"
            stroke={COR_PRIMARIA}
            strokeWidth={2}
            fill="url(#grad-evolucao)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras — faturamento por dia no mês. */
export function GraficoFaturamento({
  serie,
  total,
}: {
  readonly serie: readonly PontoSerie[];
  readonly total: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      role="img"
      aria-label="Gráfico de barras: faturamento por dia no mês"
    >
      <CabecalhoGrafico titulo="Faturamento do mês" valor={total} />
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={serie as PontoSerie[]} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke={COR_GRADE} strokeDasharray="3 3" />
          <XAxis
            dataKey="rotulo"
            tickLine={false}
            axisLine={false}
            tick={{ fill: COR_TICK, fontSize: 11 }}
            interval={Math.max(0, Math.floor(serie.length / 6))}
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: COR_TICK, fontSize: 11 }}
            tickFormatter={fmtK}
            width={44}
          />
          <Tooltip content={<ConteudoTooltip chave="valor" />} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="valor" fill={COR_PRIMARIA} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

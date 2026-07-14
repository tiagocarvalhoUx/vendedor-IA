import { DollarSign, Percent, ShoppingBag, Flame, Inbox, Target } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { StatsOverview } from "@/lib/queries";

/** Lista compacta "Resumo rápido" (mesmos números do topo, em texto denso). */
export function ResumoRapido({ stats }: { readonly stats: StatsOverview }) {
  const linhas = [
    { Icone: DollarSign, rotulo: "Faturamento do mês", valor: formatBRL(stats.faturamentoMes) },
    { Icone: Percent, rotulo: "Comissão projetada (5%)", valor: formatBRL(stats.comissao) },
    { Icone: ShoppingBag, rotulo: "Pedidos no mês", valor: String(stats.pedidosNoMes) },
    { Icone: Flame, rotulo: "Clientes quentes", valor: String(stats.clientesQuentes) },
    { Icone: Inbox, rotulo: "Escalonamentos abertos", valor: String(stats.escalonamentosAbertos) },
    { Icone: Target, rotulo: "Meta de validação", valor: formatBRL(stats.meta) },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">Resumo rápido</h3>
      <ul className="mt-4 space-y-3">
        {linhas.map((l) => (
          <li key={l.rotulo} className="flex items-center gap-3 text-sm">
            <l.Icone className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            <span className="text-muted-foreground">{l.rotulo}</span>
            <span className="ml-auto font-medium tabular-nums">{l.valor}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

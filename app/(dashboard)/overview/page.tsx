import { DollarSign, Percent, ShoppingBag, Flame, Inbox } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import {
  obterStatsOverview,
  serieFaturamentoDiario,
  atividadeRecente,
} from "@/lib/queries";
import { HeroMeta } from "@/components/overview/hero-meta";
import { StatCard } from "@/components/overview/stat-card";
import { GraficoEvolucao, GraficoFaturamento } from "@/components/overview/charts";
import { ResumoRapido } from "@/components/overview/resumo-rapido";
import { AtividadeRecente } from "@/components/overview/atividade-recente";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [stats, serie, eventos] = await Promise.all([
    obterStatsOverview(),
    serieFaturamentoDiario(),
    atividadeRecente(),
  ]);

  return (
    <div className="space-y-5">
      <HeroMeta faturamento={stats.faturamentoMes} meta={stats.meta} progresso={stats.progresso} />

      {/* 5 indicadores */}
      <section
        aria-label="Indicadores principais"
        className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5"
      >
        <StatCard titulo="Faturamento do mês" valor={formatBRL(stats.faturamentoMes)} Icone={DollarSign} tom="verde" delta={stats.faturamentoDelta} />
        <StatCard titulo="Comissão projetada (5%)" valor={formatBRL(stats.comissao)} Icone={Percent} tom="violeta" delta={stats.comissaoDelta} />
        <StatCard titulo="Pedidos no mês" valor={String(stats.pedidosNoMes)} Icone={ShoppingBag} tom="azul" delta={stats.pedidosDelta} />
        <StatCard titulo="Clientes quentes" valor={String(stats.clientesQuentes)} Icone={Flame} tom="ambar" />
        <StatCard titulo="Escalonamentos abertos" valor={String(stats.escalonamentosAbertos)} Icone={Inbox} tom="teal" />
      </section>

      {/* 2 gráficos */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GraficoEvolucao serie={serie} />
        <GraficoFaturamento serie={serie} total={formatBRL(stats.faturamentoMes)} />
      </section>

      {/* 3 cards inferiores */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold">Meta de validação</h3>
          <p className="mt-3 text-3xl font-bold tabular-nums">{formatBRL(stats.meta)}</p>
          <div
            className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={stats.progresso}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${stats.progresso}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{stats.progresso}% concluído</p>
        </section>

        <ResumoRapido stats={stats} />
        <AtividadeRecente eventos={eventos} />
      </section>
    </div>
  );
}

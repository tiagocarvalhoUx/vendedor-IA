import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type TomStat = "verde" | "violeta" | "azul" | "ambar" | "teal";

const TOM: Record<TomStat, string> = {
  verde: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  violeta: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  azul: "bg-blue-500/12 text-blue-600 dark:text-blue-400",
  ambar: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  teal: "bg-teal-500/12 text-teal-600 dark:text-teal-400",
};

/**
 * Card de indicador. Ícone no topo; título e valor ocupam a largura TOTAL do
 * card (evita corte da moeda). Fonte do valor é responsiva para caber em telas
 * estreitas e no grid de 5 colunas.
 */
export function StatCard({
  titulo,
  valor,
  Icone,
  tom,
  delta,
}: {
  readonly titulo: string;
  readonly valor: string;
  readonly Icone: LucideIcon;
  readonly tom: TomStat;
  readonly delta?: number | null;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", TOM[tom])}>
        <Icone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>

      <p className="mt-3 text-xs leading-snug text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-lg font-bold leading-tight tabular-nums sm:text-xl">{valor}</p>

      {delta !== undefined && (
        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs">
          {delta === null ? (
            <span className="text-muted-foreground">sem base anterior</span>
          ) : (
            <>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  delta > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : delta < 0
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {delta > 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                ) : delta < 0 ? (
                  <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                )}
                {Math.abs(delta)}%
              </span>
              <span className="text-muted-foreground">vs mês anterior</span>
            </>
          )}
        </div>
      )}
    </article>
  );
}

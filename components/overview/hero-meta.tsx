import { Target } from "lucide-react";
import { formatBRL } from "@/lib/utils";

/** Hero da meta do mês: valor grande, barra de progresso e alvo decorativo. */
export function HeroMeta({
  faturamento,
  meta,
  progresso,
}: {
  readonly faturamento: number;
  readonly meta: number;
  readonly progresso: number;
}) {
  return (
    <section
      aria-label="Meta do mês"
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary to-card p-5 shadow-sm sm:p-6"
    >
      {/* Ondas decorativas ao fundo */}
      <svg
        className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 text-primary/10"
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0 120 Q100 80 200 120 T400 110 V200 H0 Z" fill="currentColor" />
        <path d="M0 150 Q120 120 240 150 T400 145 V200 H0 Z" fill="currentColor" opacity="0.6" />
      </svg>

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Meta do mês</p>
          <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">
            {formatBRL(faturamento)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">de {formatBRL(meta)}</p>

          <div className="mt-4 max-w-md">
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progresso}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-3xl font-bold text-primary tabular-nums">{progresso}%</p>
            <p className="text-sm text-muted-foreground">Progresso da meta</p>
          </div>
          <span className="hidden h-20 w-20 items-center justify-center rounded-full bg-primary/10 sm:flex">
            <Target className="h-10 w-10 text-primary" strokeWidth={1.5} aria-hidden />
          </span>
        </div>
      </div>
    </section>
  );
}

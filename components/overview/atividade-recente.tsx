import { ShoppingBag, Inbox, MessagesSquare } from "lucide-react";
import { formatRelativo } from "@/lib/utils";
import type { EventoAtividade } from "@/lib/queries";

const ICONE = {
  pedido: ShoppingBag,
  escalonamento: Inbox,
  conversa: MessagesSquare,
} as const;

const TOM = {
  pedido: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  escalonamento: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  conversa: "bg-blue-500/12 text-blue-600 dark:text-blue-400",
} as const;

/** Timeline "Atividade recente" — últimos eventos reais do sistema. */
export function AtividadeRecente({ eventos }: { readonly eventos: readonly EventoAtividade[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">Atividade recente</h3>
      {eventos.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Sem atividade ainda.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {eventos.map((e) => {
            const Icone = ICONE[e.tipo];
            return (
              <li key={e.id} className="flex items-start gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TOM[e.tipo]}`}>
                  <Icone className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{e.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.subtitulo}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatRelativo(e.quando)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

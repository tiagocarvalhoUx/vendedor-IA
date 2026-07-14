import { listarEscalonamentos } from "@/lib/queries";
import { StatusEscalonamentoBadge } from "@/components/dominio-badges";
import { formatData } from "@/lib/utils";
import { Inbox, User, Bot } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EscalonamentosPage() {
  const itens = await listarEscalonamentos();
  const abertos = itens.filter((i) => i.status === "aberto").length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Escalonamentos</h2>
        <p className="text-sm text-muted-foreground">
          Fila &ldquo;não sei&rdquo; para revisão humana — {abertos} aberto(s).
        </p>
      </div>

      {itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-sm font-medium">Nada na fila</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Quando a IA responder &ldquo;não sei&rdquo;, o caso aparece aqui.
          </p>
        </div>
      ) : (
        // Lista estilo inbox — cards empilhados (mobile-first), 2 colunas no desktop.
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {itens.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-snug">{e.pergunta}</p>
                <StatusEscalonamentoBadge status={e.status} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{e.motivo}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {e.cliente ?? "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bot className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {e.vendedor ?? "—"}
                </span>
                <span className="tabular-nums">{formatData(e.criadoEm)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { listarConversas } from "@/lib/queries";
import { CanalBadge, SentimentoBadge } from "@/components/dominio-badges";
import { formatData } from "@/lib/utils";
import { MessagesSquare, User, Bot } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConversasPage() {
  const conversas = await listarConversas();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Conversas</h2>
        <p className="text-sm text-muted-foreground">
          Transcrições, resumo e sentimento das interações.
        </p>
      </div>

      {conversas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <MessagesSquare className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-sm font-medium">Sem conversas ainda</p>
        </div>
      ) : (
        // Mobile-first: cards empilhados; no desktop, 2 colunas.
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {conversas.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <CanalBadge canal={c.canal} />
                <SentimentoBadge sentimento={c.sentimento} />
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  {formatData(c.criadoEm)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-snug">
                {c.resumo ?? <span className="text-muted-foreground">Sem resumo.</span>}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {c.cliente}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bot className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {c.vendedor}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

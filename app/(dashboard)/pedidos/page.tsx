import { listarPedidos } from "@/lib/queries";
import { PIPELINE } from "@/components/dominio-badges";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const pedidos = await listarPedidos();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Pedidos</h2>
        <p className="text-sm text-muted-foreground">
          Pipeline de {PIPELINE.length} etapas espelhando o Mercos.
        </p>
      </div>

      {/* Kanban horizontal: uma coluna por etapa. As colunas se ajustam à
          altura do próprio conteúdo (items-start); colunas cheias rolam por
          dentro (max-h + overflow) em vez de esticar a página. */}
      <div className="overflow-x-auto pb-2 scrollbar-suave">
        <div className="flex min-w-max items-start gap-4">
          {PIPELINE.map((col) => {
            const cartoes = pedidos.filter((p) => p.status === col.status);
            const total = cartoes.reduce((s, c) => s + c.valorTotal, 0);
            return (
              <section
                key={col.status}
                aria-label={col.rotulo}
                className="flex w-72 shrink-0 flex-col rounded-2xl border border-border bg-muted/30"
              >
                <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <span className="text-sm font-medium">{col.rotulo}</span>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {cartoes.length}
                  </span>
                </header>
                <div className="max-h-[calc(100dvh-16rem)] space-y-2 overflow-y-auto p-2 scrollbar-suave">
                  {cartoes.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                      vazio
                    </p>
                  ) : (
                    cartoes.map((c) => (
                      <article
                        key={c.id}
                        className="rounded-md border border-border bg-card p-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            {c.mercosPedidoId ?? "—"}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">{c.cliente}</p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-primary">
                          {formatBRL(c.valorTotal)}
                        </p>
                      </article>
                    ))
                  )}
                </div>
                {cartoes.length > 0 && (
                  <footer className="border-t border-border px-3 py-2 text-xs tabular-nums text-muted-foreground">
                    Total: {formatBRL(total)}
                  </footer>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

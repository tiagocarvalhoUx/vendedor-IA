import { listarCarteira } from "@/lib/queries";
import { formatData } from "@/lib/utils";
import { StatusClienteBadge } from "@/components/dominio-badges";
import { Badge } from "@/components/ui/badge";
import { AcoesContato } from "@/components/carteira/acoes-contato";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CarteiraPage() {
  const linhas = await listarCarteira();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Carteira</h2>
        <p className="text-sm text-muted-foreground">
          Clientes por vendedor, status e próximo toque. Wallet lock: 1 vendedor
          ativo por cliente.
        </p>
      </div>

      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Vendedor IA</th>
                <th className="px-4 py-3 font-medium">Último contato</th>
                <th className="px-4 py-3 font-medium">Cadência</th>
                <th className="px-4 py-3 font-medium">Próximo toque</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {linhas.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.nome}</div>
                    {c.empresa && (
                      <div className="text-xs text-muted-foreground">{c.empresa}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusClienteBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    {c.vendedor ?? (
                      <span className="text-xs text-muted-foreground">sem carteira</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatData(c.ultimoContato)}</td>
                  <td className="px-4 py-3 tabular-nums">{c.intervaloDias} dias</td>
                  <td className="px-4 py-3">
                    {c.optOut ? (
                      <Badge tom="vermelho">opt-out</Badge>
                    ) : c.toqueVencido ? (
                      <Badge tom="ambar">
                        <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                        vencido
                      </Badge>
                    ) : (
                      <Badge tom="verde">em dia</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AcoesContato clienteId={c.id} nome={c.nome} optOut={c.optOut} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

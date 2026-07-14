import { listarVendedores } from "@/lib/queries";
import { StatusVendedorBadge } from "@/components/dominio-badges";
import { Bot, Phone, Clock, Users } from "lucide-react";

export const dynamic = "force-dynamic";

/** "HH:MM:SS" → "HH:MM" (o Postgres devolve time com segundos). */
function hhmm(hora: string): string {
  return hora.slice(0, 5);
}

export default async function VendedoresPage() {
  const vendedores = await listarVendedores();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Vendedores IA</h2>
        <p className="text-sm text-muted-foreground">
          Frota horizontal — cada IA com número, chip e IP próprios.
        </p>
      </div>

      {vendedores.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Bot className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-sm font-medium">Nenhum vendedor configurado</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {vendedores.map((v) => (
            <li key={v.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="font-medium">{v.nome}</span>
                </div>
                <StatusVendedorBadge status={v.status} />
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{v.persona}</p>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                  <span className="tabular-nums">{v.numeroWhatsapp}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                  <span className="tabular-nums">
                    {hhmm(v.horarioInicio)}–{hhmm(v.horarioFim)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                  <span>
                    {v.clientesNaCarteira} cliente(s) na carteira
                  </span>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

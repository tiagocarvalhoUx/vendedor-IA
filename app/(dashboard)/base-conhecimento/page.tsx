import { listarConhecimento } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, CircleDashed } from "lucide-react";

export const dynamic = "force-dynamic";

const TIPO_ROTULO: Record<string, string> = {
  manual: "Manual",
  argumento: "Argumento",
  objecao: "Objeção",
};

export default async function BaseConhecimentoPage() {
  const itens = await listarConhecimento();
  const semEmbedding = itens.filter((i) => !i.temEmbedding).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Base de conhecimento</h2>
          <p className="text-sm text-muted-foreground">
            Fonte do RAG anti-alucinação. {semEmbedding > 0
              ? `${semEmbedding} item(ns) aguardando ingestão de embeddings.`
              : "Todos os itens com embedding."}
          </p>
        </div>
      </div>

      {itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-sm font-medium">Base vazia</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {itens.map((i) => (
            <li key={i.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tom="azul">{TIPO_ROTULO[i.tipo] ?? i.tipo}</Badge>
                {i.praga && <Badge tom="neutro">{i.praga}</Badge>}
                {i.produto && <Badge tom="verde">{i.produto}</Badge>}
                <span className="ml-auto">
                  {i.temEmbedding ? (
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      embedding
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CircleDashed className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      pendente
                    </span>
                  )}
                </span>
              </div>
              <p className="mt-3 text-sm leading-snug">{i.conteudo}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                {i.dosagem && <span>Dosagem: {i.dosagem}</span>}
                <span className="ml-auto">{i.fonte}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

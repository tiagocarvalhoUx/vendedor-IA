import {
  MessagesSquare,
  Filter,
  TrendingUp,
  Zap,
  Target,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";

// Ícones vetoriais + rótulos em HTML: legíveis em tema claro E escuro
// (o texto "queimado" dos PNGs só contrastava em fundo claro).
const RECURSOS: { readonly Icone: LucideIcon; readonly nome: string }[] = [
  { Icone: MessagesSquare, nome: "Conversas Inteligentes" },
  { Icone: Filter, nome: "Qualificação de Leads" },
  { Icone: TrendingUp, nome: "Crescimento Contínuo" },
  { Icone: Zap, nome: "Velocidade" },
  { Icone: Target, nome: "Precisão" },
  { Icone: ShieldCheck, nome: "Confiança" },
  { Icone: Workflow, nome: "Automação 24/7" },
];

/** Rodapé exibido em todas as abas do painel: faixa de recursos da VIA. */
export function Rodape() {
  return (
    <footer className="mt-10 border-t border-border pt-6">
      <ul className="mx-auto flex max-w-3xl flex-wrap items-start justify-center gap-x-6 gap-y-5">
        {RECURSOS.map(({ Icone, nome }) => (
          <li key={nome} className="flex w-20 flex-col items-center gap-2 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors">
              <Icone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-[11px] font-medium leading-tight text-muted-foreground">
              {nome}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        VIA — AI Sales Automation · © {new Date().getFullYear()}
      </p>
    </footer>
  );
}

import Image from "next/image";
import ic2 from "@/components/icons/icon-IA-2.png";
import ic3 from "@/components/icons/icon-IA-3.png";
import ic4 from "@/components/icons/icon-IA-4.png";
import ic5 from "@/components/icons/icon-IA-5.png";
import ic6 from "@/components/icons/icon-IA-6.png";
import ic7 from "@/components/icons/icon-IA-7.png";
import ic8 from "@/components/icons/icon-IA-8.png";

const ICONES = [
  { src: ic2, nome: "Conversas Inteligentes" },
  { src: ic3, nome: "Qualificação de Leads" },
  { src: ic4, nome: "Crescimento Contínuo" },
  { src: ic5, nome: "Velocidade" },
  { src: ic6, nome: "Precisão" },
  { src: ic7, nome: "Confiança" },
  { src: ic8, nome: "Automação 24/7" },
] as const;

/** Rodapé exibido em todas as abas do painel: faixa com os ícones de recurso. */
export function Rodape() {
  return (
    <footer className="mt-10 border-t border-border pt-6">
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
        {ICONES.map((i) => (
          <li key={i.nome} title={i.nome}>
            <Image
              src={i.src}
              alt={i.nome}
              width={112}
              height={112}
              className="h-16 w-16 object-contain opacity-80 transition-opacity hover:opacity-100 sm:h-20 sm:w-20"
            />
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        VIA — AI Sales Automation · © {new Date().getFullYear()}
      </p>
    </footer>
  );
}

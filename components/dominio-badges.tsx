import { Badge } from "@/components/ui/badge";
import type {
  StatusCliente,
  StatusPedido,
  StatusEscalonamento,
  Sentimento,
  CanalInteracao,
  StatusVendedorIA,
} from "@/types/domain";

// Rótulos e cores dos status de domínio, centralizados para consistência.

const CLIENTE: Record<StatusCliente, { rotulo: string; tom: "azul" | "ambar" | "vermelho" }> = {
  frio: { rotulo: "Frio", tom: "azul" },
  morno: { rotulo: "Morno", tom: "ambar" },
  quente: { rotulo: "Quente", tom: "vermelho" },
};

export function StatusClienteBadge({ status }: { readonly status: StatusCliente }) {
  const s = CLIENTE[status];
  return <Badge tom={s.tom}>{s.rotulo}</Badge>;
}

/** Ordem e rótulos do pipeline de 9 etapas (kanban). */
export const PIPELINE: { status: StatusPedido; rotulo: string }[] = [
  { status: "rascunho", rotulo: "Rascunho" },
  { status: "enviado_financeiro", rotulo: "Financeiro" },
  { status: "aprovado", rotulo: "Aprovado" },
  { status: "aguardando_pagamento", rotulo: "Aguard. pagamento" },
  { status: "pago", rotulo: "Pago" },
  { status: "faturado", rotulo: "Faturado" },
  { status: "enviado", rotulo: "Enviado" },
];

export function StatusEscalonamentoBadge({
  status,
}: {
  readonly status: StatusEscalonamento;
}) {
  return status === "aberto" ? (
    <Badge tom="ambar">Aberto</Badge>
  ) : (
    <Badge tom="verde">Resolvido</Badge>
  );
}

const SENTIMENTO: Record<Sentimento, { rotulo: string; tom: "verde" | "neutro" | "vermelho" }> = {
  positivo: { rotulo: "Positivo", tom: "verde" },
  neutro: { rotulo: "Neutro", tom: "neutro" },
  negativo: { rotulo: "Negativo", tom: "vermelho" },
};

export function SentimentoBadge({ sentimento }: { readonly sentimento: Sentimento | null }) {
  if (sentimento === null) return <Badge tom="neutro">—</Badge>;
  const s = SENTIMENTO[sentimento];
  return <Badge tom={s.tom}>{s.rotulo}</Badge>;
}

export function CanalBadge({ canal }: { readonly canal: CanalInteracao }) {
  return (
    <Badge tom={canal === "whatsapp" ? "verde" : "azul"}>
      {canal === "whatsapp" ? "WhatsApp" : "Ligação"}
    </Badge>
  );
}

const VENDEDOR: Record<StatusVendedorIA, { rotulo: string; tom: "verde" | "ambar" | "vermelho" }> = {
  ativo: { rotulo: "Ativo", tom: "verde" },
  pausado: { rotulo: "Pausado", tom: "ambar" },
  banido: { rotulo: "Banido", tom: "vermelho" },
};

export function StatusVendedorBadge({ status }: { readonly status: StatusVendedorIA }) {
  const s = VENDEDOR[status];
  return <Badge tom={s.tom}>{s.rotulo}</Badge>;
}

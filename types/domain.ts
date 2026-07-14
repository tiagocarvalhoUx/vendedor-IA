/**
 * Tipos de domínio do Vendedor de IA — Unno Ambiental.
 *
 * Espelham o schema Supabase (ver /supabase/migrations). Regra de ouro:
 * preço e estoque NUNCA são persistidos como verdade — vêm ao vivo do Mercos
 * (por isso o tipo `Produto` mora só no domínio do Mercos, não em `clientes`).
 */

// ───────────────────────────── Enums de domínio ─────────────────────────────

/** Temperatura do lead na jornada de vendas. */
export type StatusCliente = "frio" | "morno" | "quente";

/** Canal de uma interação com o cliente. */
export type CanalInteracao = "ligacao" | "whatsapp";

/** Análise de sentimento resumida de uma interação. */
export type Sentimento = "positivo" | "neutro" | "negativo";

/** Situação operacional de um vendedor de IA (frota horizontal). */
export type StatusVendedorIA = "ativo" | "pausado" | "banido";

/**
 * Ciclo de 9 etapas do pedido (§9 do briefing), espelhando o Mercos.
 * A ordem do array `ORDEM_PIPELINE` define o avanço no kanban.
 */
export type StatusPedido =
  | "rascunho"
  | "enviado_financeiro"
  | "aprovado"
  | "aguardando_pagamento"
  | "pago"
  | "faturado"
  | "enviado";

/** Situação de um item na fila de escalonamento humano. */
export type StatusEscalonamento = "aberto" | "resolvido";

/** Tipo de conteúdo na base de conhecimento RAG. */
export type TipoConhecimento = "manual" | "argumento" | "objecao";

// ───────────────────────────── Entidades ─────────────────────────────

export interface VendedorIA {
  readonly id: string;
  nome: string;
  persona: string;
  numero_whatsapp: string;
  chip: string;
  ip: string;
  /** Formato "HH:MM" — janela ativa (padrão 07:30). */
  horario_inicio: string;
  /** Formato "HH:MM" — janela ativa (padrão 18:00). */
  horario_fim: string;
  status: StatusVendedorIA;
  readonly created_at: string;
}

export interface Cliente {
  readonly id: string;
  /** Chave estrangeira lógica para o registro no Mercos. */
  mercos_id: string | null;
  nome: string;
  empresa: string | null;
  telefone: string | null;
  whatsapp: string | null;
  status: StatusCliente;
  /** Cadência de toque de manutenção (padrão 30 dias). */
  intervalo_contato_dias: number;
  ultimo_contato: string | null;
  /** WALLET LOCK: no máximo 1 vendedor ativo por cliente. */
  vendedor_ia_id: string | null;
  preferencias: Record<string, unknown>;
  /** LGPD: honrado em TODOS os canais. */
  opt_out: boolean;
}

export interface BaseConhecimento {
  readonly id: string;
  tipo: TipoConhecimento;
  praga: string | null;
  produto: string | null;
  dosagem: string | null;
  modo_uso: string | null;
  conteudo: string;
  fonte: string;
  /** Embedding OpenAI text-embedding-3-small (1536 dims). */
  embedding: readonly number[] | null;
}

export interface Interacao {
  readonly id: string;
  cliente_id: string;
  vendedor_ia_id: string;
  canal: CanalInteracao;
  transcricao: string | null;
  resumo: string | null;
  sentimento: Sentimento | null;
  readonly created_at: string;
}

/** Item de um pedido. Preço vem do Mercos no momento — snapshot para auditoria. */
export interface ItemPedido {
  mercos_produto_id: string;
  descricao: string;
  quantidade: number;
  /** Snapshot do preço no momento do pedido (auditoria, não fonte de verdade). */
  preco_unitario: number;
}

export interface Pedido {
  readonly id: string;
  cliente_id: string;
  vendedor_ia_id: string;
  mercos_pedido_id: string | null;
  status: StatusPedido;
  itens: readonly ItemPedido[];
  valor_total: number;
  frete: number;
  readonly created_at: string;
}

export interface Escalonamento {
  readonly id: string;
  cliente_id: string | null;
  vendedor_ia_id: string | null;
  pergunta: string;
  motivo: string;
  status: StatusEscalonamento;
  humano_responsavel: string | null;
  resposta: string | null;
  readonly created_at: string;
}

// ───────────────────── Domínio Mercos (ao vivo, nunca persistido) ─────────────────────

/** Produto do catálogo Mercos — preço/estoque SEMPRE ao vivo, nunca cacheados. */
export interface ProdutoMercos {
  readonly mercos_id: string;
  nome: string;
  /** Estoque ao vivo — consultado no momento, não persistido. */
  estoque: number;
  /** Preço ao vivo em reais — consultado no momento, não persistido. */
  preco: number;
  desconto_maximo: number;
  condicoes_pagamento: readonly string[];
}

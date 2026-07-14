import "server-only";
import { criarClienteServico } from "@/lib/supabase";
import { toqueVencido } from "@/lib/agendador";
import type {
  StatusCliente,
  StatusPedido,
  StatusEscalonamento,
  CanalInteracao,
  Sentimento,
  TipoConhecimento,
  StatusVendedorIA,
} from "@/types/domain";

/**
 * Camada de leitura do painel — SERVER-ONLY.
 *
 * Usa o service client (contexto de servidor confiável do operador único).
 * Preço/estoque continuam ao vivo no Mercos; aqui só lemos o que é do sistema
 * (carteira, pedidos, escalonamentos, metas).
 */

export const META_MENSAL = 100_000; // R$100k/mês (validação Fase 1)
export const COMISSAO_PCT = 0.05; // 5%

// ─────────────────────────── Overview ───────────────────────────

export interface ResumoOverview {
  readonly faturamentoMes: number;
  readonly meta: number;
  readonly progresso: number; // 0..100
  readonly comissaoProjetada: number;
  readonly pedidosNoMes: number;
  readonly escalonamentosAbertos: number;
  readonly clientesQuentes: number;
}

export async function obterResumoOverview(): Promise<ResumoOverview> {
  const supabase = criarClienteServico();
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  // Faturamento = pedidos pagos/faturados no mês corrente.
  const { data: pedidos, error: e1 } = await supabase
    .from("pedidos")
    .select("valor_total, status, created_at")
    .gte("created_at", inicioMes.toISOString())
    .in("status", ["pago", "faturado", "enviado"]);
  if (e1) throw new Error(`Overview/pedidos: ${e1.message}`);

  const linhas = (pedidos ?? []) as { valor_total: number }[];
  const faturamentoMes = linhas.reduce((s, p) => s + Number(p.valor_total), 0);

  const { count: escAbertos } = await supabase
    .from("escalonamentos")
    .select("*", { count: "exact", head: true })
    .eq("status", "aberto");

  const { count: quentes } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .eq("status", "quente");

  const progresso = Math.min(100, Math.round((faturamentoMes / META_MENSAL) * 100));

  return {
    faturamentoMes,
    meta: META_MENSAL,
    progresso,
    comissaoProjetada: faturamentoMes * COMISSAO_PCT,
    pedidosNoMes: linhas.length,
    escalonamentosAbertos: escAbertos ?? 0,
    clientesQuentes: quentes ?? 0,
  };
}

// ─────────────────────────── Stats do overview (com variação) ───────────────────────────

const STATUS_FATURADO = ["pago", "faturado", "enviado"] as const;

export interface StatsOverview {
  readonly faturamentoMes: number;
  readonly faturamentoDelta: number | null; // % vs mês anterior
  readonly comissao: number;
  readonly comissaoDelta: number | null;
  readonly pedidosNoMes: number;
  readonly pedidosDelta: number | null;
  readonly clientesQuentes: number;
  readonly escalonamentosAbertos: number;
  readonly meta: number;
  readonly progresso: number;
}

function delta(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null; // sem base de comparação → não inventa
  return Math.round(((atual - anterior) / anterior) * 100);
}

/** Soma o faturamento e conta pedidos faturados num intervalo. */
async function faturamentoNoIntervalo(
  supabase: ReturnType<typeof criarClienteServico>,
  deISO: string,
  ateISO?: string,
): Promise<{ total: number; count: number }> {
  let q = supabase
    .from("pedidos")
    .select("valor_total")
    .gte("created_at", deISO)
    .in("status", STATUS_FATURADO as unknown as string[]);
  if (ateISO) q = q.lt("created_at", ateISO);
  const { data, error } = await q;
  if (error) throw new Error(`Faturamento: ${error.message}`);
  const linhas = (data ?? []) as { valor_total: number }[];
  return {
    total: linhas.reduce((s, p) => s + Number(p.valor_total), 0),
    count: linhas.length,
  };
}

export async function obterStatsOverview(): Promise<StatsOverview> {
  const supabase = criarClienteServico();
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1).toISOString();

  const [atual, anterior] = await Promise.all([
    faturamentoNoIntervalo(supabase, inicioMes),
    faturamentoNoIntervalo(supabase, inicioMesAnterior, inicioMes),
  ]);

  const { count: quentes } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .eq("status", "quente");

  const { count: escAbertos } = await supabase
    .from("escalonamentos")
    .select("*", { count: "exact", head: true })
    .eq("status", "aberto");

  const progresso = Math.min(100, Math.round((atual.total / META_MENSAL) * 100));
  const dFat = delta(atual.total, anterior.total);

  return {
    faturamentoMes: atual.total,
    faturamentoDelta: dFat,
    comissao: atual.total * COMISSAO_PCT,
    comissaoDelta: dFat,
    pedidosNoMes: atual.count,
    pedidosDelta: delta(atual.count, anterior.count),
    clientesQuentes: quentes ?? 0,
    escalonamentosAbertos: escAbertos ?? 0,
    meta: META_MENSAL,
    progresso,
  };
}

// ─────────────────────────── Série diária (gráficos) ───────────────────────────

export interface PontoSerie {
  readonly dia: string; // "DD"
  readonly rotulo: string; // "DD/MM"
  readonly valor: number; // faturado no dia
  readonly acumulado: number; // acumulado no mês
}

export async function serieFaturamentoDiario(): Promise<PontoSerie[]> {
  const supabase = criarClienteServico();
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth();
  const inicioMes = new Date(ano, mes, 1).toISOString();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const { data, error } = await supabase
    .from("pedidos")
    .select("valor_total, created_at")
    .gte("created_at", inicioMes)
    .in("status", STATUS_FATURADO as unknown as string[]);
  if (error) throw new Error(`Série: ${error.message}`);

  const porDia = new Array<number>(diasNoMes).fill(0);
  for (const p of (data ?? []) as { valor_total: number; created_at: string }[]) {
    const d = new Date(p.created_at);
    const idx = d.getDate() - 1;
    if (idx >= 0 && idx < diasNoMes) porDia[idx] = (porDia[idx] ?? 0) + Number(p.valor_total);
  }

  const mm = String(mes + 1).padStart(2, "0");
  let acc = 0;
  return porDia.map((v, i) => {
    acc += v;
    const dd = String(i + 1).padStart(2, "0");
    return { dia: dd, rotulo: `${dd}/${mm}`, valor: v, acumulado: acc };
  });
}

// ─────────────────────────── Atividade recente ───────────────────────────

export interface EventoAtividade {
  readonly id: string;
  readonly tipo: "pedido" | "escalonamento" | "conversa";
  readonly titulo: string;
  readonly subtitulo: string;
  readonly quando: string; // ISO
}

export async function atividadeRecente(): Promise<EventoAtividade[]> {
  const supabase = criarClienteServico();

  const [ped, esc, intr] = await Promise.all([
    supabase.from("pedidos").select("id, mercos_pedido_id, status, created_at").order("created_at", { ascending: false }).limit(4),
    supabase.from("escalonamentos").select("id, pergunta, created_at").order("created_at", { ascending: false }).limit(4),
    supabase.from("interacoes").select("id, resumo, created_at").order("created_at", { ascending: false }).limit(4),
  ]);

  const eventos: EventoAtividade[] = [];
  for (const p of (ped.data ?? []) as { id: string; mercos_pedido_id: string | null; status: string; created_at: string }[]) {
    eventos.push({
      id: `ped-${p.id}`,
      tipo: "pedido",
      titulo: "Pedido atualizado",
      subtitulo: `${p.mercos_pedido_id ?? "—"} · ${p.status.replace(/_/g, " ")}`,
      quando: p.created_at,
    });
  }
  for (const e of (esc.data ?? []) as { id: string; pergunta: string; created_at: string }[]) {
    eventos.push({
      id: `esc-${e.id}`,
      tipo: "escalonamento",
      titulo: "Novo escalonamento",
      subtitulo: e.pergunta,
      quando: e.created_at,
    });
  }
  for (const i of (intr.data ?? []) as { id: string; resumo: string | null; created_at: string }[]) {
    eventos.push({
      id: `int-${i.id}`,
      tipo: "conversa",
      titulo: "Nova interação",
      subtitulo: i.resumo ?? "Conversa registrada",
      quando: i.created_at,
    });
  }

  return eventos
    .sort((a, b) => new Date(b.quando).getTime() - new Date(a.quando).getTime())
    .slice(0, 5);
}

// ─────────────────────────── Notificações ───────────────────────────

export interface NotificacaoView {
  readonly id: string;
  readonly titulo: string;
  readonly mensagem: string;
  readonly valor: number | null;
  readonly lida: boolean;
  readonly criadoEm: string;
}

interface RawNotificacao {
  id: string;
  titulo: string;
  mensagem: string;
  valor: number | null;
  lida: boolean;
  created_at: string;
}

/** Últimas notificações + total de não lidas (para o sino). SERVER-ONLY. */
export async function listarNotificacoes(
  limite = 20,
): Promise<{ itens: NotificacaoView[]; naoLidas: number }> {
  const supabase = criarClienteServico();

  const [lista, contagem] = await Promise.all([
    supabase
      .from("notificacoes")
      .select("id, titulo, mensagem, valor, lida, created_at")
      .order("created_at", { ascending: false })
      .limit(limite),
    supabase
      .from("notificacoes")
      .select("*", { count: "exact", head: true })
      .eq("lida", false),
  ]);

  if (lista.error) throw new Error(`Notificações: ${lista.error.message}`);

  const itens = ((lista.data ?? []) as RawNotificacao[]).map((n) => ({
    id: n.id,
    titulo: n.titulo,
    mensagem: n.mensagem,
    valor: n.valor === null ? null : Number(n.valor),
    lida: n.lida,
    criadoEm: n.created_at,
  }));

  return { itens, naoLidas: contagem.count ?? 0 };
}

/** Marca todas as notificações como lidas. SERVER-ONLY. */
export async function marcarNotificacoesLidas(): Promise<void> {
  const supabase = criarClienteServico();
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("lida", false);
  if (error) throw new Error(`Marcar lidas: ${error.message}`);
}

// ─────────────────────────── Carteira ───────────────────────────

export interface LinhaCarteira {
  readonly id: string;
  readonly nome: string;
  readonly empresa: string | null;
  readonly status: StatusCliente;
  readonly vendedor: string | null;
  readonly ultimoContato: string | null;
  readonly intervaloDias: number;
  readonly optOut: boolean;
  readonly toqueVencido: boolean;
}

interface RawCarteira {
  id: string;
  nome: string;
  empresa: string | null;
  status: StatusCliente;
  ultimo_contato: string | null;
  intervalo_contato_dias: number;
  opt_out: boolean;
  vendedores_ia: { nome: string } | null;
}

export async function listarCarteira(): Promise<LinhaCarteira[]> {
  const supabase = criarClienteServico();
  const { data, error } = await supabase
    .from("clientes")
    .select(
      "id, nome, empresa, status, ultimo_contato, intervalo_contato_dias, opt_out, " +
        "vendedores_ia(nome)",
    )
    .order("nome");
  if (error) throw new Error(`Carteira: ${error.message}`);

  const agora = new Date();
  return ((data ?? []) as unknown as RawCarteira[]).map((c) => ({
    id: c.id,
    nome: c.nome,
    empresa: c.empresa,
    status: c.status,
    vendedor: c.vendedores_ia?.nome ?? null,
    ultimoContato: c.ultimo_contato,
    intervaloDias: c.intervalo_contato_dias,
    optOut: c.opt_out,
    toqueVencido: c.opt_out
      ? false
      : toqueVencido(c.ultimo_contato, c.intervalo_contato_dias, agora),
  }));
}

// ─────────────────────────── Pedidos (kanban) ───────────────────────────

export interface CartaoPedido {
  readonly id: string;
  readonly mercosPedidoId: string | null;
  readonly cliente: string;
  readonly valorTotal: number;
  readonly status: StatusPedido;
}

interface RawPedido {
  id: string;
  mercos_pedido_id: string | null;
  valor_total: number;
  status: StatusPedido;
  clientes: { nome: string } | null;
}

export async function listarPedidos(): Promise<CartaoPedido[]> {
  const supabase = criarClienteServico();
  const { data, error } = await supabase
    .from("pedidos")
    .select("id, mercos_pedido_id, valor_total, status, clientes(nome)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Pedidos: ${error.message}`);

  return ((data ?? []) as unknown as RawPedido[]).map((p) => ({
    id: p.id,
    mercosPedidoId: p.mercos_pedido_id,
    cliente: p.clientes?.nome ?? "—",
    valorTotal: Number(p.valor_total),
    status: p.status,
  }));
}

// ─────────────────────────── Escalonamentos ───────────────────────────

export interface ItemEscalonamento {
  readonly id: string;
  readonly pergunta: string;
  readonly motivo: string;
  readonly status: StatusEscalonamento;
  readonly cliente: string | null;
  readonly vendedor: string | null;
  readonly criadoEm: string;
}

interface RawEscalonamento {
  id: string;
  pergunta: string;
  motivo: string;
  status: StatusEscalonamento;
  created_at: string;
  clientes: { nome: string } | null;
  vendedores_ia: { nome: string } | null;
}

export async function listarEscalonamentos(): Promise<ItemEscalonamento[]> {
  const supabase = criarClienteServico();
  const { data, error } = await supabase
    .from("escalonamentos")
    .select("id, pergunta, motivo, status, created_at, clientes(nome), vendedores_ia(nome)")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Escalonamentos: ${error.message}`);

  return ((data ?? []) as unknown as RawEscalonamento[]).map((e) => ({
    id: e.id,
    pergunta: e.pergunta,
    motivo: e.motivo,
    status: e.status,
    cliente: e.clientes?.nome ?? null,
    vendedor: e.vendedores_ia?.nome ?? null,
    criadoEm: e.created_at,
  }));
}

// ─────────────────────────── Conversas ───────────────────────────

export interface LinhaConversa {
  readonly id: string;
  readonly cliente: string;
  readonly vendedor: string;
  readonly canal: CanalInteracao;
  readonly resumo: string | null;
  readonly sentimento: Sentimento | null;
  readonly criadoEm: string;
}

interface RawConversa {
  id: string;
  canal: CanalInteracao;
  resumo: string | null;
  sentimento: Sentimento | null;
  created_at: string;
  clientes: { nome: string } | null;
  vendedores_ia: { nome: string } | null;
}

export async function listarConversas(): Promise<LinhaConversa[]> {
  const supabase = criarClienteServico();
  const { data, error } = await supabase
    .from("interacoes")
    .select("id, canal, resumo, sentimento, created_at, clientes(nome), vendedores_ia(nome)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Conversas: ${error.message}`);

  return ((data ?? []) as unknown as RawConversa[]).map((i) => ({
    id: i.id,
    cliente: i.clientes?.nome ?? "—",
    vendedor: i.vendedores_ia?.nome ?? "—",
    canal: i.canal,
    resumo: i.resumo,
    sentimento: i.sentimento,
    criadoEm: i.created_at,
  }));
}

// ─────────────────────────── Base de conhecimento ───────────────────────────

export interface ItemConhecimento {
  readonly id: string;
  readonly tipo: TipoConhecimento;
  readonly praga: string | null;
  readonly produto: string | null;
  readonly dosagem: string | null;
  readonly conteudo: string;
  readonly fonte: string;
  readonly temEmbedding: boolean;
}

interface RawConhecimento {
  id: string;
  tipo: TipoConhecimento;
  praga: string | null;
  produto: string | null;
  dosagem: string | null;
  conteudo: string;
  fonte: string;
  embedding: unknown | null;
}

export async function listarConhecimento(): Promise<ItemConhecimento[]> {
  const supabase = criarClienteServico();
  // Selecionamos o embedding só para saber se existe (status de ingestão).
  const { data, error } = await supabase
    .from("base_conhecimento")
    .select("id, tipo, praga, produto, dosagem, conteudo, fonte, embedding")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Conhecimento: ${error.message}`);

  return ((data ?? []) as unknown as RawConhecimento[]).map((b) => ({
    id: b.id,
    tipo: b.tipo,
    praga: b.praga,
    produto: b.produto,
    dosagem: b.dosagem,
    conteudo: b.conteudo,
    fonte: b.fonte,
    temEmbedding: b.embedding !== null,
  }));
}

// ─────────────────────────── Vendedores IA ───────────────────────────

export interface CardVendedor {
  readonly id: string;
  readonly nome: string;
  readonly persona: string;
  readonly numeroWhatsapp: string;
  readonly horarioInicio: string;
  readonly horarioFim: string;
  readonly status: StatusVendedorIA;
  readonly clientesNaCarteira: number;
}

interface RawVendedor {
  id: string;
  nome: string;
  persona: string;
  numero_whatsapp: string;
  horario_inicio: string;
  horario_fim: string;
  status: StatusVendedorIA;
  clientes: { count: number }[];
}

export async function listarVendedores(): Promise<CardVendedor[]> {
  const supabase = criarClienteServico();
  // `clientes(count)` traz o tamanho da carteira de cada vendedor.
  const { data, error } = await supabase
    .from("vendedores_ia")
    .select(
      "id, nome, persona, numero_whatsapp, horario_inicio, horario_fim, status, clientes(count)",
    )
    .order("nome");
  if (error) throw new Error(`Vendedores: ${error.message}`);

  return ((data ?? []) as unknown as RawVendedor[]).map((v) => ({
    id: v.id,
    nome: v.nome,
    persona: v.persona,
    numeroWhatsapp: v.numero_whatsapp,
    horarioInicio: v.horario_inicio,
    horarioFim: v.horario_fim,
    status: v.status,
    clientesNaCarteira: v.clientes?.[0]?.count ?? 0,
  }));
}

import { requireServerEnv } from "@/lib/env";
import type { ProdutoMercos } from "@/types/domain";

/**
 * Cliente REST do Mercos — SERVER-ONLY (tokens jamais no browser, §7).
 *
 * Regra de ouro: preço/estoque SEMPRE ao vivo (§5) — este cliente busca sob
 * demanda e NUNCA persiste esses valores como fonte de verdade.
 *
 * Resiliência (§6): retry com backoff exponencial; se persistir, o chamador
 * marca a interação como `pendente_integracao` e alerta o operador — nunca
 * prossegue uma venda sem preço/estoque confirmados.
 */

export class MercosIndisponivelError extends Error {
  constructor(mensagem: string) {
    super(`MERCOS_INDISPONIVEL: ${mensagem}`);
    this.name = "MercosIndisponivelError";
  }
}

interface OpcoesRequisicao {
  readonly metodo?: "GET" | "POST" | "PUT";
  readonly corpo?: unknown;
  /** Nº máximo de tentativas (default 3) com backoff exponencial. */
  readonly tentativas?: number;
}

/** Calcula o atraso do backoff (ms) para a enésima tentativa (base 300ms). */
export function backoffMs(tentativa: number): number {
  return Math.min(300 * 2 ** tentativa, 5_000);
}

async function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Requisição tipada ao Mercos com autenticação e retry/backoff. */
async function requisitar<T>(
  caminho: string,
  { metodo = "GET", corpo, tentativas = 3 }: OpcoesRequisicao = {},
): Promise<T> {
  const base = requireServerEnv("MERCOS_API_URL").replace(/\/$/, "");
  const url = `${base}${caminho}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ApplicationToken: requireServerEnv("MERCOS_APPLICATION_TOKEN"),
    CompanyToken: requireServerEnv("MERCOS_COMPANY_TOKEN"),
  };

  let ultimoErro: unknown = null;
  for (let tentativa = 0; tentativa < tentativas; tentativa++) {
    try {
      const resp = await fetch(url, {
        method: metodo,
        headers,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        cache: "no-store", // preço/estoque nunca cacheados
      });
      if (resp.status >= 500) {
        throw new MercosIndisponivelError(`HTTP ${resp.status} em ${caminho}`);
      }
      if (!resp.ok) {
        // Erro 4xx é do cliente/dado — não adianta repetir.
        const texto = await resp.text();
        throw new Error(`Mercos ${resp.status}: ${texto}`);
      }
      return (await resp.json()) as T;
    } catch (erro) {
      ultimoErro = erro;
      const recuperavel =
        erro instanceof MercosIndisponivelError ||
        (erro instanceof TypeError); // falha de rede
      if (!recuperavel || tentativa === tentativas - 1) break;
      await esperar(backoffMs(tentativa));
    }
  }
  throw ultimoErro instanceof Error
    ? ultimoErro
    : new MercosIndisponivelError(String(ultimoErro));
}

// Forma bruta esperada da REST do Mercos (ajustar aos campos reais da conta).
interface ProdutoMercosRaw {
  id: number | string;
  nome: string;
  estoque?: number;
  preco?: number;
  desconto_maximo?: number;
  condicoes_pagamento?: string[];
}

/** Normaliza o produto bruto do Mercos para o tipo de domínio. */
export function normalizarProduto(raw: ProdutoMercosRaw): ProdutoMercos {
  return {
    mercos_id: String(raw.id),
    nome: raw.nome,
    estoque: raw.estoque ?? 0,
    preco: raw.preco ?? 0,
    desconto_maximo: raw.desconto_maximo ?? 0,
    condicoes_pagamento: raw.condicoes_pagamento ?? [],
  };
}

/** Busca UM produto ao vivo (preço/estoque do momento). */
export async function buscarProduto(mercosId: string): Promise<ProdutoMercos> {
  const raw = await requisitar<ProdutoMercosRaw>(`/produtos/${mercosId}`);
  return normalizarProduto(raw);
}

/** Lista o catálogo ao vivo. */
export async function listarProdutos(): Promise<ProdutoMercos[]> {
  const raw = await requisitar<ProdutoMercosRaw[]>(`/produtos`);
  return raw.map(normalizarProduto);
}

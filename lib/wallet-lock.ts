/**
 * Wallet lock — carteira exclusiva por vendedor de IA.
 *
 * Regra inegociável (§7): duas IAs NUNCA falam com o mesmo cliente.
 * A DECISÃO é pura (`avaliarAtribuicao`); a EFETIVAÇÃO atômica delega à função
 * SQL `atribuir_cliente` (0002), que serializa corridas com `for update`.
 */

/** Resultado da avaliação de atribuição de um cliente a um vendedor. */
export type ResultadoAtribuicao =
  | { readonly permitido: true; readonly motivo: "livre" | "mesmo_dono" }
  | { readonly permitido: false; readonly motivo: "conflito"; readonly donoAtual: string };

/**
 * Decide, de forma PURA, se `novoVendedor` pode assumir o cliente.
 * Espelha exatamente a lógica da função SQL, permitindo testar a regra sem banco.
 *
 * @param donoAtual  vendedor atual do cliente (`null` = sem dono)
 * @param novoVendedor vendedor que deseja assumir
 */
export function avaliarAtribuicao(
  donoAtual: string | null,
  novoVendedor: string,
): ResultadoAtribuicao {
  if (donoAtual === null) {
    return { permitido: true, motivo: "livre" };
  }
  if (donoAtual === novoVendedor) {
    return { permitido: true, motivo: "mesmo_dono" }; // idempotente
  }
  return { permitido: false, motivo: "conflito", donoAtual };
}

/** Erro específico de conflito de carteira (mapeável na API para HTTP 409). */
export class WalletLockConflictError extends Error {
  constructor(
    public readonly clienteId: string,
    public readonly donoAtual: string,
  ) {
    super(
      `WALLET_LOCK_CONFLICT: cliente ${clienteId} já pertence a ${donoAtual}.`,
    );
    this.name = "WalletLockConflictError";
  }
}

/**
 * Efetiva a atribuição de forma atômica via RPC `atribuir_cliente`.
 * SERVER-ONLY. Traduz o erro do Postgres em `WalletLockConflictError`.
 */
export async function atribuirCliente(
  clienteId: string,
  vendedorId: string,
): Promise<void> {
  const { criarClienteServico } = await import("@/lib/supabase");
  const supabase = criarClienteServico();

  const { error } = await supabase.rpc("atribuir_cliente", {
    p_cliente_id: clienteId,
    p_vendedor_id: vendedorId,
  });

  if (error) {
    if (error.message.includes("WALLET_LOCK_CONFLICT")) {
      // Recupera o dono atual para um erro rico (corrida resolvida no banco).
      const { data } = await supabase
        .from("clientes")
        .select("vendedor_ia_id")
        .eq("id", clienteId)
        .single();
      const dono = (data as { vendedor_ia_id: string | null } | null)
        ?.vendedor_ia_id;
      throw new WalletLockConflictError(clienteId, dono ?? "desconhecido");
    }
    throw new Error(`Falha ao atribuir cliente: ${error.message}`);
  }
}

/** Libera o cliente da carteira (opt-out, rebalanceamento). SERVER-ONLY. */
export async function liberarCliente(clienteId: string): Promise<void> {
  const { criarClienteServico } = await import("@/lib/supabase");
  const supabase = criarClienteServico();
  const { error } = await supabase.rpc("liberar_cliente", {
    p_cliente_id: clienteId,
  });
  if (error) {
    throw new Error(`Falha ao liberar cliente: ${error.message}`);
  }
}

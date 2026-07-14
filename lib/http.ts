import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { WalletLockConflictError } from "@/lib/wallet-lock";
import { MercosIndisponivelError } from "@/lib/mercos";

/**
 * Helpers de resposta HTTP para os Route Handlers.
 *
 * Centraliza o mapeamento de erros de domínio → status, para que cada rota
 * fique enxuta e os contratos de erro sejam consistentes (§6 do prompt).
 */

/** Resposta de sucesso tipada. */
export function ok<T>(dados: T, status = 200): NextResponse {
  return NextResponse.json(dados, { status });
}

/** Resposta de erro padronizada: `{ erro, detalhe? }`. */
export function erro(mensagem: string, status: number, detalhe?: unknown): NextResponse {
  return NextResponse.json(
    detalhe === undefined ? { erro: mensagem } : { erro: mensagem, detalhe },
    { status },
  );
}

/**
 * Envolve o handler capturando erros conhecidos e mapeando para o status certo:
 *  • ZodError                 → 400 (entrada inválida)
 *  • WalletLockConflictError  → 409 (carteira já ocupada)
 *  • MercosIndisponivelError  → 503 (integração fora do ar; retry esgotado)
 *  • demais                   → 500
 */
export function comTratamentoDeErro(
  handler: (req: Request) => Promise<NextResponse>,
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof ZodError) {
        return erro("Entrada inválida.", 400, e.flatten());
      }
      if (e instanceof WalletLockConflictError) {
        return erro(e.message, 409, {
          clienteId: e.clienteId,
          donoAtual: e.donoAtual,
        });
      }
      if (e instanceof MercosIndisponivelError) {
        return erro(
          "Mercos indisponível. Marque a interação como pendente_integracao e alerte o operador.",
          503,
        );
      }
      const mensagem = e instanceof Error ? e.message : "Erro desconhecido.";
      return erro(mensagem, 500);
    }
  };
}

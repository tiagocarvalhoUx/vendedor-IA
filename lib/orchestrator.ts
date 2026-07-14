import { podeContatarAgora } from "@/lib/agendador";

/**
 * Orquestração de toques — decide QUEM contatar agora, respeitando janela,
 * cadência e opt-out (§5). SERVER-ONLY (usa service_role).
 *
 * A regra de elegibilidade é a função pura `podeContatarAgora`; aqui só
 * buscamos os dados e aplicamos a regra por cliente, usando a janela do
 * vendedor dono da carteira.
 */

/** Cliente elegível para um toque de manutenção, com o vendedor responsável. */
export interface ClienteElegivel {
  readonly cliente_id: string;
  readonly nome: string;
  readonly vendedor_ia_id: string;
  readonly ultimo_contato: string | null;
  readonly intervalo_contato_dias: number;
}

// Forma da linha retornada pelo join clientes × vendedores_ia.
interface LinhaClienteVendedor {
  id: string;
  nome: string;
  opt_out: boolean;
  ultimo_contato: string | null;
  intervalo_contato_dias: number;
  vendedor_ia_id: string;
  vendedores_ia: {
    horario_inicio: string;
    horario_fim: string;
    status: string;
  } | null;
}

/**
 * Lista clientes elegíveis para contato ATIVO neste instante.
 * Só entram os que: têm dono ativo, não deram opt-out, estão na janela do
 * vendedor e cujo toque venceu.
 */
export async function listarElegiveisParaToque(
  agora: Date = new Date(),
): Promise<ClienteElegivel[]> {
  const { criarClienteServico } = await import("@/lib/supabase");
  const supabase = criarClienteServico();

  const { data, error } = await supabase
    .from("clientes")
    .select(
      "id, nome, opt_out, ultimo_contato, intervalo_contato_dias, vendedor_ia_id, " +
        "vendedores_ia!inner(horario_inicio, horario_fim, status)",
    )
    .eq("opt_out", false)
    .not("vendedor_ia_id", "is", null);

  if (error) {
    throw new Error(`Falha ao listar clientes: ${error.message}`);
  }

  const linhas = (data ?? []) as unknown as LinhaClienteVendedor[];

  return linhas
    .filter((l) => l.vendedores_ia?.status === "ativo")
    .filter((l) => {
      const janela = {
        inicio: l.vendedores_ia?.horario_inicio,
        fim: l.vendedores_ia?.horario_fim,
      };
      return podeContatarAgora(
        {
          opt_out: l.opt_out,
          ultimo_contato: l.ultimo_contato,
          intervalo_contato_dias: l.intervalo_contato_dias,
        },
        agora,
        janela,
      ).liberado;
    })
    .map((l) => ({
      cliente_id: l.id,
      nome: l.nome,
      vendedor_ia_id: l.vendedor_ia_id,
      ultimo_contato: l.ultimo_contato,
      intervalo_contato_dias: l.intervalo_contato_dias,
    }));
}

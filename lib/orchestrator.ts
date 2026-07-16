import { podeContatarAgora } from "@/lib/agendador";
import { criarClienteServico } from "@/lib/supabase";

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
        inicio: l.vendedores_ia?.horario_inicio?.slice(0, 5),
        fim: l.vendedores_ia?.horario_fim?.slice(0, 5),
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

// ─────────────────────────── Agendador de manutenção ───────────────────────────

interface LinhaAgendador {
  id: string;
  nome: string;
  whatsapp: string | null;
  opt_out: boolean;
  ultimo_contato: string | null;
  intervalo_contato_dias: number;
  vendedor_ia_id: string;
  vendedores_ia: { horario_inicio: string; horario_fim: string; status: string } | null;
}

export interface ResultadoAgendador {
  readonly modo: "dry-run" | "auto";
  readonly elegiveis: number;
  readonly processados: { readonly cliente: string; readonly resultado: string }[];
}

/**
 * Executa os toques de manutenção (§5): encontra clientes com toque vencido,
 * dentro da janela e sem opt-out, e processa um LOTE pequeno (ritmo humano,
 * nunca em rajada — §7). Em `dry-run` só lista quem seria contatado; em `auto`
 * envia o WhatsApp de reengajamento e atualiza o último contato.
 */
export async function executarToquesDeManutencao(opts: {
  readonly auto: boolean;
  readonly limite?: number;
}): Promise<ResultadoAgendador> {
  const supabase = criarClienteServico();
  const agora = new Date();
  const limite = opts.limite ?? 5;

  const { data, error } = await supabase
    .from("clientes")
    .select(
      "id, nome, whatsapp, opt_out, ultimo_contato, intervalo_contato_dias, vendedor_ia_id, " +
        "vendedores_ia!inner(horario_inicio, horario_fim, status)",
    )
    .eq("opt_out", false)
    .not("vendedor_ia_id", "is", null);
  if (error) throw new Error(`Agendador: ${error.message}`);

  const elegiveis = ((data ?? []) as unknown as LinhaAgendador[])
    .filter((l) => l.vendedores_ia?.status === "ativo")
    .filter(
      (l) =>
        podeContatarAgora(
          {
            opt_out: l.opt_out,
            ultimo_contato: l.ultimo_contato,
            intervalo_contato_dias: l.intervalo_contato_dias,
          },
          agora,
          {
            inicio: l.vendedores_ia?.horario_inicio.slice(0, 5),
            fim: l.vendedores_ia?.horario_fim.slice(0, 5),
          },
        ).liberado,
    );

  const lote = elegiveis.slice(0, limite);

  if (!opts.auto) {
    return {
      modo: "dry-run",
      elegiveis: elegiveis.length,
      processados: lote.map((l) => ({ cliente: l.nome, resultado: "seria contatado" })),
    };
  }

  const { enviarWhatsapp } = await import("@/lib/twilio");
  const processados: { cliente: string; resultado: string }[] = [];
  for (const l of lote) {
    if (l.whatsapp === null || l.whatsapp.trim() === "") {
      processados.push({ cliente: l.nome, resultado: "sem whatsapp" });
      continue;
    }
    try {
      const sid = await enviarWhatsapp({
        para: l.whatsapp,
        corpo:
          `Olá, ${l.nome}! Aqui é o VIA, da Unno Ambiental. Faz um tempo que não ` +
          `conversamos — precisa repor algum produto ou tirar uma dúvida? Estou à disposição.`,
      });
      await supabase.from("clientes").update({ ultimo_contato: agora.toISOString() }).eq("id", l.id);
      await supabase.from("interacoes").insert({
        cliente_id: l.id,
        vendedor_ia_id: l.vendedor_ia_id,
        canal: "whatsapp",
        resumo: `Toque de manutenção (agendador) — WhatsApp ${sid}`,
      });
      processados.push({ cliente: l.nome, resultado: "contatado" });
    } catch (e) {
      processados.push({
        cliente: l.nome,
        resultado: `erro: ${e instanceof Error ? e.message.slice(0, 60) : "?"}`,
      });
    }
  }

  return { modo: "auto", elegiveis: elegiveis.length, processados };
}

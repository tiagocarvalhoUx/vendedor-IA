import { z } from "zod";
import { comTratamentoDeErro, ok, erro } from "@/lib/http";
import { criarClienteServico } from "@/lib/supabase";
import { iniciarLigacao } from "@/lib/twilio";
import { dentroDaJanela } from "@/lib/agendador";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Corpo = z.object({ clienteId: z.string().uuid() });

interface ClienteContato {
  id: string;
  telefone: string | null;
  opt_out: boolean;
  vendedor_ia_id: string | null;
  vendedores_ia: {
    numero_whatsapp: string;
    horario_inicio: string;
    horario_fim: string;
    status: string;
  } | null;
}

/**
 * POST /api/twilio/ligar  { clienteId }
 * Inicia uma ligação de voz respeitando os guard rails:
 *  • opt-out (LGPD) → 403        • fora da janela 7h30–18h → 409
 *  • sem telefone → 422          • vendedor inativo/sem carteira → 409
 */
export const POST = comTratamentoDeErro(async (req) => {
  const { clienteId } = Corpo.parse(await req.json());
  const supabase = criarClienteServico();

  const { data, error } = await supabase
    .from("clientes")
    .select(
      "id, telefone, opt_out, vendedor_ia_id, " +
        "vendedores_ia(numero_whatsapp, horario_inicio, horario_fim, status)",
    )
    .eq("id", clienteId)
    .maybeSingle();
  if (error) throw new Error(`Falha ao carregar cliente: ${error.message}`);
  if (data === null) return erro("Cliente não encontrado.", 404);

  const c = data as unknown as ClienteContato;
  if (c.opt_out) return erro("Cliente com opt-out — contato bloqueado (LGPD).", 403);
  if (c.vendedor_ia_id === null || c.vendedores_ia === null) {
    return erro("Cliente sem vendedor na carteira (wallet lock).", 409);
  }
  if (c.vendedores_ia.status !== "ativo") {
    return erro("Vendedor de IA não está ativo.", 409);
  }
  if (c.telefone === null || c.telefone.trim() === "") {
    return erro("Cliente sem telefone cadastrado.", 422);
  }
  const janelaOk = dentroDaJanela(
    new Date(),
    c.vendedores_ia.horario_inicio.slice(0, 5),
    c.vendedores_ia.horario_fim.slice(0, 5),
  );
  if (!janelaOk) return erro("Fora da janela de contato ativo (7h30–18h).", 409);

  const callSid = await iniciarLigacao({ para: c.telefone });

  await supabase.from("interacoes").insert({
    cliente_id: c.id,
    vendedor_ia_id: c.vendedor_ia_id,
    canal: "ligacao",
    resumo: `Ligação iniciada (Twilio SID ${callSid}).`,
  });

  return ok({ callSid });
});

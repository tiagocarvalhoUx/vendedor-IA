import { z } from "zod";
import { comTratamentoDeErro, ok, erro } from "@/lib/http";
import { criarClienteServico } from "@/lib/supabase";
import { enviarWhatsapp } from "@/lib/twilio";
import { dentroDaJanela } from "@/lib/agendador";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Corpo = z.object({
  clienteId: z.string().uuid(),
  mensagem: z.string().min(1).max(1500),
});

interface ClienteWpp {
  id: string;
  whatsapp: string | null;
  opt_out: boolean;
  vendedor_ia_id: string | null;
  vendedores_ia: {
    horario_inicio: string;
    horario_fim: string;
    status: string;
  } | null;
}

/**
 * POST /api/twilio/whatsapp  { clienteId, mensagem }
 * Envia WhatsApp (Twilio) com os mesmos guard rails de contato ativo.
 */
export const POST = comTratamentoDeErro(async (req) => {
  const { clienteId, mensagem } = Corpo.parse(await req.json());
  const supabase = criarClienteServico();

  const { data, error } = await supabase
    .from("clientes")
    .select(
      "id, whatsapp, opt_out, vendedor_ia_id, " +
        "vendedores_ia(horario_inicio, horario_fim, status)",
    )
    .eq("id", clienteId)
    .maybeSingle();
  if (error) throw new Error(`Falha ao carregar cliente: ${error.message}`);
  if (data === null) return erro("Cliente não encontrado.", 404);

  const c = data as unknown as ClienteWpp;
  if (c.opt_out) return erro("Cliente com opt-out — contato bloqueado (LGPD).", 403);
  if (c.vendedor_ia_id === null || c.vendedores_ia === null) {
    return erro("Cliente sem vendedor na carteira (wallet lock).", 409);
  }
  if (c.vendedores_ia.status !== "ativo") {
    return erro("Vendedor de IA não está ativo.", 409);
  }
  if (c.whatsapp === null || c.whatsapp.trim() === "") {
    return erro("Cliente sem WhatsApp cadastrado.", 422);
  }
  const janelaOk = dentroDaJanela(
    new Date(),
    c.vendedores_ia.horario_inicio.slice(0, 5),
    c.vendedores_ia.horario_fim.slice(0, 5),
  );
  if (!janelaOk) return erro("Fora da janela de contato ativo (7h30–18h).", 409);

  const messageSid = await enviarWhatsapp({ para: c.whatsapp, corpo: mensagem });

  await supabase.from("interacoes").insert({
    cliente_id: c.id,
    vendedor_ia_id: c.vendedor_ia_id,
    canal: "whatsapp",
    resumo: `WhatsApp enviado (Twilio SID ${messageSid}): ${mensagem.slice(0, 200)}`,
  });

  return ok({ messageSid });
});

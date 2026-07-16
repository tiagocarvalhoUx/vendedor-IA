import { NextResponse } from "next/server";
import twilio from "twilio";
import { serverEnv } from "@/lib/env";
import { validarAssinaturaTwilio, baseUrlPublica } from "@/lib/twilio";
import { criarClienteServico } from "@/lib/supabase";
import { responderPergunta } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MSG_ESCALONAMENTO =
  "Recebi sua mensagem! 🌱 Vou encaminhar para um especialista da Unno Ambiental " +
  "e já te retornamos. Obrigado pelo contato!";

/**
 * POST /api/webhooks/twilio/whatsapp-inbound
 * WhatsApp recebido (via Twilio) → resposta fundamentada no manual
 * (anti-alucinação) OU escalonamento para humano. Responde por TwiML e
 * registra a interação.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  if (serverEnv.TWILIO_AUTH_TOKEN !== undefined) {
    const url = `${baseUrlPublica()}/api/webhooks/twilio/whatsapp-inbound`;
    if (!validarAssinaturaTwilio(req.headers.get("x-twilio-signature"), url, params)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const de = (params.From ?? "").replace(/^whatsapp:/, "").trim();
  const texto = (params.Body ?? "").trim();

  const supabase = criarClienteServico();

  // Identifica o cliente pelo número (se cadastrado).
  const { data: cli } = await supabase
    .from("clientes")
    .select("id, nome, vendedor_ia_id, opt_out")
    .eq("whatsapp", de)
    .maybeSingle();
  const cliente = cli as
    | { id: string; nome: string; vendedor_ia_id: string | null; opt_out: boolean }
    | null;

  const resposta = texto === ""
    ? ({ tipo: "escalar", motivo: "Mensagem vazia." } as const)
    : await responderPergunta(texto);

  // Registra a interação só quando o remetente é um cliente conhecido com
  // vendedor (interacoes exige cliente_id e vendedor_ia_id NOT NULL).
  if (cliente?.id && cliente.vendedor_ia_id) {
    await supabase.from("interacoes").insert({
      cliente_id: cliente.id,
      vendedor_ia_id: cliente.vendedor_ia_id,
      canal: "whatsapp",
      transcricao: `Cliente: ${texto}`,
      resumo:
        resposta.tipo === "resposta"
          ? `Respondido pela IA: ${resposta.texto.slice(0, 180)}`
          : "Escalonado para humano",
    });
  }

  let mensagemResposta: string;
  if (resposta.tipo === "resposta") {
    mensagemResposta = resposta.texto;
  } else {
    mensagemResposta = MSG_ESCALONAMENTO;
    await supabase.from("escalonamentos").insert({
      cliente_id: cliente?.id ?? null,
      vendedor_ia_id: cliente?.vendedor_ia_id ?? null,
      pergunta: texto || "(mensagem vazia)",
      motivo: resposta.motivo,
      status: "aberto",
    });
  }

  const MessagingResponse = twilio.twiml.MessagingResponse;
  const mr = new MessagingResponse();
  mr.message(mensagemResposta);
  return new NextResponse(mr.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

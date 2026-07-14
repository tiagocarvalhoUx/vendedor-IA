import { NextResponse } from "next/server";
import { z } from "zod";
import { comTratamentoDeErro, ok } from "@/lib/http";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/webhooks/whatsapp — handshake de verificação do WhatsApp Cloud API.
 * A Meta chama com hub.mode/hub.verify_token/hub.challenge; devolvemos o
 * challenge em texto puro se o token bater.
 */
export function GET(req: Request): NextResponse {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    serverEnv.WHATSAPP_VERIFY_TOKEN !== undefined &&
    token === serverEnv.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Forma mínima do payload de mensagem recebida (WhatsApp Cloud API).
const Mensagem = z.object({
  from: z.string(),
  text: z.object({ body: z.string() }).optional(),
});
const Corpo = z.object({
  entry: z
    .array(
      z.object({
        changes: z
          .array(z.object({ value: z.object({ messages: z.array(Mensagem).optional() }) }))
          .optional(),
      }),
    )
    .optional(),
});

/**
 * POST /api/webhooks/whatsapp — mensagens recebidas.
 * Nesta fundação apenas validamos e extraímos as mensagens; o roteamento para
 * RAG/atendimento entra na próxima rodada (persistir interação → grounding).
 * Retornar 200 rápido é obrigatório para a Meta não reenviar.
 */
export const POST = comTratamentoDeErro(async (req) => {
  const corpo = Corpo.parse(await req.json());
  const mensagens =
    corpo.entry?.flatMap(
      (e) => e.changes?.flatMap((c) => c.value.messages ?? []) ?? [],
    ) ?? [];
  return ok({ recebidas: mensagens.length });
});

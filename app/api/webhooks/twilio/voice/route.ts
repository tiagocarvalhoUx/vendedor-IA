import { NextResponse } from "next/server";
import twilio from "twilio";
import { serverEnv } from "@/lib/env";
import { validarAssinaturaTwilio, baseUrlPublica } from "@/lib/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/twilio/voice
 * TwiML executado quando a ligação é atendida. Por ora, uma saudação
 * identificada (LGPD/CDC — transparência). A voz do ElevenLabs e a conversa
 * guiada por RAG entram numa próxima etapa (fora do escopo atual).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  // Em produção (token configurado), exige assinatura válida do Twilio.
  if (serverEnv.TWILIO_AUTH_TOKEN !== undefined) {
    const url = `${baseUrlPublica()}/api/webhooks/twilio/voice`;
    const assinatura = req.headers.get("x-twilio-signature");
    if (!validarAssinaturaTwilio(assinatura, url, params)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const vr = new VoiceResponse();
  vr.say(
    { voice: "Polly.Camila-Neural", language: "pt-BR" },
    "Olá! Aqui é o assistente virtual da Unno Ambiental. " +
      "Esta é uma ligação de demonstração do nosso atendimento por inteligência artificial. " +
      "Em breve poderei tirar suas dúvidas sobre produtos e pedidos. Obrigado e até logo!",
  );

  return new NextResponse(vr.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

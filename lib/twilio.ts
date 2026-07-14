import "server-only";
import twilio from "twilio";
import { requireServerEnv, serverEnv } from "@/lib/env";

/**
 * Integração Twilio — voz + WhatsApp. SERVER-ONLY (Account SID/Auth Token
 * jamais no browser, §7). Cada IA deve usar número próprio (não o principal
 * da empresa); aqui aceitamos o número `de` por parâmetro, com fallback nos
 * números configurados em env.
 */

let _client: twilio.Twilio | null = null;

function client(): twilio.Twilio {
  if (_client === null) {
    _client = twilio(
      requireServerEnv("TWILIO_ACCOUNT_SID"),
      requireServerEnv("TWILIO_AUTH_TOKEN"),
    );
  }
  return _client;
}

/** URL pública base para os webhooks (produção Vercel ou localhost). */
export function baseUrlPublica(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
  return url.replace(/\/$/, "");
}

/** Normaliza para E.164 (dígitos + prefixo `+`). */
export function formatarE164(numero: string): string {
  const limpo = numero.replace(/[^\d+]/g, "");
  return limpo.startsWith("+") ? limpo : `+${limpo}`;
}

/**
 * Inicia uma ligação de voz. Quando atendida, o Twilio busca o TwiML em
 * `/api/webhooks/twilio/voice`; o status é reportado em `/status`.
 * Retorna o SID da chamada.
 */
export async function iniciarLigacao(opts: {
  readonly para: string;
  readonly de?: string;
}): Promise<string> {
  const base = baseUrlPublica();
  const chamada = await client().calls.create({
    to: formatarE164(opts.para),
    from: formatarE164(opts.de ?? requireServerEnv("TWILIO_VOICE_NUMBER")),
    url: `${base}/api/webhooks/twilio/voice`,
    statusCallback: `${base}/api/webhooks/twilio/status`,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    statusCallbackMethod: "POST",
  });
  return chamada.sid;
}

/** Envia uma mensagem de WhatsApp via Twilio. Retorna o SID da mensagem. */
export async function enviarWhatsapp(opts: {
  readonly para: string;
  readonly corpo: string;
  readonly de?: string;
}): Promise<string> {
  const de = formatarE164(opts.de ?? requireServerEnv("TWILIO_WHATSAPP_NUMBER"));
  const mensagem = await client().messages.create({
    to: `whatsapp:${formatarE164(opts.para)}`,
    from: `whatsapp:${de}`,
    body: opts.corpo,
  });
  return mensagem.sid;
}

/**
 * Valida a assinatura `X-Twilio-Signature` do webhook (garante que a requisição
 * veio mesmo do Twilio). Retorna false se o token não estiver configurado.
 */
export function validarAssinaturaTwilio(
  assinatura: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  const token = serverEnv.TWILIO_AUTH_TOKEN;
  if (token === undefined || assinatura === null) return false;
  return twilio.validateRequest(token, assinatura, url, params);
}

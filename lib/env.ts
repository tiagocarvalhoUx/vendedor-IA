import { z } from "zod";

/**
 * Validação tipada de variáveis de ambiente.
 *
 * REGRA DE SEGURANÇA (§7 do prompt): chaves de Mercos/Omie/ElevenLabs/OpenAI e
 * a service_role do Supabase são SERVER-ONLY. Só variáveis `NEXT_PUBLIC_*`
 * podem chegar ao browser. Este módulo NUNCA deve ser importado por Client
 * Components — apenas por Server Actions, Route Handlers e libs de servidor.
 */

// Variáveis expostas ao client (seguras — chave anon respeita RLS).
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// Variáveis exclusivas de servidor. Marcadas opcionais para permitir build/CI
// sem segredos; o acesso em runtime valida a presença via `requireServerEnv`.
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  MERCOS_API_URL: z.string().url().optional(),
  MERCOS_APPLICATION_TOKEN: z.string().min(1).optional(),
  MERCOS_COMPANY_TOKEN: z.string().min(1).optional(),
  OMIE_APP_KEY: z.string().min(1).optional(),
  OMIE_APP_SECRET: z.string().min(1).optional(),
  // Twilio — voz + WhatsApp. SERVER-ONLY.
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_VOICE_NUMBER: z.string().min(1).optional(), // ex.: +5511999998888
  TWILIO_WHATSAPP_NUMBER: z.string().min(1).optional(), // ex.: +14155238886 (sandbox) ou BR
  // Token de verificação do webhook do WhatsApp Cloud API (handshake GET).
  WHATSAPP_VERIFY_TOKEN: z.string().min(1).optional(),
  // Limiar de similaridade do RAG (0..1). Abaixo disso → "não sei" + escalonar.
  RAG_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.78),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

/** Trata string vazia como ausente — segredos em `.env` costumam vir como "". */
function vazioParaUndefined(v: string | undefined): string | undefined {
  return v === undefined || v.trim() === "" ? undefined : v;
}

export const serverEnv = serverSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: vazioParaUndefined(process.env.SUPABASE_SERVICE_ROLE_KEY),
  OPENAI_API_KEY: vazioParaUndefined(process.env.OPENAI_API_KEY),
  MERCOS_API_URL: vazioParaUndefined(process.env.MERCOS_API_URL),
  MERCOS_APPLICATION_TOKEN: vazioParaUndefined(process.env.MERCOS_APPLICATION_TOKEN),
  MERCOS_COMPANY_TOKEN: vazioParaUndefined(process.env.MERCOS_COMPANY_TOKEN),
  OMIE_APP_KEY: vazioParaUndefined(process.env.OMIE_APP_KEY),
  OMIE_APP_SECRET: vazioParaUndefined(process.env.OMIE_APP_SECRET),
  TWILIO_ACCOUNT_SID: vazioParaUndefined(process.env.TWILIO_ACCOUNT_SID),
  TWILIO_AUTH_TOKEN: vazioParaUndefined(process.env.TWILIO_AUTH_TOKEN),
  TWILIO_VOICE_NUMBER: vazioParaUndefined(process.env.TWILIO_VOICE_NUMBER),
  TWILIO_WHATSAPP_NUMBER: vazioParaUndefined(process.env.TWILIO_WHATSAPP_NUMBER),
  WHATSAPP_VERIFY_TOKEN: vazioParaUndefined(process.env.WHATSAPP_VERIFY_TOKEN),
  RAG_SCORE_THRESHOLD: vazioParaUndefined(process.env.RAG_SCORE_THRESHOLD),
});

/**
 * Garante que uma variável server-only está presente em runtime.
 * Lança erro claro (em pt-BR) quando o segredo não foi configurado.
 */
export function requireServerEnv<K extends keyof typeof serverEnv>(
  key: K,
): NonNullable<(typeof serverEnv)[K]> {
  const value = serverEnv[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${String(key)}. ` +
        `Configure-a no servidor (nunca no client).`,
    );
  }
  return value as NonNullable<(typeof serverEnv)[K]>;
}

import "server-only";
import { requireServerEnv, serverEnv } from "@/lib/env";
import { formatarE164 } from "@/lib/twilio";

/**
 * ElevenLabs — síntese de voz (TTS). SERVER-ONLY (a API key jamais no browser).
 *
 * Gera áudio a partir de texto com uma voz natural. Usado na saudação da
 * ligação (Twilio <Play>) e reutilizável para qualquer mensagem falada.
 */

const API = "https://api.elevenlabs.io/v1";
// Modelo multilíngue cobre bem o pt-BR. Troque via ELEVENLABS_MODEL_ID.
const MODELO_PADRAO = "eleven_multilingual_v2";
// Voz pública padrão. Escolha uma voz pt-BR no seu painel e defina ELEVENLABS_VOICE_ID.
const VOZ_PADRAO = "21m00Tcm4TlvDq8ikWAM";

/** True se a API key do ElevenLabs está configurada (para decidir TTS vs fallback). */
export function elevenLabsConfigurado(): boolean {
  return serverEnv.ELEVENLABS_API_KEY !== undefined;
}

/**
 * Sintetiza `texto` em áudio MP3 (formato compatível com o <Play> do Twilio).
 * Lança erro claro em falha de API.
 */
export async function sintetizarFala(
  texto: string,
  voiceId?: string,
): Promise<ArrayBuffer> {
  const key = requireServerEnv("ELEVENLABS_API_KEY");
  const voz = voiceId ?? serverEnv.ELEVENLABS_VOICE_ID ?? VOZ_PADRAO;
  const modelo = serverEnv.ELEVENLABS_MODEL_ID ?? MODELO_PADRAO;

  const resp = await fetch(
    `${API}/text-to-speech/${voz}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: texto,
        model_id: modelo,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );

  if (!resp.ok) {
    const detalhe = await resp.text();
    throw new Error(`ElevenLabs TTS falhou (${resp.status}): ${detalhe.slice(0, 200)}`);
  }
  return resp.arrayBuffer();
}

// ─────────────────── Conversational AI (agente / RAG) ───────────────────

/** True se o agente conversacional está configurado (id do agente + do número). */
export function agenteConfigurado(): boolean {
  return (
    serverEnv.ELEVENLABS_AGENT_ID !== undefined &&
    serverEnv.ELEVENLABS_AGENT_PHONE_ID !== undefined
  );
}

/** Resultado do disparo de uma ligação do agente de IA. */
export interface LigacaoIA {
  readonly conversationId: string | null;
  readonly callSid: string | null;
}

/**
 * Inicia uma ligação conduzida pelo AGENTE conversacional do ElevenLabs
 * (voz + LLM + RAG do manual). A ligação sai pelo número Twilio importado no
 * ElevenLabs. `variaveis` alimenta as dynamic variables do prompt do agente
 * (ex.: nome do cliente).
 */
export async function iniciarLigacaoIA(opts: {
  readonly para: string;
  readonly variaveis?: Record<string, string>;
}): Promise<LigacaoIA> {
  const key = requireServerEnv("ELEVENLABS_API_KEY");
  const agentId = requireServerEnv("ELEVENLABS_AGENT_ID");
  const phoneId = requireServerEnv("ELEVENLABS_AGENT_PHONE_ID");

  const resp = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: agentId,
      agent_phone_number_id: phoneId,
      to_number: formatarE164(opts.para),
      ...(opts.variaveis
        ? { conversation_initiation_client_data: { dynamic_variables: opts.variaveis } }
        : {}),
    }),
  });

  if (!resp.ok) {
    const detalhe = await resp.text();
    throw new Error(`ElevenLabs outbound falhou (${resp.status}): ${detalhe.slice(0, 200)}`);
  }
  const j = (await resp.json()) as { conversation_id?: string; callSid?: string };
  return { conversationId: j.conversation_id ?? null, callSid: j.callSid ?? null };
}

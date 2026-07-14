import "server-only";
import { requireServerEnv, serverEnv } from "@/lib/env";

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

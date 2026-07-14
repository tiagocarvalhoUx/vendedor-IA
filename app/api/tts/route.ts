import { NextResponse } from "next/server";
import { sintetizarFala } from "@/lib/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tts?texto=...
 * Devolve o áudio (MP3) do texto sintetizado pelo ElevenLabs. É consumido pelo
 * <Play> do Twilio na ligação. Público (o Twilio precisa acessar sem auth);
 * limitamos o tamanho do texto para conter abuso/custo.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const texto = (new URL(req.url).searchParams.get("texto") ?? "").slice(0, 800);
  if (texto.trim().length === 0) {
    return new NextResponse("Parâmetro 'texto' ausente.", { status: 400 });
  }
  try {
    const audio = await sintetizarFala(texto);
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        // Cacheável: a mesma saudação não regenera a cada ligação.
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro TTS";
    return new NextResponse(msg, { status: 500 });
  }
}

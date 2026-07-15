import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { criarClienteServico } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Valida a assinatura HMAC do webhook do ElevenLabs.
 * Header `ElevenLabs-Signature`: "t=<timestamp>,v0=<hex>".
 * Assina `${timestamp}.${corpoBruto}` com o webhook secret.
 */
function assinaturaValida(assinatura: string | null, corpo: string, segredo: string): boolean {
  if (assinatura === null) return false;
  const partes = Object.fromEntries(
    assinatura.split(",").map((p) => p.split("=") as [string, string]),
  );
  const t = partes.t;
  const v0 = partes.v0;
  if (!t || !v0) return false;
  const esperado = createHmac("sha256", segredo).update(`${t}.${corpo}`).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(v0);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface PayloadPosLigacao {
  type?: string;
  data?: {
    conversation_id?: string;
    analysis?: { transcript_summary?: string; call_successful?: string };
  };
}

/**
 * POST /api/webhooks/elevenlabs
 * Webhook pós-ligação do agente: grava a transcrição/resumo na interação
 * correspondente (casada pelo conversation_id salvo no resumo).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const corpo = await req.text();

  if (serverEnv.ELEVENLABS_WEBHOOK_SECRET !== undefined) {
    const assinatura = req.headers.get("elevenlabs-signature");
    if (!assinaturaValida(assinatura, corpo, serverEnv.ELEVENLABS_WEBHOOK_SECRET)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  let payload: PayloadPosLigacao;
  try {
    payload = JSON.parse(corpo) as PayloadPosLigacao;
  } catch {
    return new NextResponse("JSON inválido", { status: 400 });
  }

  const conversationId = payload.data?.conversation_id;
  const resumoConversa = payload.data?.analysis?.transcript_summary;
  const sucesso = payload.data?.analysis?.call_successful;

  if (conversationId) {
    const supabase = criarClienteServico();
    const { data } = await supabase
      .from("interacoes")
      .select("id, resumo")
      .ilike("resumo", `%${conversationId}%`)
      .limit(1)
      .maybeSingle();
    const inter = data as { id: string; resumo: string | null } | null;
    if (inter) {
      const resumoFinal = resumoConversa
        ? `Ligação IA concluída — ${resumoConversa}`
        : `${inter.resumo ?? ""} — encerrada (${sucesso ?? "?"})`;
      await supabase
        .from("interacoes")
        .update({
          resumo: resumoFinal.slice(0, 2000),
          sentimento: sucesso === "success" ? "positivo" : sucesso === "failure" ? "negativo" : null,
        })
        .eq("id", inter.id);
    }
  }

  return new NextResponse(null, { status: 200 });
}

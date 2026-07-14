import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { validarAssinaturaTwilio, baseUrlPublica } from "@/lib/twilio";
import { criarClienteServico } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/twilio/status
 * Callback de status da ligação (initiated/ringing/answered/completed/failed).
 * Atualiza a interação correspondente (casada pelo SID gravado no resumo).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  if (serverEnv.TWILIO_AUTH_TOKEN !== undefined) {
    const url = `${baseUrlPublica()}/api/webhooks/twilio/status`;
    const assinatura = req.headers.get("x-twilio-signature");
    if (!validarAssinaturaTwilio(assinatura, url, params)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const callSid = params.CallSid;
  const status = params.CallStatus;
  if (callSid && status) {
    const supabase = criarClienteServico();
    const { data } = await supabase
      .from("interacoes")
      .select("id, resumo")
      .ilike("resumo", `%${callSid}%`)
      .limit(1)
      .maybeSingle();
    const inter = data as { id: string; resumo: string | null } | null;
    if (inter) {
      await supabase
        .from("interacoes")
        .update({ resumo: `${inter.resumo ?? ""} — status: ${status}` })
        .eq("id", inter.id);
    }
  }

  // Twilio só precisa de um 200.
  return new NextResponse(null, { status: 200 });
}

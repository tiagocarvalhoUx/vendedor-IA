import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { executarToquesDeManutencao } from "@/lib/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Autoriza a chamada do cron: aceita o header do Vercel Cron
 * (Authorization: Bearer CRON_SECRET) ou `?secret=` (pinger externo).
 * Sem CRON_SECRET configurado → bloqueia (fail-safe).
 */
function autorizado(req: Request): boolean {
  const secret = serverEnv.CRON_SECRET;
  if (secret === undefined) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("secret") === secret;
}

/**
 * GET/POST /api/cron/toques
 * Roda os toques de manutenção (§5). Modo controlado por AGENDADOR_AUTO:
 *  • ausente/!= "true" → dry-run (só lista quem seria contatado)
 *  • "true"            → envia o WhatsApp de reengajamento (ritmo humano)
 */
async function handler(req: Request): Promise<NextResponse> {
  if (!autorizado(req)) return new NextResponse("Forbidden", { status: 403 });

  const auto = serverEnv.AGENDADOR_AUTO === "true";
  const resultado = await executarToquesDeManutencao({ auto, limite: 5 });
  return NextResponse.json(resultado);
}

export const GET = handler; // Vercel Cron usa GET
export const POST = handler; // pinger externo pode usar POST

import { NextResponse } from "next/server";
import {
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { criarClienteSSR } from "@/lib/supabase-ssr";
import { configWebAuthn, lerDesafio, limparDesafio, salvarCredencial } from "@/lib/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/passkey/registro/verificar
 * Verifica a resposta de registro e salva a credencial (chave pública) do
 * operador logado.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const { data } = await criarClienteSSR().auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const desafio = lerDesafio();
  if (!desafio) return NextResponse.json({ erro: "Desafio expirado." }, { status: 400 });

  const resposta = (await req.json()) as RegistrationResponseJSON;
  const { rpID, origin } = configWebAuthn(req);

  const verificacao = await verifyRegistrationResponse({
    response: resposta,
    expectedChallenge: desafio,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  limparDesafio();

  if (!verificacao.verified || !verificacao.registrationInfo) {
    return NextResponse.json({ erro: "Falha ao verificar a passkey." }, { status: 400 });
  }

  const { credential } = verificacao.registrationInfo;
  await salvarCredencial({
    userId: user.id,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports,
    apelido: "Este dispositivo",
  });

  return NextResponse.json({ ok: true });
}

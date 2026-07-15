import { NextResponse } from "next/server";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { criarClienteServico } from "@/lib/supabase";
import {
  configWebAuthn,
  lerDesafio,
  limparDesafio,
  buscarCredencial,
  atualizarContador,
} from "@/lib/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/passkey/login/verificar
 * Verifica a assinatura da passkey contra a chave pública salva. Se válida,
 * gera um token de sessão (via generateLink) para o cliente trocar por sessão.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const desafio = lerDesafio();
  if (!desafio) return NextResponse.json({ erro: "Desafio expirado." }, { status: 400 });

  const resposta = (await req.json()) as AuthenticationResponseJSON;
  const cred = await buscarCredencial(resposta.id);
  if (cred === null) {
    limparDesafio();
    return NextResponse.json({ erro: "Passkey não reconhecida." }, { status: 400 });
  }

  const { rpID, origin } = configWebAuthn(req);
  const verificacao = await verifyAuthenticationResponse({
    response: resposta,
    expectedChallenge: desafio,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: cred.credential_id,
      publicKey: new Uint8Array(Buffer.from(cred.public_key, "base64url")),
      counter: Number(cred.counter),
      transports: (cred.transports ?? undefined) as never,
    },
  });
  limparDesafio();

  if (!verificacao.verified) {
    return NextResponse.json({ erro: "Falha na verificação da passkey." }, { status: 400 });
  }
  await atualizarContador(cred.credential_id, verificacao.authenticationInfo.newCounter);

  // Ponte para a sessão do Supabase: gera um token que o cliente troca por sessão.
  const admin = criarClienteServico();
  const { data: u } = await admin.auth.admin.getUserById(cred.user_id);
  const email = u.user?.email;
  if (!email) return NextResponse.json({ erro: "Usuário sem email." }, { status: 400 });

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (error || !tokenHash) {
    return NextResponse.json({ erro: "Falha ao gerar sessão." }, { status: 500 });
  }

  return NextResponse.json({ tokenHash, email });
}

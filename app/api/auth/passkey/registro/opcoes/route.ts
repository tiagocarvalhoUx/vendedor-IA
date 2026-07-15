import { NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { criarClienteSSR } from "@/lib/supabase-ssr";
import { configWebAuthn, definirDesafio, listarCredenciaisDoUsuario } from "@/lib/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/passkey/registro/opcoes
 * Gera as opções para registrar uma passkey NESTE dispositivo. Exige operador
 * logado (por senha) — o cadastro da digital é feito de dentro do painel.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const { data } = await criarClienteSSR().auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { rpID, rpName } = configWebAuthn(req);
  const existentes = await listarCredenciaisDoUsuario(user.id);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email ?? user.id,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existentes.map((c) => ({
      id: c.credential_id,
      transports: (c.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
    })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });

  definirDesafio(options.challenge);
  return NextResponse.json(options);
}

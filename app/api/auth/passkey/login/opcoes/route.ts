import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { configWebAuthn, definirDesafio } from "@/lib/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/passkey/login/opcoes
 * Opções para login por passkey. Sem allowCredentials → credenciais
 * "descobríveis" (o dispositivo mostra as passkeys disponíveis).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const { rpID } = configWebAuthn(req);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });
  definirDesafio(options.challenge);
  return NextResponse.json(options);
}

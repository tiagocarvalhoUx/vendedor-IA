import "server-only";
import { cookies } from "next/headers";
import { criarClienteServico } from "@/lib/supabase";

/**
 * Suporte a Passkeys (WebAuthn) — login biométrico.
 * A verificação da digital/Face ID acontece no dispositivo; aqui cuidamos da
 * configuração do Relying Party, do desafio (challenge) e do armazenamento das
 * credenciais (chave pública + contador). SERVER-ONLY.
 */

/** Config do Relying Party derivada da requisição (funciona em localhost e prod). */
export function configWebAuthn(req: Request): {
  rpID: string;
  origin: string;
  rpName: string;
} {
  const host = req.headers.get("host") ?? "localhost:3000";
  const rpID = host.split(":")[0] ?? "localhost"; // "localhost" ou "...vercel.app"
  const proto = req.headers.get("x-forwarded-proto") ?? (rpID === "localhost" ? "http" : "https");
  return { rpID, origin: `${proto}://${host}`, rpName: "VIA — Unno Ambiental" };
}

const COOKIE_DESAFIO = "webauthn_desafio";

/** Guarda o challenge por 5 min (httpOnly) entre "opções" e "verificar". */
export function definirDesafio(desafio: string): void {
  cookies().set(COOKIE_DESAFIO, desafio, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
}

export function lerDesafio(): string | undefined {
  return cookies().get(COOKIE_DESAFIO)?.value;
}

export function limparDesafio(): void {
  cookies().delete(COOKIE_DESAFIO);
}

// ─────────────────────── Armazenamento de credenciais ───────────────────────

export interface CredencialWebAuthn {
  readonly credential_id: string;
  readonly public_key: string;
  readonly counter: number;
  readonly user_id: string;
  readonly transports: string[] | null;
}

export async function salvarCredencial(cred: {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  apelido?: string;
}): Promise<void> {
  const supabase = criarClienteServico();
  const { error } = await supabase.from("credenciais_webauthn").insert({
    user_id: cred.userId,
    credential_id: cred.credentialId,
    public_key: cred.publicKey,
    counter: cred.counter,
    transports: cred.transports ?? null,
    apelido: cred.apelido ?? null,
  });
  if (error) throw new Error(`Salvar credencial: ${error.message}`);
}

export async function buscarCredencial(credentialId: string): Promise<CredencialWebAuthn | null> {
  const supabase = criarClienteServico();
  const { data, error } = await supabase
    .from("credenciais_webauthn")
    .select("credential_id, public_key, counter, user_id, transports")
    .eq("credential_id", credentialId)
    .maybeSingle();
  if (error) throw new Error(`Buscar credencial: ${error.message}`);
  return (data as CredencialWebAuthn | null) ?? null;
}

export async function listarCredenciaisDoUsuario(userId: string): Promise<CredencialWebAuthn[]> {
  const supabase = criarClienteServico();
  const { data, error } = await supabase
    .from("credenciais_webauthn")
    .select("credential_id, public_key, counter, user_id, transports")
    .eq("user_id", userId);
  if (error) throw new Error(`Listar credenciais: ${error.message}`);
  return (data ?? []) as CredencialWebAuthn[];
}

export async function atualizarContador(credentialId: string, counter: number): Promise<void> {
  const supabase = criarClienteServico();
  await supabase.from("credenciais_webauthn").update({ counter }).eq("credential_id", credentialId);
}

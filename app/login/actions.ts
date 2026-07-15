"use server";

import { redirect } from "next/navigation";
import { criarClienteSSR } from "@/lib/supabase-ssr";

/** Autentica o operador (email + senha) e entra no painel. */
export async function entrar(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const proximo = String(formData.get("next") ?? "/overview") || "/overview";

  const supabase = criarClienteSSR();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    redirect(`/login?erro=${encodeURIComponent("Email ou senha inválidos.")}`);
  }
  redirect(proximo.startsWith("/") ? proximo : "/overview");
}

/** Encerra a sessão do operador. */
export async function sair(): Promise<void> {
  const supabase = criarClienteSSR();
  await supabase.auth.signOut();
  redirect("/login");
}

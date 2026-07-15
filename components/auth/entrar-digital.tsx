"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2 } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase-browser";

/** Botão "Entrar com digital" (passkey/WebAuthn) na tela de login. */
export function EntrarComDigital({ next }: { readonly next: string }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    setCarregando(true);
    setErro(null);
    try {
      const opcoes = await (
        await fetch("/api/auth/passkey/login/opcoes", { method: "POST" })
      ).json();

      const resposta = await startAuthentication({ optionsJSON: opcoes });

      const r = await fetch("/api/auth/passkey/login/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resposta),
      });
      const j = (await r.json()) as { tokenHash?: string; erro?: string };
      if (!r.ok || !j.tokenHash) throw new Error(j.erro ?? "Falha ao verificar.");

      const sb = criarClienteBrowser();
      const { error } = await sb.auth.verifyOtp({ token_hash: j.tokenHash, type: "email" });
      if (error) throw new Error(error.message);

      window.location.href = next || "/overview";
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar com a digital.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={entrar}
        disabled={carregando}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50"
      >
        {carregando ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Fingerprint className="h-4 w-4 text-primary" aria-hidden />
        )}
        Entrar com digital
      </button>
      {erro && <p className="text-center text-xs text-destructive">{erro}</p>}
    </div>
  );
}

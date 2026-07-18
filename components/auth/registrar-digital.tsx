"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint, Loader2, Check } from "lucide-react";

/**
 * Botão "Registrar digital neste dispositivo" (dentro do painel, após login).
 * Cria uma passkey ligada ao operador — depois o login pode ser só pela digital.
 */
export function RegistrarDigital() {
  const [estado, setEstado] = useState<"idle" | "carregando" | "ok" | "erro">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function registrar() {
    setEstado("carregando");
    setMsg(null);
    try {
      const r1 = await fetch("/api/auth/passkey/registro/opcoes", { method: "POST" });
      if (!r1.ok) throw new Error("Sessão expirada. Entre novamente.");
      const opcoes = await r1.json();

      const resposta = await startRegistration({ optionsJSON: opcoes });

      const r2 = await fetch("/api/auth/passkey/registro/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resposta),
      });
      const j = (await r2.json()) as { ok?: boolean; erro?: string };
      if (!r2.ok || !j.ok) throw new Error(j.erro ?? "Falha ao registrar.");

      setEstado("ok");
      setMsg("Digital registrada! Já pode entrar por biometria.");
      alert("✅ Digital registrada neste dispositivo! Saia e use 'Entrar com digital'.");
    } catch (e) {
      const texto = e instanceof Error ? e.message : "Não foi possível registrar a digital.";
      setEstado("erro");
      setMsg(texto);
      alert("Não foi possível registrar a digital: " + texto);
    }
  }

  return (
    <button
      type="button"
      onClick={registrar}
      disabled={estado === "carregando"}
      title={msg ?? "Registrar digital neste dispositivo"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
    >
      {estado === "carregando" ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : estado === "ok" ? (
        <Check className="h-4 w-4 text-emerald-500" aria-hidden />
      ) : (
        <Fingerprint className={estado === "erro" ? "h-4 w-4 text-destructive" : "h-4 w-4"} aria-hidden />
      )}
      <span className="sr-only">Registrar digital neste dispositivo</span>
    </button>
  );
}

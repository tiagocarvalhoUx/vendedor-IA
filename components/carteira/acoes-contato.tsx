"use client";

import { useState } from "react";
import { Phone, MessageCircle, Loader2, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Ocupado = "ligar" | "whatsapp" | null;
interface Feedback {
  readonly ok: boolean;
  readonly msg: string;
}

/**
 * Ações de contato por cliente (na Carteira): Ligar e WhatsApp.
 * Dispara as rotas /api/twilio/* e mostra feedback inline. Respeita os guard
 * rails no servidor (opt-out, janela, wallet lock) — aqui só desabilita no opt-out.
 */
export function AcoesContato({
  clienteId,
  nome,
  optOut,
}: {
  readonly clienteId: string;
  readonly nome: string;
  readonly optOut: boolean;
}) {
  const [ocupado, setOcupado] = useState<Ocupado>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [modal, setModal] = useState(false);
  const [mensagem, setMensagem] = useState(
    `Olá, ${nome}! Aqui é o VIA, da Unno Ambiental. Posso te ajudar com um pedido?`,
  );

  function mostrar(fb: Feedback) {
    setFeedback(fb);
    setTimeout(() => setFeedback(null), 6000);
  }

  async function chamar(rota: "ligar" | "whatsapp", corpo: Record<string, unknown>) {
    setOcupado(rota);
    try {
      const r = await fetch(`/api/twilio/${rota}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const j = (await r.json()) as { erro?: string };
      if (r.ok) {
        mostrar({ ok: true, msg: rota === "ligar" ? "Ligação iniciada ✓" : "WhatsApp enviado ✓" });
        return true;
      }
      mostrar({ ok: false, msg: j.erro ?? `Erro (${r.status})` });
      return false;
    } catch {
      mostrar({ ok: false, msg: "Falha de rede" });
      return false;
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={optOut || ocupado !== null}
        onClick={() => void chamar("ligar", { clienteId })}
        title={optOut ? "Cliente com opt-out" : "Ligar"}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        {ocupado === "ligar" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        )}
        <span className="sr-only">Ligar para {nome}</span>
      </button>

      <button
        type="button"
        disabled={optOut || ocupado !== null}
        onClick={() => setModal(true)}
        title={optOut ? "Cliente com opt-out" : "Enviar WhatsApp"}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MessageCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">WhatsApp para {nome}</span>
      </button>

      {feedback && (
        <span className={cn("text-xs", feedback.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
          {feedback.msg}
        </span>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button aria-label="Fechar" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">WhatsApp para {nome}</h3>
              <button aria-label="Fechar" onClick={() => setModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={4}
              maxLength={1500}
              className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={ocupado !== null || mensagem.trim().length === 0}
                onClick={async () => {
                  const ok = await chamar("whatsapp", { clienteId, mensagem });
                  if (ok) setModal(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {ocupado === "whatsapp" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

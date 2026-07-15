"use client";

import { useState } from "react";
import { Phone, MessageCircle, Bot, Loader2, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Acao = "ligar" | "whatsapp" | "ia";
interface Feedback {
  readonly ok: boolean;
  readonly msg: string;
}

/**
 * Ações de contato por cliente (Carteira): Ligar, Ligar com IA (agente
 * ElevenLabs) e WhatsApp. Chamam as rotas do servidor (que aplicam os guard
 * rails) e mostram feedback inline. Desabilitadas no opt-out.
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
  const [ocupado, setOcupado] = useState<Acao | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [modal, setModal] = useState(false);
  const [mensagem, setMensagem] = useState(
    `Olá, ${nome}! Aqui é o VIA, da Unno Ambiental. Posso te ajudar com um pedido?`,
  );

  function mostrar(fb: Feedback) {
    setFeedback(fb);
    setTimeout(() => setFeedback(null), 6000);
  }

  async function chamar(
    acao: Acao,
    url: string,
    corpo: Record<string, unknown>,
    msgOk: string,
  ): Promise<boolean> {
    setOcupado(acao);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const j = (await r.json()) as { erro?: string };
      if (r.ok) {
        mostrar({ ok: true, msg: msgOk });
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

  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={optOut || ocupado !== null}
        onClick={() => void chamar("ligar", "/api/twilio/ligar", { clienteId }, "Ligação iniciada ✓")}
        title={optOut ? "Cliente com opt-out" : "Ligar"}
        className={btn}
      >
        {ocupado === "ligar" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
        <span className="sr-only">Ligar para {nome}</span>
      </button>

      <button
        type="button"
        disabled={optOut || ocupado !== null}
        onClick={() => void chamar("ia", "/api/orchestrator/ligar-ia", { clienteId }, "Ligação IA iniciada ✓")}
        title={optOut ? "Cliente com opt-out" : "Ligar com IA (agente)"}
        className={cn(btn, "border-primary/40 text-primary hover:bg-primary/10")}
      >
        {ocupado === "ia" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Bot className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
        <span className="sr-only">Ligar com IA para {nome}</span>
      </button>

      <button
        type="button"
        disabled={optOut || ocupado !== null}
        onClick={() => setModal(true)}
        title={optOut ? "Cliente com opt-out" : "Enviar WhatsApp"}
        className={btn}
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
              <button type="button" onClick={() => setModal(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                Cancelar
              </button>
              <button
                type="button"
                disabled={ocupado !== null || mensagem.trim().length === 0}
                onClick={async () => {
                  const ok = await chamar("whatsapp", "/api/twilio/whatsapp", { clienteId, mensagem }, "WhatsApp enviado ✓");
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

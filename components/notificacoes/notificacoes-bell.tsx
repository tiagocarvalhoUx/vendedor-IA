"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, PartyPopper, X } from "lucide-react";
import { cn, formatBRL, formatRelativo } from "@/lib/utils";

interface Notificacao {
  readonly id: string;
  readonly titulo: string;
  readonly mensagem: string;
  readonly valor: number | null;
  readonly lida: boolean;
  readonly criadoEm: string;
}

const INTERVALO_MS = 15_000; // polling
const TOAST_MS = 7_000; // duração do toast

/**
 * Sino de notificações — polling do /api/notificacoes a cada 15s.
 * Mostra contador de não lidas, dropdown com a lista e dispara um TOAST quando
 * uma venda nova é finalizada (evento que ainda não tínhamos visto na sessão).
 */
export function NotificacoesBell() {
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [toasts, setToasts] = useState<Notificacao[]>([]);
  const vistos = useRef<Set<string>>(new Set());
  const primeiraCarga = useRef(true);

  const removerToast = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const consultar = useCallback(async () => {
    try {
      const r = await fetch("/api/notificacoes", { cache: "no-store" });
      if (!r.ok) return;
      const data = (await r.json()) as { itens: Notificacao[]; naoLidas: number };
      const lista = data.itens ?? [];
      setItens(lista);
      setNaoLidas(data.naoLidas ?? 0);

      if (primeiraCarga.current) {
        // Não toastar o histórico já existente ao carregar a página.
        lista.forEach((n) => vistos.current.add(n.id));
        primeiraCarga.current = false;
        return;
      }
      const novos = lista.filter((n) => !vistos.current.has(n.id));
      novos.forEach((n) => vistos.current.add(n.id));
      if (novos.length > 0) {
        setToasts((ts) => [...novos, ...ts].slice(0, 4));
        novos.forEach((n) => setTimeout(() => removerToast(n.id), TOAST_MS));
      }
    } catch {
      /* falha de rede: silencioso, tenta no próximo ciclo */
    }
  }, [removerToast]);

  useEffect(() => {
    void consultar();
    const id = setInterval(() => void consultar(), INTERVALO_MS);
    return () => clearInterval(id);
  }, [consultar]);

  async function alternar() {
    const vaiAbrir = !aberto;
    setAberto(vaiAbrir);
    if (vaiAbrir && naoLidas > 0) {
      setNaoLidas(0);
      setItens((xs) => xs.map((x) => ({ ...x, lida: true })));
      try {
        await fetch("/api/notificacoes/ler", { method: "POST" });
      } catch {
        /* ignora */
      }
    }
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={alternar}
          aria-label={`Notificações: ${naoLidas} não lida(s)`}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          {naoLidas > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </button>

        {aberto && (
          <>
            <button
              aria-label="Fechar notificações"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setAberto(false)}
            />
            <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold">Notificações</span>
              </div>
              <ul className="max-h-96 divide-y divide-border overflow-y-auto scrollbar-suave">
                {itens.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma notificação ainda.
                  </li>
                ) : (
                  itens.map((n) => (
                    <li key={n.id} className={cn("flex gap-3 px-4 py-3", !n.lida && "bg-primary/5")}>
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                        <PartyPopper className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{n.titulo}</p>
                        <p className="truncate text-xs text-muted-foreground">{n.mensagem}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs">
                          {n.valor !== null && (
                            <span className="font-semibold text-primary tabular-nums">
                              {formatBRL(n.valor)}
                            </span>
                          )}
                          <span className="text-muted-foreground">{formatRelativo(n.criadoEm)}</span>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Toasts (canto inferior direito) */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-lg ring-1 ring-primary/10"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <PartyPopper className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.titulo}</p>
              <p className="text-xs text-muted-foreground">{t.mensagem}</p>
              {t.valor !== null && (
                <p className="mt-0.5 text-sm font-bold text-primary tabular-nums">{formatBRL(t.valor)}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dispensar"
              onClick={() => removerToast(t.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

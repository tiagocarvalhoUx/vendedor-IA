"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Search,
  Calendar,
  ChevronDown,
  ArrowRight,
  Boxes,
  LogOut,
} from "lucide-react";
import { sair } from "@/app/login/actions";
import { RegistrarDigital } from "@/components/auth/registrar-digital";
import { NAV, type ItemNav } from "@/components/layout/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificacoesBell } from "@/components/notificacoes/notificacoes-bell";
import { Rodape } from "@/components/layout/rodape";
import { cn } from "@/lib/utils";
import logoVia from "@/components/logo/logo-IA.png";

function saudacaoPorHora(h: number): string {
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Um link da navegação, com estado ativo preenchido (índigo). */
function LinkNav({
  item,
  ativo,
  onNavegar,
}: {
  readonly item: ItemNav;
  readonly ativo: boolean;
  readonly onNavegar?: () => void;
}) {
  const { href, rotulo, Icone } = item;
  return (
    <Link
      href={href}
      onClick={onNavegar}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ativo
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icone className="h-[18px] w-[18px] shrink-0" strokeWidth={ativo ? 2 : 1.75} aria-hidden />
      <span className="truncate">{rotulo}</span>
    </Link>
  );
}

function Marca() {
  return (
    <Image
      src={logoVia}
      alt="VIA — AI Sales Automation"
      width={140}
      height={118}
      priority
      className="h-auto w-[140px] shrink-0"
    />
  );
}

function CardPromo() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent p-4 text-primary-foreground">
      <Boxes className="absolute -right-3 -top-3 h-20 w-20 opacity-20" strokeWidth={1.25} aria-hidden />
      <p className="relative text-sm font-semibold leading-snug">
        Potencialize seus resultados com IA
      </p>
      <p className="relative mt-1 text-xs text-primary-foreground/80">
        Automatize, acompanhe e escale suas operações.
      </p>
      <button
        type="button"
        className="relative mt-3 inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors hover:bg-white/30"
      >
        Saiba mais <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

function RodapeOperador({ operador }: { readonly operador: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
        {operador.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium">{operador}</p>
        <p className="truncate text-xs text-muted-foreground">fiscal de robôs</p>
      </div>
      <RegistrarDigital />
      <form action={sair}>
        <button
          type="submit"
          title="Sair"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="sr-only">Sair</span>
        </button>
      </form>
    </div>
  );
}

/** Conteúdo da barra lateral (reutilizado no desktop e no drawer mobile). */
function ConteudoSidebar({
  ehAtivo,
  onNavegar,
  operador,
}: {
  readonly ehAtivo: (href: string) => boolean;
  readonly onNavegar?: () => void;
  readonly operador: string;
}) {
  return (
    <>
      <div className="flex justify-center px-4 pt-5">
        <Marca />
      </div>
      <nav aria-label="Navegação principal" className="mt-6 flex-1 space-y-1 overflow-y-auto px-3 scrollbar-suave">
        {NAV.map((item) => (
          <LinkNav key={item.href} item={item} ativo={ehAtivo(item.href)} onNavegar={onNavegar} />
        ))}
      </nav>
      <div className="space-y-3 p-3">
        <CardPromo />
        <div className="border-t border-border pt-2">
          <RodapeOperador operador={operador} />
        </div>
      </div>
    </>
  );
}

/**
 * Shell do painel — mobile-first, estilo SaaS índigo.
 *  • Sidebar branca "flutuante" (desktop) / drawer (mobile).
 *  • Header com saudação, busca, data, notificações, tema e avatar.
 */
export function DashboardShell({
  children,
  operador,
}: {
  readonly children: React.ReactNode;
  readonly operador: string;
}) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [saudacao, setSaudacao] = useState("Olá");
  const [dataHoje, setDataHoje] = useState("");

  const ehAtivo = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => setAberto(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Saudação e data no cliente (evita divergência de fuso no SSR).
  useEffect(() => {
    const agora = new Date();
    setSaudacao(saudacaoPorHora(agora.getHours()));
    setDataHoje(
      new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(agora),
    );
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* ─── Sidebar desktop (card flutuante) ─── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] p-3 md:block">
        <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-sm">
          <ConteudoSidebar ehAtivo={ehAtivo} operador={operador} />
        </div>
      </aside>

      {/* ─── Drawer mobile ─── */}
      {aberto && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-card shadow-xl">
            <button
              aria-label="Fechar menu"
              onClick={() => setAberto(false)}
              className="absolute right-3 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </button>
            <ConteudoSidebar ehAtivo={ehAtivo} onNavegar={() => setAberto(false)} operador={operador} />
          </div>
        </div>
      )}

      {/* ─── Coluna de conteúdo ─── */}
      <div className="flex min-h-[100dvh] flex-col md:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 lg:h-20">
          <button
            aria-label="Abrir menu"
            onClick={() => setAberto(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </button>

          {/* Saudação */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl" suppressHydrationWarning>
              {saudacao}, {operador}! <span aria-hidden>👋</span>
            </h1>
            <p className="hidden truncate text-sm text-muted-foreground sm:block">
              Aqui está o desempenho da sua operação hoje.
            </p>
          </div>

          {/* Data */}
          <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm lg:flex">
            <Calendar className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            <span className="tabular-nums" suppressHydrationWarning>{dataHoje}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>

          {/* Busca */}
          <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 md:flex">
            <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            <input
              type="search"
              placeholder="Buscar..."
              aria-label="Buscar"
              className="w-28 bg-transparent text-sm outline-none placeholder:text-muted-foreground lg:w-40"
            />
          </div>

          {/* Notificações (sino ao vivo: vendas finalizadas) */}
          <NotificacoesBell />

          <ThemeToggle />

          {/* Avatar */}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-semibold text-white">
            {operador.slice(0, 2).toUpperCase()}
          </span>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-8 pt-2 sm:px-6">
          {children}
          <Rodape />
        </main>
      </div>
    </div>
  );
}

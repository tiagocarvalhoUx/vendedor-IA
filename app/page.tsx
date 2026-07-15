import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import logoIA from "@/components/logo/logo-IA.png";

// Landing pública (home). Ponto de entrada com marca; CTA leva ao painel.
export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Image src={logoIA} alt="VIA" width={110} height={92} priority className="h-auto w-[110px]" />
          <Link
            href="/overview"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Entrar no painel <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* brilho decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] max-w-full -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-14 text-center sm:px-6 sm:pt-24">
          <Image
            src={logoIA}
            alt="VIA — AI Sales Automation"
            width={240}
            height={202}
            priority
            className="mx-auto h-auto w-[180px] sm:w-[220px]"
          />
          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            AI Sales Automation
          </span>
          <h1 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Seu time de vendas com IA, trabalhando{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              24 horas por dia
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            O VIA puxa cliente e catálogo, conversa no ritmo humano, tira dúvidas
            com base no seu manual e fecha pedidos — do primeiro contato ao
            faturamento.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/overview"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
            >
              Acessar painel <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/pedidos"
              className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium transition-colors hover:bg-secondary sm:w-auto"
            >
              Ver pipeline de vendas
            </Link>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>VIA — AI Sales Automation</span>
          <span>© {new Date().getFullYear()} · Feito para vender no automático</span>
        </div>
      </footer>
    </div>
  );
}

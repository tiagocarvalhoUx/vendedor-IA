"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Alterna tema claro/escuro. Persiste em localStorage ('tema') e adiciona/
 * remove a classe `.dark` no <html>. O flash inicial é evitado pelo script
 * inline em app/layout.tsx.
 */
export function ThemeToggle() {
  const [montado, setMontado] = useState(false);
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains("dark"));
    setMontado(true);
  }, []);

  function alternar() {
    const novo = !escuro;
    document.documentElement.classList.toggle("dark", novo);
    try {
      localStorage.setItem("tema", novo ? "dark" : "light");
    } catch {
      /* localStorage indisponível — ignora */
    }
    setEscuro(novo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Ativar tema claro" : "Ativar tema escuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Antes de montar, mostra um ícone neutro para não divergir do SSR. */}
      {montado && escuro ? (
        <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      ) : (
        <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}

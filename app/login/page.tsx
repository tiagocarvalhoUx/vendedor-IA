import Image from "next/image";
import { entrar } from "./actions";
import { EntrarComDigital } from "@/components/auth/entrar-digital";
import logoIA from "@/components/logo/logo-IA.png";

export const metadata = { title: "Entrar · VIA" };

// Página de login do operador (pública). O middleware redireciona para cá
// quem tenta acessar o painel sem sessão.
export default function LoginPage({
  searchParams,
}: {
  readonly searchParams: { erro?: string; next?: string };
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <Image src={logoIA} alt="VIA" width={150} height={126} priority className="h-auto w-[150px]" />
          <p className="mt-2 text-sm text-muted-foreground">Painel do operador</p>
        </div>

        <form
          action={entrar}
          className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <input type="hidden" name="next" value={searchParams.next ?? "/overview"} />

          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="senha" className="text-sm font-medium">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {searchParams.erro && (
            <p className="text-sm text-destructive">{searchParams.erro}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition-opacity hover:opacity-90"
          >
            Entrar
          </button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <EntrarComDigital next={searchParams.next ?? "/overview"} />
        </form>
      </div>
    </div>
  );
}

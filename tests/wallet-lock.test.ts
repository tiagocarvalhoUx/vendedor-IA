import { describe, it, expect } from "vitest";
import { avaliarAtribuicao } from "@/lib/wallet-lock";

describe("avaliarAtribuicao — carteira exclusiva", () => {
  const IA_A = "ia-aaa";
  const IA_B = "ia-bbb";

  it("permite atribuir cliente sem dono", () => {
    const r = avaliarAtribuicao(null, IA_A);
    expect(r).toEqual({ permitido: true, motivo: "livre" });
  });

  it("é idempotente para o mesmo vendedor", () => {
    const r = avaliarAtribuicao(IA_A, IA_A);
    expect(r).toEqual({ permitido: true, motivo: "mesmo_dono" });
  });

  it("BLOQUEIA um segundo vendedor no mesmo cliente (regra inegociável)", () => {
    const r = avaliarAtribuicao(IA_A, IA_B);
    expect(r.permitido).toBe(false);
    if (!r.permitido) {
      expect(r.motivo).toBe("conflito");
      expect(r.donoAtual).toBe(IA_A);
    }
  });
});

import { describe, it, expect } from "vitest";
import {
  avaliarGrounding,
  montarContexto,
  THRESHOLD_PADRAO,
  type TrechoRecuperado,
} from "@/lib/rag";

// Fábrica de trecho para reduzir ruído nos testes.
function trecho(sim: number, id = crypto.randomUUID()): TrechoRecuperado {
  return {
    id,
    conteudo: `conteúdo ${id}`,
    fonte: "Manual Unno §1",
    similaridade: sim,
  };
}

describe("avaliarGrounding — portão anti-alucinação", () => {
  it("responde fundamentado quando há trecho acima do threshold", () => {
    const r = avaliarGrounding([trecho(0.62), trecho(0.91)], THRESHOLD_PADRAO);
    expect(r.tipo).toBe("fundamentada");
    if (r.tipo === "fundamentada") {
      expect(r.confianca).toBeCloseTo(0.91);
      // Deve anexar {fonte, trecho, id_manual} a toda resposta.
      expect(r.citacoes[0]).toMatchObject({ fonte: "Manual Unno §1" });
      expect(r.citacoes[0]?.id_manual).toBeTruthy();
    }
  });

  it('devolve "não sei" quando todos os trechos ficam abaixo do threshold', () => {
    const r = avaliarGrounding([trecho(0.5), trecho(0.6)], THRESHOLD_PADRAO);
    expect(r.tipo).toBe("nao_sei");
    if (r.tipo === "nao_sei") {
      expect(r.melhorSimilaridade).toBeCloseTo(0.6);
    }
  });

  it('devolve "não sei" quando não há nenhum trecho (pergunta fora do manual)', () => {
    const r = avaliarGrounding([], THRESHOLD_PADRAO);
    expect(r.tipo).toBe("nao_sei");
  });

  it("ordena citações por similaridade decrescente", () => {
    const r = avaliarGrounding([trecho(0.8), trecho(0.95), trecho(0.82)]);
    if (r.tipo === "fundamentada") {
      const sims = r.citacoes.map((c) => c.similaridade);
      expect(sims).toEqual([...sims].sort((a, b) => b - a));
    }
  });

  it("respeita threshold customizado (mais rígido)", () => {
    const trechos = [trecho(0.85)];
    expect(avaliarGrounding(trechos, 0.78).tipo).toBe("fundamentada");
    expect(avaliarGrounding(trechos, 0.9).tipo).toBe("nao_sei");
  });

  it("ignora similaridades não-finitas sem quebrar", () => {
    const r = avaliarGrounding([trecho(Number.NaN), trecho(0.99)]);
    expect(r.tipo).toBe("fundamentada");
  });
});

describe("montarContexto", () => {
  it("retorna string vazia quando não há fundamento", () => {
    const r = avaliarGrounding([], THRESHOLD_PADRAO);
    expect(montarContexto(r)).toBe("");
  });

  it("inclui fonte e id em cada bloco de contexto", () => {
    const r = avaliarGrounding([trecho(0.9, "abc")]);
    const ctx = montarContexto(r);
    expect(ctx).toContain("Manual Unno §1");
    expect(ctx).toContain("abc");
  });
});

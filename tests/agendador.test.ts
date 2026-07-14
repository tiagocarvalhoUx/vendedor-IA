import { describe, it, expect } from "vitest";
import {
  horaParaMinutos,
  dentroDaJanela,
  toqueVencido,
  podeContatarAgora,
} from "@/lib/agendador";

// Helper: cria um Date em horário de Brasília (UTC-3) a partir de "HH:MM".
// Ex.: 09:00 BRT = 12:00 UTC. Usamos UTC explícito para o teste ser estável
// independentemente do fuso da máquina de CI.
function brt(hora: number, minuto = 0): Date {
  return new Date(Date.UTC(2026, 6, 13, hora + 3, minuto)); // +3 → UTC
}

describe("horaParaMinutos", () => {
  it("converte HH:MM em minutos", () => {
    expect(horaParaMinutos("07:30")).toBe(450);
    expect(horaParaMinutos("18:00")).toBe(1080);
  });
  it("rejeita formato inválido", () => {
    expect(() => horaParaMinutos("25:00")).toThrow();
    expect(() => horaParaMinutos("7:5")).toThrow();
  });
});

describe("dentroDaJanela — 7h30 às 18h", () => {
  it("libera dentro da janela", () => {
    expect(dentroDaJanela(brt(9, 0))).toBe(true);
    expect(dentroDaJanela(brt(7, 30))).toBe(true); // limite inferior inclusivo
    expect(dentroDaJanela(brt(17, 59))).toBe(true);
  });
  it("bloqueia antes das 7h30", () => {
    expect(dentroDaJanela(brt(7, 0))).toBe(false);
    expect(dentroDaJanela(brt(6, 0))).toBe(false);
  });
  it("bloqueia às 18h e depois (limite superior exclusivo)", () => {
    expect(dentroDaJanela(brt(18, 0))).toBe(false);
    expect(dentroDaJanela(brt(21, 0))).toBe(false);
  });
});

describe("toqueVencido — cadência de manutenção", () => {
  const agora = new Date("2026-07-13T12:00:00Z");
  it("toca quando nunca houve contato", () => {
    expect(toqueVencido(null, 30, agora)).toBe(true);
  });
  it("não toca antes do intervalo", () => {
    const ha10dias = new Date("2026-07-03T12:00:00Z").toISOString();
    expect(toqueVencido(ha10dias, 30, agora)).toBe(false);
  });
  it("toca ao atingir o intervalo", () => {
    const ha30dias = new Date("2026-06-13T12:00:00Z").toISOString();
    expect(toqueVencido(ha30dias, 30, agora)).toBe(true);
  });
});

describe("podeContatarAgora — portão único de contato ativo", () => {
  const agora = brt(10, 0); // dentro da janela
  const base = { opt_out: false, ultimo_contato: null, intervalo_contato_dias: 30 };

  it("libera cliente elegível dentro da janela", () => {
    expect(podeContatarAgora(base, agora).liberado).toBe(true);
  });
  it("NUNCA contata quem deu opt-out (LGPD)", () => {
    const r = podeContatarAgora({ ...base, opt_out: true }, agora);
    expect(r).toEqual({ liberado: false, motivo: "opt_out" });
  });
  it("bloqueia fora da janela mesmo sendo elegível", () => {
    const r = podeContatarAgora(base, brt(20, 0));
    expect(r).toEqual({ liberado: false, motivo: "fora_da_janela" });
  });
  it("bloqueia quando o toque ainda não venceu", () => {
    const recente = new Date("2026-07-12T12:00:00Z").toISOString();
    const r = podeContatarAgora({ ...base, ultimo_contato: recente }, agora);
    expect(r).toEqual({ liberado: false, motivo: "toque_nao_vencido" });
  });
});

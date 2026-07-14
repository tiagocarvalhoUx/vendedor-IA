/**
 * Agendador de toques — regras de janela e cadência (funções PURAS).
 *
 * Guard rails (§5):
 *  • Janela 7h30–18h: fora dela, nenhum contato ATIVO.
 *  • Toque de manutenção a cada 30 dias (ou intervalo do cliente) para não
 *    perder o cliente pela regra dos 90 dias da casa.
 *  • opt_out honrado SEMPRE, em qualquer canal.
 *
 * Tudo aqui é determinístico e recebe `agora` por parâmetro — sem `Date.now()`
 * escondido — para ser 100% testável.
 */

/** Converte "HH:MM" em minutos desde a meia-noite. Lança em formato inválido. */
export function horaParaMinutos(hhmm: string): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (m === null) {
    throw new Error(`Horário inválido: "${hhmm}" (esperado HH:MM 24h).`);
  }
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Retorna `true` se `agora` está dentro da janela [inicio, fim) do vendedor.
 * Usa o fuso horário de São Paulo (America/Sao_Paulo) independentemente do
 * fuso do servidor — a operação é 100% no horário comercial brasileiro.
 */
export function dentroDaJanela(
  agora: Date,
  inicio: string = "07:30",
  fim: string = "18:00",
): boolean {
  const minutosAgora = minutosLocaisBrasil(agora);
  const ini = horaParaMinutos(inicio);
  const f = horaParaMinutos(fim);
  return minutosAgora >= ini && minutosAgora < f;
}

/** Minutos desde a meia-noite no fuso America/Sao_Paulo para um instante dado. */
export function minutosLocaisBrasil(agora: Date): number {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const partes = fmt.formatToParts(agora);
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? "0");
  const minuto = Number(partes.find((p) => p.type === "minute")?.value ?? "0");
  // Intl pode devolver "24" para meia-noite em alguns runtimes — normaliza.
  return (hora % 24) * 60 + minuto;
}

/**
 * Decide se o cliente está "vencido" para um toque de manutenção.
 *
 * @param ultimoContato ISO string do último contato, ou `null` (nunca contatado)
 * @param intervaloDias cadência do cliente (padrão 30)
 * @param agora         instante de referência
 */
export function toqueVencido(
  ultimoContato: string | null,
  intervaloDias: number,
  agora: Date,
): boolean {
  if (ultimoContato === null) return true; // nunca contatado → tocar
  const ultimo = new Date(ultimoContato).getTime();
  if (Number.isNaN(ultimo)) {
    throw new Error(`Data de último contato inválida: "${ultimoContato}".`);
  }
  const diasDesde = (agora.getTime() - ultimo) / 86_400_000;
  return diasDesde >= intervaloDias;
}

/** Entrada mínima para decidir se um cliente pode ser contatado agora. */
export interface CandidatoToque {
  readonly opt_out: boolean;
  readonly ultimo_contato: string | null;
  readonly intervalo_contato_dias: number;
}

/**
 * Portão único de contato ativo: só libera se (a) não houve opt-out,
 * (b) está na janela do vendedor e (c) o toque está vencido.
 */
export function podeContatarAgora(
  candidato: CandidatoToque,
  agora: Date,
  janela: { inicio?: string; fim?: string } = {},
): { readonly liberado: boolean; readonly motivo: string } {
  if (candidato.opt_out) {
    return { liberado: false, motivo: "opt_out" };
  }
  if (!dentroDaJanela(agora, janela.inicio, janela.fim)) {
    return { liberado: false, motivo: "fora_da_janela" };
  }
  if (!toqueVencido(candidato.ultimo_contato, candidato.intervalo_contato_dias, agora)) {
    return { liberado: false, motivo: "toque_nao_vencido" };
  }
  return { liberado: true, motivo: "liberado" };
}

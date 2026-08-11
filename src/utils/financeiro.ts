/**
 * Regras de domínio financeiro centralizadas.
 * Unifica o cálculo de saldo de parcelas (a receber/fiado) que estava
 * duplicado em VendasPage, FinanceiroPage, RelatoriosPage e modais.
 */

export interface ReceivableLike {
  valorParcela: number;
  saldoRestante?: number;
  valorJaPago?: number;
}

/**
 * Saldo restante de uma parcela.
 * Prefere o valor informado pela API (`saldoRestante`); se ausente,
 * calcula a partir do valor original menos o que já foi pago.
 */
export function saldoRestante(rec: ReceivableLike): number {
  return rec.saldoRestante ?? (Number(rec.valorParcela) - (rec.valorJaPago ?? 0));
}

/**
 * Valor máximo aceito numa baixa/pagamento de parcela (nunca negativo).
 * Usado para limitar o campo de valor pago nos modais de baixa.
 */
export function valorMaximoBaixa(rec: ReceivableLike): number {
  return Math.max(0, saldoRestante(rec));
}

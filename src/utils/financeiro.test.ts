import { describe, it, expect } from 'vitest';
import { saldoRestante, valorMaximoBaixa } from './financeiro';

describe('saldoRestante', () => {
  it('usa o saldo informado pela API quando presente', () => {
    expect(saldoRestante({ valorParcela: 100, saldoRestante: 40 })).toBe(40);
  });

  it('calcula a partir do valor pago quando o saldo não vem da API', () => {
    expect(saldoRestante({ valorParcela: 100, valorJaPago: 25 })).toBe(75);
  });

  it('trata valorJaPago ausente como zero', () => {
    expect(saldoRestante({ valorParcela: 100 })).toBe(100);
  });

  it('prefere saldoRestante mesmo com valorJaPago presente', () => {
    expect(saldoRestante({ valorParcela: 100, saldoRestante: 10, valorJaPago: 90 })).toBe(10);
  });

  it('aceita strings numéricas como o backend retorna', () => {
    expect(saldoRestante({ valorParcela: '100' as unknown as number })).toBe(100);
  });
});

describe('valorMaximoBaixa', () => {
  it('retorna o saldo restante', () => {
    expect(valorMaximoBaixa({ valorParcela: 100, saldoRestante: 30 })).toBe(30);
  });

  it('nunca retorna negativo para parcelas pagas em excesso', () => {
    expect(valorMaximoBaixa({ valorParcela: 100, valorJaPago: 150 })).toBe(0);
  });
});

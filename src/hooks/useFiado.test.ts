import { describe, it, expect } from 'vitest';
import { deriveReceivable } from './useFiado';
import type { Receivable } from '../types/api';

const base = (overrides: Partial<Receivable> = {}): Receivable => ({
  id: 'r1',
  customer: { id: 'c1', nomeCompleto: 'João Silva' },
  sale: { id: 's1' },
  dataVencimento: '2026-08-01T00:00:00',
  numeroParcela: 1,
  totalParcelas: 2,
  valorParcela: 100,
  status: 'PENDENTE',
  statusExibicao: 'PENDENTE',
  formaPagamentoEsperada: 'DINHEIRO',
  ...overrides,
});

const hoje = new Date('2026-08-10T12:00:00');

describe('deriveReceivable', () => {
  it('parcela pendente: saldo = valor da parcela, sem atraso', () => {
    const d = deriveReceivable(base(), hoje);
    expect(d.isPago).toBe(false);
    expect(d.isParcial).toBe(false);
    expect(d.isVencido).toBe(false);
    expect(d.saldo).toBe(100);
    expect(d.temParcial).toBe(false);
    expect(d.diasAtraso).toBe(0);
  });

  it('parcela paga', () => {
    const d = deriveReceivable(base({ statusExibicao: 'PAGO' }), hoje);
    expect(d.isPago).toBe(true);
  });

  it('parcela parcial: saldo do saldoRestante e temParcial true', () => {
    const d = deriveReceivable(base({ statusExibicao: 'PAGO_PARCIAL', saldoRestante: 40 }), hoje);
    expect(d.isParcial).toBe(true);
    expect(d.saldo).toBe(40);
    expect(d.temParcial).toBe(true);
  });

  it('parcela vencida: calcula dias de atraso (mínimo 1)', () => {
    const d = deriveReceivable(base({ statusExibicao: 'VENCIDO', dataVencimento: '2026-08-05T00:00:00' }), hoje);
    expect(d.isVencido).toBe(true);
    expect(d.diasAtraso).toBe(5);
  });

  it('saldoRestante nulo usa valorParcela como fallback', () => {
    const d = deriveReceivable(base({ saldoRestante: undefined }), hoje);
    expect(d.saldo).toBe(100);
  });
});

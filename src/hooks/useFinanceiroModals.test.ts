import { describe, it, expect } from 'vitest';
import { financeiroModalsReducer, type FinanceiroModalsState } from './useFinanceiroModals';
import type { LancamentoForm, PayableForm } from '../components/LancamentoModal';

type Rec = { id: string };
type Pay = { id: string };
type State = FinanceiroModalsState<Rec, Pay>;

const base: State = {
  cobranca: false,
  lancamento: { isOpen: false, tipoInicial: 'RECEITA', initialTx: null, initialPayable: null },
  baixa: { isOpen: false },
  baixaPagar: { isOpen: false },
  import: false,
};

const tx: LancamentoForm = {
  id: 'tx1', tipo: 'ENTRADA', valor: '10', descricao: 'Venda', walletId: 'w1', categoria: '',
  dataTransacao: '2026-08-12T10:00', customerId: '', fornecedor: '',
  isParcelado: false, numeroParcelas: 2, frequencia: 'MENSAL', isFirstPaid: true, comprovante: null,
};

const payable: PayableForm = {
  id: 'p1', descricao: 'Aluguel', categoria: '', fornecedor: '', dataVencimento: '2026-09-01',
  valor: '100', isParcelado: false, numeroParcelas: 2, frequencia: 'MENSAL', isFirstPaid: false,
};

describe('financeiroModalsReducer', () => {
  it('abre e fecha o modal de cobrança', () => {
    expect(financeiroModalsReducer<Rec, Pay>(base, { type: 'OPEN_COBRANCA' }).cobranca).toBe(true);
    const open = financeiroModalsReducer<Rec, Pay>(base, { type: 'OPEN_COBRANCA' });
    expect(financeiroModalsReducer<Rec, Pay>(open, { type: 'CLOSE_COBRANCA' }).cobranca).toBe(false);
  });

  it('abre e fecha o modal de lançamento', () => {
    const open = financeiroModalsReducer<Rec, Pay>(base, { type: 'OPEN_LANCAMENTO' });
    expect(open.lancamento.isOpen).toBe(true);
    expect(open.lancamento.initialTx).toBeNull();
    expect(financeiroModalsReducer<Rec, Pay>(open, { type: 'CLOSE_LANCAMENTO' }).lancamento).toEqual(base.lancamento);
  });

  it('OPEN_LANCAMENTO_TIPO define o tipo inicial do lançamento novo', () => {
    const state = financeiroModalsReducer<Rec, Pay>(base, { type: 'OPEN_LANCAMENTO_TIPO', tipo: 'CONTA_PAGAR' });
    expect(state.lancamento).toEqual({
      isOpen: true,
      tipoInicial: 'CONTA_PAGAR',
      initialTx: null,
      initialPayable: null,
    });
  });

  it('OPEN_LANCAMENTO_TX guarda a transação a editar e deriva o tipo', () => {
    const state = financeiroModalsReducer<Rec, Pay>(base, { type: 'OPEN_LANCAMENTO_TX', tx });
    expect(state.lancamento.isOpen).toBe(true);
    expect(state.lancamento.tipoInicial).toBe('RECEITA');
    expect(state.lancamento.initialTx).toEqual(tx);
    expect(state.lancamento.initialPayable).toBeNull();
  });

  it('OPEN_LANCAMENTO_PAYABLE guarda a conta a pagar a editar', () => {
    const state = financeiroModalsReducer<Rec, Pay>(base, { type: 'OPEN_LANCAMENTO_PAYABLE', payable });
    expect(state.lancamento.isOpen).toBe(true);
    expect(state.lancamento.tipoInicial).toBe('CONTA_PAGAR');
    expect(state.lancamento.initialPayable).toEqual(payable);
    expect(state.lancamento.initialTx).toBeNull();
  });

  it('OPEN_BAIXA guarda o receivable e fecha limpa', () => {
    const state = financeiroModalsReducer<Rec, Pay>(base, { type: 'OPEN_BAIXA', rec: { id: 'r1' } });
    expect(state.baixa).toEqual({ isOpen: true, rec: { id: 'r1' } });
    expect(financeiroModalsReducer<Rec, Pay>(state, { type: 'CLOSE_BAIXA' }).baixa).toEqual({ isOpen: false });
  });

  it('OPEN_BAIXA_PAGAR guarda o payable', () => {
    const state = financeiroModalsReducer<Rec, Pay>(base, { type: 'OPEN_BAIXA_PAGAR', payable: { id: 'p1' } });
    expect(state.baixaPagar).toEqual({ isOpen: true, payable: { id: 'p1' } });
  });
});
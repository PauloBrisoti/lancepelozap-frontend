import { describe, it, expect } from 'vitest';
import { transactionFormReducer, type TransactionFormState } from './useTransactionForm';

function baseState(overrides: Partial<TransactionFormState> = {}): TransactionFormState {
  return {
    open: false,
    tipo: 'SAIDA',
    categoryId: '',
    walletId: '',
    valor: '',
    descricao: '',
    data: '2026-08-08',
    hora: '10:00',
    editingTx: null,
    ...overrides,
  };
}

const tx = {
  id: 'tx1',
  categoryId: 'cat1',
  walletId: 'wal1',
  tipo: 'ENTRADA',
  valor: 1234.5,
  descricao: 'Salário',
  data: '2026-08-08T10:30:00',
};

describe('transactionFormReducer', () => {
  it('OPEN_NEW abre o modal com form zerado e sem item em edição', () => {
    const state = transactionFormReducer(baseState(), { type: 'OPEN_NEW', tipo: 'ENTRADA' });
    expect(state.open).toBe(true);
    expect(state.tipo).toBe('ENTRADA');
    expect(state.editingTx).toBeNull();
    expect(state.categoryId).toBe('');
    expect(state.valor).toBe('');
    expect(state.descricao).toBe('');
  });

  it('OPEN_EDIT preenche o form com os dados do item formatados', () => {
    const state = transactionFormReducer(baseState(), { type: 'OPEN_EDIT', tx });
    expect(state.open).toBe(true);
    expect(state.editingTx).toEqual(tx);
    expect(state.tipo).toBe('ENTRADA');
    expect(state.categoryId).toBe('cat1');
    expect(state.walletId).toBe('wal1');
    expect(state.valor).toBe('1.234,50');
    expect(state.descricao).toBe('Salário');
    expect(state.data).toBe('2026-08-08');
    expect(state.hora).toBe('10:30');
  });

  it('OPEN_EDIT trata walletId ausente como string vazia', () => {
    const semWallet = { ...tx, walletId: undefined };
    const state = transactionFormReducer(baseState(), { type: 'OPEN_EDIT', tx: semWallet });
    expect(state.walletId).toBe('');
  });

  it('SET_FIELD atualiza apenas o campo informado', () => {
    const state = transactionFormReducer(baseState(), { type: 'SET_FIELD', field: 'valor', value: '99,90' });
    expect(state.valor).toBe('99,90');
    expect(state.descricao).toBe('');
  });

  it('SET_TIPO altera o tipo', () => {
    const state = transactionFormReducer(baseState(), { type: 'SET_TIPO', tipo: 'ENTRADA' });
    expect(state.tipo).toBe('ENTRADA');
  });

  it('CLOSE fecha o modal preservando os campos', () => {
    const state = transactionFormReducer(
      baseState({ open: true, valor: '50', editingTx: tx }),
      { type: 'CLOSE' }
    );
    expect(state.open).toBe(false);
    expect(state.valor).toBe('50');
  });
});

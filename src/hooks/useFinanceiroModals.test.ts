import { describe, it, expect } from 'vitest';
import { financeiroModalsReducer, type FinanceiroModalsState } from './useFinanceiroModals';

type Rec = { id: string };
type Pay = { id: string };
type State = FinanceiroModalsState<Rec, Pay>;

const base: State = {
  cobranca: false,
  lancamento: false,
  baixa: { isOpen: false },
  baixaPagar: { isOpen: false },
  import: false,
  novaCategoriaMode: null,
  novaCategoriaNome: '',
  tipoLancamento: 'RECEITA',
};

describe('financeiroModalsReducer', () => {
  it('abre e fecha o modal de cobrança', () => {
    expect(financeiroModalsReducer<Rec, Pay>(base, { type: 'OPEN_COBRANCA' }).cobranca).toBe(true);
    const open = financeiroModalsReducer<Rec, Pay>(base, { type: 'OPEN_COBRANCA' });
    expect(financeiroModalsReducer<Rec, Pay>(open, { type: 'CLOSE_COBRANCA' }).cobranca).toBe(false);
  });

  it('abre e fecha o modal de lançamento', () => {
    expect(financeiroModalsReducer<Rec, Pay>(base, { type: 'OPEN_LANCAMENTO' }).lancamento).toBe(true);
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

  it('controla o fluxo de nova categoria', () => {
    const withMode = financeiroModalsReducer<Rec, Pay>(base, { type: 'SET_NOVA_CATEGORIA_MODE', mode: 'tx' });
    expect(withMode.novaCategoriaMode).toBe('tx');
    const withNome = financeiroModalsReducer<Rec, Pay>(withMode, { type: 'SET_NOVA_CATEGORIA_NOME', nome: 'Vendas' });
    expect(withNome.novaCategoriaNome).toBe('Vendas');
    expect(withNome.novaCategoriaMode).toBe('tx');
  });

  it('alterna o tipo de lançamento', () => {
    expect(financeiroModalsReducer<Rec, Pay>(base, { type: 'SET_TIPO_LANCAMENTO', tipo: 'CONTA_PAGAR' }).tipoLancamento).toBe('CONTA_PAGAR');
  });
});

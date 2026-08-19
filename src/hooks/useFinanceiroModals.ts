import { useCallback, useReducer } from 'react';
import type { LancamentoForm, PayableForm } from '../components/LancamentoModal';

export type LancamentoTipo = 'RECEITA' | 'DESPESA_VISTA' | 'CONTA_PAGAR';

export interface LancamentoDraft {
  isOpen: boolean;
  /** Tipo inicial do lançamento novo (na edição, o tipo vem do próprio registro) */
  tipoInicial: LancamentoTipo;
  /** Lançamento a editar (null = novo) */
  initialTx: LancamentoForm | null;
  /** Conta a pagar a editar (null = novo) */
  initialPayable: PayableForm | null;
}

export interface FinanceiroModalsState<Rec extends { id: string }, Pay extends { id: string }> {
  cobranca: boolean;
  lancamento: LancamentoDraft;
  baixa: { isOpen: boolean; rec?: Rec };
  baixaPagar: { isOpen: boolean; payable?: Pay };
  import: boolean;
}

export type FinanceiroModalsAction<Rec extends { id: string }, Pay extends { id: string }> =
  | { type: 'OPEN_COBRANCA' }
  | { type: 'CLOSE_COBRANCA' }
  | { type: 'OPEN_LANCAMENTO' }
  | { type: 'OPEN_LANCAMENTO_TIPO'; tipo: LancamentoTipo }
  | { type: 'OPEN_LANCAMENTO_TX'; tx: LancamentoForm }
  | { type: 'OPEN_LANCAMENTO_PAYABLE'; payable: PayableForm }
  | { type: 'CLOSE_LANCAMENTO' }
  | { type: 'OPEN_BAIXA'; rec: Rec }
  | { type: 'CLOSE_BAIXA' }
  | { type: 'OPEN_BAIXA_PAGAR'; payable: Pay }
  | { type: 'CLOSE_BAIXA_PAGAR' }
  | { type: 'OPEN_IMPORT' }
  | { type: 'CLOSE_IMPORT' };

const DEFAULT_LANCAMENTO: LancamentoDraft = {
  isOpen: false,
  tipoInicial: 'RECEITA',
  initialTx: null,
  initialPayable: null,
};

export function financeiroModalsReducer<Rec extends { id: string }, Pay extends { id: string }>(
  state: FinanceiroModalsState<Rec, Pay>,
  action: FinanceiroModalsAction<Rec, Pay>
): FinanceiroModalsState<Rec, Pay> {
  switch (action.type) {
    case 'OPEN_COBRANCA': return { ...state, cobranca: true };
    case 'CLOSE_COBRANCA': return { ...state, cobranca: false };
    case 'OPEN_LANCAMENTO':
      return { ...state, lancamento: { ...DEFAULT_LANCAMENTO, isOpen: true } };
    case 'OPEN_LANCAMENTO_TIPO':
      return { ...state, lancamento: { ...DEFAULT_LANCAMENTO, isOpen: true, tipoInicial: action.tipo } };
    case 'OPEN_LANCAMENTO_TX':
      return {
        ...state,
        lancamento: {
          isOpen: true,
          tipoInicial: action.tx.tipo === 'ENTRADA' ? 'RECEITA' : 'DESPESA_VISTA',
          initialTx: action.tx,
          initialPayable: null,
        },
      };
    case 'OPEN_LANCAMENTO_PAYABLE':
      return {
        ...state,
        lancamento: { isOpen: true, tipoInicial: 'CONTA_PAGAR', initialTx: null, initialPayable: action.payable },
      };
    case 'CLOSE_LANCAMENTO':
      return { ...state, lancamento: DEFAULT_LANCAMENTO };
    case 'OPEN_BAIXA': return { ...state, baixa: { isOpen: true, rec: action.rec } };
    case 'CLOSE_BAIXA': return { ...state, baixa: { isOpen: false } };
    case 'OPEN_BAIXA_PAGAR': return { ...state, baixaPagar: { isOpen: true, payable: action.payable } };
    case 'CLOSE_BAIXA_PAGAR': return { ...state, baixaPagar: { isOpen: false } };
    case 'OPEN_IMPORT': return { ...state, import: true };
    case 'CLOSE_IMPORT': return { ...state, import: false };
  }
}

export function useFinanceiroModals<Rec extends { id: string }, Pay extends { id: string }>() {
  const [state, dispatch] = useReducer(
    financeiroModalsReducer<Rec, Pay>,
    {
      cobranca: false,
      lancamento: DEFAULT_LANCAMENTO,
      baixa: { isOpen: false },
      baixaPagar: { isOpen: false },
      import: false,
    } satisfies FinanceiroModalsState<Rec, Pay>
  );

  const openCobranca = useCallback(() => dispatch({ type: 'OPEN_COBRANCA' }), []);
  const closeCobranca = useCallback(() => dispatch({ type: 'CLOSE_COBRANCA' }), []);
  const openLancamento = useCallback(() => dispatch({ type: 'OPEN_LANCAMENTO' }), []);
  const openLancamentoTipo = useCallback((tipo: LancamentoTipo) =>
    dispatch({ type: 'OPEN_LANCAMENTO_TIPO', tipo }), []);
  const openLancamentoTx = useCallback((tx: LancamentoForm) =>
    dispatch({ type: 'OPEN_LANCAMENTO_TX', tx }), []);
  const openLancamentoPayable = useCallback((payable: PayableForm) =>
    dispatch({ type: 'OPEN_LANCAMENTO_PAYABLE', payable }), []);
  const closeLancamento = useCallback(() => dispatch({ type: 'CLOSE_LANCAMENTO' }), []);
  const openBaixa = useCallback((rec: Rec) => dispatch({ type: 'OPEN_BAIXA', rec }), []);
  const closeBaixa = useCallback(() => dispatch({ type: 'CLOSE_BAIXA' }), []);
  const openBaixaPagar = useCallback((payable: Pay) => dispatch({ type: 'OPEN_BAIXA_PAGAR', payable }), []);
  const closeBaixaPagar = useCallback(() => dispatch({ type: 'CLOSE_BAIXA_PAGAR' }), []);
  const openImport = useCallback(() => dispatch({ type: 'OPEN_IMPORT' }), []);
  const closeImport = useCallback(() => dispatch({ type: 'CLOSE_IMPORT' }), []);

  return {
    ...state,
    openCobranca, closeCobranca,
    openLancamento, openLancamentoTipo, openLancamentoTx, openLancamentoPayable, closeLancamento,
    openBaixa, closeBaixa,
    openBaixaPagar, closeBaixaPagar,
    openImport, closeImport,
  };
}
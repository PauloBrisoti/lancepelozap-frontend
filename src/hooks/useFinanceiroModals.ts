import { useCallback, useReducer } from 'react';

export interface FinanceiroModalsState<Rec extends { id: string }, Pay extends { id: string }> {
  cobranca: boolean;
  lancamento: boolean;
  baixa: { isOpen: boolean; rec?: Rec };
  baixaPagar: { isOpen: boolean; payable?: Pay };
  import: boolean;
  novaCategoriaMode: 'tx' | null;
  novaCategoriaNome: string;
  tipoLancamento: 'RECEITA' | 'DESPESA_VISTA' | 'CONTA_PAGAR';
}

export type FinanceiroModalsAction<Rec extends { id: string }, Pay extends { id: string }> =
  | { type: 'OPEN_COBRANCA' }
  | { type: 'CLOSE_COBRANCA' }
  | { type: 'OPEN_LANCAMENTO' }
  | { type: 'CLOSE_LANCAMENTO' }
  | { type: 'OPEN_BAIXA'; rec: Rec }
  | { type: 'CLOSE_BAIXA' }
  | { type: 'OPEN_BAIXA_PAGAR'; payable: Pay }
  | { type: 'CLOSE_BAIXA_PAGAR' }
  | { type: 'OPEN_IMPORT' }
  | { type: 'CLOSE_IMPORT' }
  | { type: 'SET_NOVA_CATEGORIA_MODE'; mode: 'tx' | null }
  | { type: 'SET_NOVA_CATEGORIA_NOME'; nome: string }
  | { type: 'SET_TIPO_LANCAMENTO'; tipo: FinanceiroModalsState<Rec, Pay>['tipoLancamento'] };

export function financeiroModalsReducer<Rec extends { id: string }, Pay extends { id: string }>(
  state: FinanceiroModalsState<Rec, Pay>,
  action: FinanceiroModalsAction<Rec, Pay>
): FinanceiroModalsState<Rec, Pay> {
  switch (action.type) {
    case 'OPEN_COBRANCA': return { ...state, cobranca: true };
    case 'CLOSE_COBRANCA': return { ...state, cobranca: false };
    case 'OPEN_LANCAMENTO': return { ...state, lancamento: true };
    case 'CLOSE_LANCAMENTO': return { ...state, lancamento: false };
    case 'OPEN_BAIXA': return { ...state, baixa: { isOpen: true, rec: action.rec } };
    case 'CLOSE_BAIXA': return { ...state, baixa: { isOpen: false } };
    case 'OPEN_BAIXA_PAGAR': return { ...state, baixaPagar: { isOpen: true, payable: action.payable } };
    case 'CLOSE_BAIXA_PAGAR': return { ...state, baixaPagar: { isOpen: false } };
    case 'OPEN_IMPORT': return { ...state, import: true };
    case 'CLOSE_IMPORT': return { ...state, import: false };
    case 'SET_NOVA_CATEGORIA_MODE': return { ...state, novaCategoriaMode: action.mode };
    case 'SET_NOVA_CATEGORIA_NOME': return { ...state, novaCategoriaNome: action.nome };
    case 'SET_TIPO_LANCAMENTO': return { ...state, tipoLancamento: action.tipo };
  }
}

export function useFinanceiroModals<Rec extends { id: string }, Pay extends { id: string }>() {
  const [state, dispatch] = useReducer(
    financeiroModalsReducer<Rec, Pay>,
    {
      cobranca: false,
      lancamento: false,
      baixa: { isOpen: false },
      baixaPagar: { isOpen: false },
      import: false,
      novaCategoriaMode: null,
      novaCategoriaNome: '',
      tipoLancamento: 'RECEITA',
    } satisfies FinanceiroModalsState<Rec, Pay>
  );

  const openCobranca = useCallback(() => dispatch({ type: 'OPEN_COBRANCA' }), []);
  const closeCobranca = useCallback(() => dispatch({ type: 'CLOSE_COBRANCA' }), []);
  const openLancamento = useCallback(() => dispatch({ type: 'OPEN_LANCAMENTO' }), []);
  const closeLancamento = useCallback(() => dispatch({ type: 'CLOSE_LANCAMENTO' }), []);
  const openBaixa = useCallback((rec: Rec) => dispatch({ type: 'OPEN_BAIXA', rec }), []);
  const closeBaixa = useCallback(() => dispatch({ type: 'CLOSE_BAIXA' }), []);
  const openBaixaPagar = useCallback((payable: Pay) => dispatch({ type: 'OPEN_BAIXA_PAGAR', payable }), []);
  const closeBaixaPagar = useCallback(() => dispatch({ type: 'CLOSE_BAIXA_PAGAR' }), []);
  const openImport = useCallback(() => dispatch({ type: 'OPEN_IMPORT' }), []);
  const closeImport = useCallback(() => dispatch({ type: 'CLOSE_IMPORT' }), []);
  const setNovaCategoriaMode = useCallback((mode: 'tx' | null) => dispatch({ type: 'SET_NOVA_CATEGORIA_MODE', mode }), []);
  const setNovaCategoriaNome = useCallback((nome: string) => dispatch({ type: 'SET_NOVA_CATEGORIA_NOME', nome }), []);
  const setTipoLancamento = useCallback((tipo: FinanceiroModalsState<Rec, Pay>['tipoLancamento']) =>
    dispatch({ type: 'SET_TIPO_LANCAMENTO', tipo }), []);

  return {
    ...state,
    openCobranca, closeCobranca,
    openLancamento, closeLancamento,
    openBaixa, closeBaixa,
    openBaixaPagar, closeBaixaPagar,
    openImport, closeImport,
    setNovaCategoriaMode, setNovaCategoriaNome, setTipoLancamento,
  };
}

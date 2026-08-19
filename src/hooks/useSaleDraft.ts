import { useCallback, useReducer } from 'react';
import { todayLocalDate } from '../utils/format';

/**
 * Rascunho da venda em andamento no PDV: cliente, pagamento, descontos,
 * sinal, parcelas e data. Estados que mudam sempre juntos (reset em
 * bloco após finalizar a venda) ficam num único reducer.
 */

export interface SaleDraft {
  clienteId: string;
  formaPagamento: string;
  desconto: number;
  acrescimo: number;
  sinal: number;
  parcelas: number;
  dataVenda: string;
  repasseTaxa: boolean;
}

export type SaleDraftField = keyof SaleDraft;

type SaleDraftAction =
  | { type: 'SET_FIELD'; field: SaleDraftField; value: string | number | boolean }
  | { type: 'RESET' };

export function emptyDraft(): SaleDraft {
  return {
    clienteId: '',
    formaPagamento: 'PIX',
    desconto: 0,
    acrescimo: 0,
    sinal: 0,
    parcelas: 1,
    dataVenda: todayLocalDate(),
    repasseTaxa: false,
  };
}

export function saleDraftReducer(state: SaleDraft, action: SaleDraftAction): SaleDraft {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return emptyDraft();
  }
}

export function useSaleDraft() {
  const [state, dispatch] = useReducer(saleDraftReducer, undefined, emptyDraft);

  const setVendaField = useCallback(
    (field: SaleDraftField, value: string | number | boolean) =>
      dispatch({ type: 'SET_FIELD', field, value }),
    []
  );
  const resetVenda = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { venda: state, setVendaField, resetVenda };
}
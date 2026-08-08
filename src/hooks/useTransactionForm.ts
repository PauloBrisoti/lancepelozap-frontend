import { useCallback, useReducer } from 'react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export interface TransactionFormTx {
  id: string;
  categoryId: string;
  walletId?: string;
  tipo: string;
  valor: number;
  descricao?: string;
  data: string;
}

export interface TransactionFormState {
  open: boolean;
  tipo: 'ENTRADA' | 'SAIDA';
  categoryId: string;
  walletId: string;
  valor: string;
  descricao: string;
  data: string;
  hora: string;
  editingTx: TransactionFormTx | null;
}

type TransactionFormAction =
  | { type: 'OPEN_NEW'; tipo: 'ENTRADA' | 'SAIDA' }
  | { type: 'OPEN_EDIT'; tx: TransactionFormTx }
  | { type: 'SET_FIELD'; field: 'categoryId' | 'walletId' | 'valor' | 'descricao' | 'data' | 'hora'; value: string }
  | { type: 'SET_TIPO'; tipo: 'ENTRADA' | 'SAIDA' }
  | { type: 'CLOSE' };

const fmtTZ = (iso: string, pattern: string) => formatInTimeZone(iso, TZ, pattern, { locale: ptBR });

function formatBRL(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function emptyForm(): Omit<TransactionFormState, 'open' | 'editingTx'> {
  const now = new Date();
  return {
    tipo: 'SAIDA',
    categoryId: '',
    walletId: '',
    valor: '',
    descricao: '',
    data: format(now, 'yyyy-MM-dd'),
    hora: format(now, 'HH:mm'),
  };
}

export function transactionFormReducer(state: TransactionFormState, action: TransactionFormAction): TransactionFormState {
  switch (action.type) {
    case 'OPEN_NEW':
      return { ...emptyForm(), open: true, editingTx: null, tipo: action.tipo };
    case 'OPEN_EDIT':
      return {
        ...state,
        open: true,
        editingTx: action.tx,
        tipo: action.tx.tipo as 'ENTRADA' | 'SAIDA',
        categoryId: action.tx.categoryId,
        walletId: action.tx.walletId || '',
        valor: formatBRL(Number(action.tx.valor)).replace(/R\$\s?/, ''),
        descricao: action.tx.descricao || '',
        data: fmtTZ(action.tx.data, 'yyyy-MM-dd'),
        hora: fmtTZ(action.tx.data, 'HH:mm'),
      };
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_TIPO':
      return { ...state, tipo: action.tipo };
    case 'CLOSE':
      return { ...state, open: false };
  }
}

export function useTransactionForm() {
  const [state, dispatch] = useReducer(transactionFormReducer, undefined, () => ({ ...emptyForm(), open: false, editingTx: null }));

  const openNew = useCallback((tipo: 'ENTRADA' | 'SAIDA') => dispatch({ type: 'OPEN_NEW', tipo }), []);
  const openEdit = useCallback((tx: TransactionFormTx) => dispatch({ type: 'OPEN_EDIT', tx }), []);
  const setField = useCallback((field: 'categoryId' | 'walletId' | 'valor' | 'descricao' | 'data' | 'hora', value: string) =>
    dispatch({ type: 'SET_FIELD', field, value }), []);
  const setTipo = useCallback((tipo: 'ENTRADA' | 'SAIDA') => dispatch({ type: 'SET_TIPO', tipo }), []);
  const close = useCallback(() => dispatch({ type: 'CLOSE' }), []);

  return { ...state, openNew, openEdit, setField, setTipo, close };
}

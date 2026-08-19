import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { useAuthStore } from '../context/AuthContext';
import { useApiQuery, queryKeys } from '../lib/query';
import { saldoRestante } from '../utils/financeiro';
import type { Receivable } from '../types/api';

export interface ReceivableDerived {
  status: string;
  isPago: boolean;
  isParcial: boolean;
  isVencido: boolean;
  saldo: number;
  temParcial: boolean;
  diasAtraso: number;
}

/**
 * Deriva o estado de exibição de uma parcela (status, saldo, atraso).
 * Função pura: mesma entrada → mesma saída. Testável sem componente.
 */
export function deriveReceivable(r: Receivable, hoje: Date = new Date()): ReceivableDerived {
  const status = r.statusExibicao ?? r.status;
  const isPago = status === 'PAGO';
  const isParcial = status === 'PAGO_PARCIAL';
  const isVencido = status === 'VENCIDO';
  const saldo = saldoRestante(r);
  const temParcial = r.saldoRestante !== undefined && r.saldoRestante > 0 && r.saldoRestante < Number(r.valorParcela);
  const diasAtraso = isVencido
    ? Math.max(1, Math.floor((hoje.getTime() - new Date(r.dataVencimento).getTime()) / 86400000))
    : 0;
  return { status, isPago, isParcial, isVencido, saldo, temParcial, diasAtraso };
}

export type FiadoFilter = 'all' | 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'PAGO_PARCIAL';

export interface RenegForm {
  novaDataVencimento: string;
  novoValor: string;
  novasParcelas: string;
}

/**
 * Hook do Crediário: dados, filtros, derivações e ações de pagamento/renegociação.
 * A página fica apenas com a apresentação (tabela desktop + cards mobile + modais).
 */
export function useFiado() {
  const { activeStoreId } = useAuthStore();
  const [filter, setFilter] = useState<FiadoFilter>('all');
  const [search, setSearch] = useState('');
  const [payModal, setPayModal] = useState<Receivable | null>(null);
  const [payValue, setPayValue] = useState('');
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [renegModal, setRenegModal] = useState<Receivable | null>(null);
  const [renegForm, setRenegForm] = useState<RenegForm>({ novaDataVencimento: '', novoValor: '', novasParcelas: '1' });
  const [renegSaving, setRenegSaving] = useState(false);

  const { data: receivablesData, isLoading, refetch } = useApiQuery<Receivable[]>(
    queryKeys.receivables(activeStoreId),
    '/finance/receivables',
    { enabled: !!activeStoreId, staleTime: 0, refetchOnMount: true }
  );
  const receivables = receivablesData || [];

  const hoje = new Date();

  const totalPendente = receivables
    .filter(r => r.statusExibicao !== 'PAGO')
    .reduce((acc, r) => acc + saldoRestante(r), 0);

  const totalVencido = receivables
    .filter(r => new Date(r.dataVencimento) < hoje && r.statusExibicao !== 'PAGO')
    .reduce((acc, r) => acc + saldoRestante(r), 0);

  const totalEmDia = receivables
    .filter(r => new Date(r.dataVencimento) >= hoje && r.statusExibicao !== 'PAGO')
    .reduce((acc, r) => acc + saldoRestante(r), 0);

  const countBy = (status: string) => receivables.filter(r => r.statusExibicao === status).length;

  const filtered = useMemo(() => {
    return receivables
      .filter(r => (filter === 'all' ? true : r.statusExibicao === filter))
      .filter(r => {
        const term = search.trim().toLowerCase();
        if (!term) return true;
        return (r.customer?.nomeCompleto || '').toLowerCase().includes(term);
      })
      .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
  }, [receivables, filter, search]);

  const totalFiltrado = filtered
    .filter(r => r.statusExibicao !== 'PAGO')
    .reduce((acc, r) => acc + saldoRestante(r), 0);

  const hasFilters = search.trim() !== '' || filter !== 'all';

  const openPay = (r: Receivable) => {
    setPayModal(r);
    setPayValue(String(deriveReceivable(r, hoje).saldo));
  };

  const openReneg = (r: Receivable) => {
    setRenegModal(r);
    setRenegForm({
      novaDataVencimento: format(new Date(r.dataVencimento), 'yyyy-MM-dd'),
      novoValor: String(deriveReceivable(r, hoje).saldo),
      novasParcelas: '1',
    });
  };

  const handlePay = async () => {
    if (!payModal || !payValue) return;
    setSaving(true);
    try {
      await fetchApi(`/finance/receivables/${payModal.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          valorPago: parseFloat(payValue),
          dataPagamento: payDate,
        })
      });
      toast.success('Pagamento registrado!');
      setPayModal(null);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar pagamento');
    } finally {
      setSaving(false);
    }
  };

  const handleRenegotiate = async () => {
    if (!renegModal || !renegForm.novaDataVencimento || !renegForm.novoValor) return;
    setRenegSaving(true);
    try {
      await fetchApi(`/finance/receivables/${renegModal.id}/renegotiate`, {
        method: 'POST',
        body: JSON.stringify({
          novaDataVencimento: renegForm.novaDataVencimento,
          novoValor: parseFloat(renegForm.novoValor),
          novasParcelas: parseInt(renegForm.novasParcelas),
        }),
      });
      toast.success('Parcelas renegociadas!');
      setRenegModal(null);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao renegociar');
    } finally {
      setRenegSaving(false);
    }
  };

  return {
    receivables,
    isLoading,
    refetch,
    filter,
    setFilter,
    search,
    setSearch,
    totalPendente,
    totalVencido,
    totalEmDia,
    countBy,
    filtered,
    totalFiltrado,
    hasFilters,
    hoje,
    payModal,
    setPayModal,
    payValue,
    setPayValue,
    payDate,
    setPayDate,
    saving,
    renegModal,
    setRenegModal,
    renegForm,
    setRenegForm,
    renegSaving,
    openPay,
    openReneg,
    handlePay,
    handleRenegotiate,
  };
}

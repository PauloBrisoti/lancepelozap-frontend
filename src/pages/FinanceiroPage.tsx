import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { TrendingUp, TrendingDown, Banknote, HandCoins, CalendarClock, Receipt, PiggyBank, Scale, Activity, Box, FileMinus, Wallet as WalletIcon, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuthStore } from '../context/AuthContext';
import { useDateFilter, type DatePeriod } from '../hooks/useDateFilter';
import { useFinanceiroModals } from '../hooks/useFinanceiroModals';
import { useFinanceiroDashboard } from '../hooks/useFinanceiroDashboard';
import type { Transaction, Receivable, Payable } from '../hooks/useFinanceiroDashboard';
import type { SaleItem } from '../types/api';
import { formatDateBR, formatDateTimeBR } from '../lib/dates';
import { formatBRL } from '../utils/format';
import { saldoRestante } from '../utils/financeiro';
import { PAYMENT_METHOD_COLORS } from '../utils/domainMaps';
import { Modal } from '../components/Modal';
import { LancamentoModal, type LancamentoForm, type PayableForm } from '../components/LancamentoModal';
import { BaixaModal } from '../components/BaixaModal';
import { BaixaPagarModal } from '../components/BaixaPagarModal';
import { CobrancaModal } from '../components/CobrancaModal';

export const FinanceiroPage: React.FC = () => {
  const { activeStoreId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'TRANSACOES' | 'RECEBER' | 'PAGAR' | 'DRE'>('TRANSACOES');

  // Date filter state
  const [dateFilter, setDateFilter] = useState<DatePeriod>('este_mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [diaInicioMes, setDiaInicioMes] = useState(1);
  const { query: queryParams, start: periodStart, end: periodEnd } = useDateFilter(dateFilter, customStart || undefined, customEnd || undefined, diaInicioMes);

  useEffect(() => {
    fetchApi(`/store/my/${activeStoreId}/fiscal-config`).then((res: any) => {
      if (res?.diaInicioMes) setDiaInicioMes(res.diaInicioMes);
    }).catch(() => {});
  }, [activeStoreId]);

  // Dados do Dashboard e abas (useFinanceiroDashboard)
  const dashboard = useFinanceiroDashboard({ activeStoreId, activeTab, queryParams });
  const {
    loading, wallets, saldoTotal, devedoresAtrasados, totalAtrasado, despesasMes,
    comissaoPagasMes, pjData, transactions, receivables, payables, dreData,
    dashboardCards,
  } = dashboard;
  const { carregarDados } = dashboard;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modais (useReducer) — os formulários vivem dentro de cada modal
  const modais = useFinanceiroModals<Receivable, Payable>();

  const handleSalvarTx = async (formTx: LancamentoForm) => {
    try {
      const formData = new FormData();
      Object.keys(formTx).forEach(key => {
        if (key === 'comprovante') {
          if (formTx.comprovante) {
            formData.append('comprovante', formTx.comprovante);
          }
        } else {
          formData.append(key, String((formTx as any)[key]));
        }
      });

      if (formTx.id) {
        // PUT only supports basic edit for now (not multipart if not needed, but we send it anyway)
        await fetchApi(`/finance/transactions/${formTx.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...formTx,
            valor: Number(formTx.valor)
          })
        });
      } else {
        await fetchApi('/finance/transactions', {
          method: 'POST',
          body: formData
        });
      }
      modais.closeLancamento();
      carregarDados();
      toast.success('Lançamento salvo com sucesso!');
    } catch (error) {
      toast.error((error as Error).message || 'Erro ao salvar lançamento');
    }
  };

  const handleHardReset = async () => {
    const confirmar = window.confirm("CUIDADO: Tem certeza que deseja apagar TODOS os dados financeiros desta loja? O catálogo de produtos será mantido.");
    if (!confirmar) return;
    try {
      await fetchApi('/import/smart/hard-reset', {
        method: 'POST',
        body: JSON.stringify({ confirmacao: 'RESETAR' }),
      });
      alert("Dados apagados com sucesso! O ambiente está limpo.");
      window.location.reload();
    } catch (error) {
      console.error("Erro ao realizar Hard Reset:", error);
      alert("Ocorreu um erro ao tentar limpar os dados.");
    }
  };

  const abrirModalEditarTx = (tx: Transaction) => {
    // Local datetime format: YYYY-MM-DDThh:mm
    const dateObj = new Date(tx.dataTransacao);
    const tzoffset = dateObj.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(dateObj.getTime() - tzoffset)).toISOString().slice(0, 16);

    modais.openLancamentoTx({
      id: tx.id,
      tipo: tx.tipo,
      valor: tx.valor.toString(),
      descricao: tx.descricao,
      walletId: wallets.find(w => w.nome === tx.wallet.nome)?.id || '',
      categoria: tx.categoria || '',
      dataTransacao: localISOTime,
      customerId: tx.customerId || '',
      fornecedor: tx.fornecedor || '',
      isParcelado: false,
      numeroParcelas: 2,
      frequencia: 'MENSAL',
      isFirstPaid: true,
      comprovante: null
    });
  };

  const abrirModalNovoLancamento = (tipo?: 'RECEITA' | 'DESPESA_VISTA' | 'CONTA_PAGAR') => {
    modais.openLancamentoTipo(tipo || 'RECEITA');
  };

  const handleBaixa = async (valorPago: string, walletId: string) => {
    try {
      if (!modais.baixa.rec) return;
      if (!walletId) {
        toast.error('Selecione uma carteira para receber o pagamento.');
        return;
      }
      await fetchApi(`/finance/receivables/${modais.baixa.rec.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ walletId, valorPago: Number(valorPago) })
      });
      toast.success('Baixa realizada com sucesso!');
      modais.closeBaixa();
      carregarDados();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao realizar baixa');
    }
  };

  const handleBaixaPagar = async (walletId: string) => {
    try {
      if (!modais.baixaPagar.payable) return;
      await fetchApi(`/finance/payables/${modais.baixaPagar.payable.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ walletId })
      });
      toast.success('Conta paga com sucesso!');
      modais.closeBaixaPagar();
      carregarDados();
    } catch (error) {
      toast.error('Erro ao pagar conta');
    }
  };

  const handleSalvarPayable = async (formPayable: PayableForm) => {
    try {
      if (formPayable.id) {
        await fetchApi(`/finance/payables/${formPayable.id}`, {
          method: 'PUT',
          body: JSON.stringify(formPayable)
        });
        toast.success('Conta a pagar atualizada!');
      } else {
        await fetchApi('/finance/payables', {
          method: 'POST',
          body: JSON.stringify(formPayable)
        });
        toast.success('Conta a pagar registrada!');
      }
      modais.closeLancamento();
      carregarDados();
    } catch (error) {
      toast.error('Erro ao salvar conta a pagar');
    }
  };

  // Mudança de aba descarta a seleção anterior (IDs de outra entidade não valem na nova aba)
  const changeTab = (tab: 'TRANSACOES' | 'RECEBER' | 'PAGAR' | 'DRE') => {
    setActiveTab(tab);
    setSelectedIds([]);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (ids: string[]) => {
    if (selectedIds.length === ids.length && ids.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ids);
    }
  };

  const handleBulkAction = async (action: 'DELETE' | 'MARK_PAID') => {
    if (selectedIds.length === 0) return;
    
    let entityType = 'TRANSACTION';
    if (activeTab === 'RECEBER') entityType = 'RECEIVABLE';
    if (activeTab === 'PAGAR') entityType = 'PAYABLE';

    // If MARK_PAID, we need to ask for the wallet. Let's simplify for now by using the first wallet or a default logic,
    // OR we can just open a generic modal if action === 'MARK_PAID'.
    // Let's implement a prompt or just use the first wallet for now, as it's a bulk action.
    let walletId = wallets[0]?.id;
    if (action === 'MARK_PAID' && wallets.length > 1) {
      const resp = window.prompt(`Digite o número correspondente à carteira para recebimento/pagamento:\n` + wallets.map((w, i) => `${i + 1} - ${w.nome}`).join('\n'));
      if (!resp) return;
      const idx = parseInt(resp) - 1;
      if (wallets[idx]) walletId = wallets[idx].id;
    }

    try {
      if (!window.confirm(`Tem certeza que deseja ${action === 'DELETE' ? 'excluir' : 'marcar como pago'} os ${selectedIds.length} itens selecionados?`)) return;
      
      await fetchApi('/finance/bulk', {
        method: 'POST',
        body: JSON.stringify({
          entityType,
          action,
          ids: selectedIds,
          walletId: action === 'MARK_PAID' ? walletId : undefined
        })
      });
      toast.success('Ação em massa executada com sucesso!');
      setSelectedIds([]);
      carregarDados();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao executar ação em massa');
    }
  };

  const handleCobrancaWhatsapp = async (devedor: Receivable) => {
    if (!devedor.telefone) {
      toast.error('Cliente não possui telefone cadastrado!');
      return;
    }
    const num = devedor.telefone.replace(/\D/g, '');
    const nome = devedor.nome;
    const valor = Number(devedor.valor).toFixed(2);
    try {
      await fetchApi('/whatsapp/send-reminder', {
        method: 'POST',
        body: JSON.stringify({
          phone: num,
          customerName: nome,
          value: valor,
          daysOverdue: devedor.diasAtraso || 0,
        }),
      });
      toast.success('Lembrete enviado via WhatsApp!');
    } catch {
      const msg = encodeURIComponent(`Olá ${nome}, notamos um débito em aberto no valor de R$ ${valor}. Pode verificar?`);
      window.open(`https://wa.me/55${num}?text=${msg}`, '_blank');
    }
  };

  if (loading && wallets.length === 0) {
    return (
      <div className="p-3 md:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-4 w-64 bg-gray-100 rounded-md animate-pulse" />
          </div>
          <div className="hidden md:flex gap-2">
            <div className="h-10 w-40 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="h-5 w-40 bg-gray-200 rounded-md animate-pulse mb-5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-20 bg-gray-100 rounded-xl animate-pulse mt-4" />
        </div>
        <div className="h-72 bg-white rounded-2xl shadow-sm border border-gray-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-8 space-y-4 md:space-y-8">
      <div className="flex justify-between items-start md:items-center mb-4 md:mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">Acompanhe e detalhe todas as transações, receitas e despesas.</p>
        </div>
        <div className="flex gap-1.5 md:gap-2 shrink-0 ml-2">
          <button 
            onClick={() => modais.openImport()}
            className="hidden md:flex bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-colors items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Importar Planilha
          </button>
          <button 
            onClick={() => abrirModalNovoLancamento(activeTab === 'PAGAR' ? 'CONTA_PAGAR' : undefined)}
            className="hidden md:flex bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-colors items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            + Novo
          </button>
        </div>
      </div>

      {/* PERÍODO */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 w-fit">
        <button onClick={() => setDateFilter('today')} className={`px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors ${dateFilter === 'today' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Hoje</button>
        <button onClick={() => setDateFilter('7d')} className={`px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors ${dateFilter === '7d' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>7 Dias</button>
        <button onClick={() => setDateFilter('este_mes')} className={`px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors ${dateFilter === 'este_mes' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Este Mês</button>
        <button onClick={() => setDateFilter('mes_passado')} className={`px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors ${dateFilter === 'mes_passado' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Mês Passado</button>

        <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2 ml-1">
          <input type="date" className="w-24 sm:w-28 md:w-auto text-xs md:text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-brand-500" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setDateFilter('personalizado'); }} />
          <span className="text-gray-400 text-xs shrink-0">–</span>
          <input type="date" className="w-24 sm:w-28 md:w-auto text-xs md:text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-brand-500" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setDateFilter('personalizado'); }} />
        </div>
      </div>

      {/* ALERTA DE INADIMPLÊNCIA */}
      {totalAtrasado > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900">Inadimplência detectada</h3>
              <p className="text-xs md:text-sm text-rose-700 mt-0.5">
                <strong>{formatBRL(Number(totalAtrasado))}</strong> em contas atrasadas — a cobrança rápida ajuda a recuperar esse valor.
              </p>
            </div>
          </div>
          <button 
            onClick={() => modais.openCobranca()}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors whitespace-nowrap"
          >
            Cobrar Devedores
          </button>
        </div>
      )}

      {/* ───────── SEÇÃO 1: TESOURARIA ───────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="px-4 md:px-6 pt-4 md:pt-5 pb-3 md:pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <WalletIcon className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-gray-900">Tesouraria</h2>
              <p className="text-[11px] md:text-xs text-gray-400">Liquidez e posição de caixa</p>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-6 pb-4 md:pb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {(!dashboardCards || dashboardCards.includes('caixa_disponivel')) && (
            <div className="relative rounded-xl border border-brand-200 bg-brand-50/60 p-4 md:p-5 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-brand-100/60 rounded-full" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2.5">
                  <PiggyBank className="w-4 h-4 text-brand-600" />
                  <p className="text-[11px] font-bold text-brand-700 uppercase tracking-wider">Caixa Disponível</p>
                </div>
                <p className="text-xl md:text-2xl font-extrabold text-brand-800 tracking-tight tabular-nums">
                  {formatBRL(pjData?.saldoAtual ?? saldoTotal)}
                </p>
                <p className="text-[11px] text-brand-600/80 mt-1.5 leading-snug">Saldo total em todas as carteiras</p>
              </div>
            </div>
          )}
          {(!dashboardCards || dashboardCards.includes('dinheiro_recebido')) && (
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2.5">
                <HandCoins className="w-4 h-4 text-emerald-600" />
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dinheiro Recebido</p>
              </div>
              <p className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight tabular-nums">
                {formatBRL(pjData?.dinheiroCaixaRealizado ?? 0)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
                Entradas realizadas (caixa)
                {pjData && pjData.dinheiroRecebidoVendasPeriodo !== undefined && (
                  <span className="block mt-0.5">
                    <strong className="text-emerald-600">{formatBRL(pjData.dinheiroRecebidoVendasPeriodo)}</strong> de vendas deste período
                    {pjData.dinheiroRecebidoOutros! > 0 && ` · ${formatBRL(pjData.dinheiroRecebidoOutros!)} de anteriores`}
                  </span>
                )}
              </p>
            </div>
          )}
          {(!dashboardCards || dashboardCards.includes('fiado_a_receber')) && (
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2.5">
                <CalendarClock className="w-4 h-4 text-gray-400" />
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Fiado a Receber</p>
              </div>
              <p className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight tabular-nums">
                {formatBRL(pjData?.aReceberFiado ?? 0)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
                Total pendente de vendas fiado
                {pjData && pjData.contasAReceberPeriodo !== undefined && (
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    <strong>{formatBRL(pjData.contasAReceberPeriodo)}</strong> vencem neste mês
                    {pjData.contasAReceberFuturo! > 0 && ` · ${formatBRL(pjData.contasAReceberFuturo!)} futuro`}
                  </span>
                )}
                {(pjData?.inadimplenciaTotal ?? 0) > 0 && (
                  <span className="block text-[10px] text-rose-500 font-bold mt-0.5">
                    {formatBRL(pjData!.inadimplenciaTotal!)} vencido
                    {pjData!.inadimplenciaPercentual! > 0 && ` (${pjData!.inadimplenciaPercentual!.toFixed(1)}%)`}
                  </span>
                )}
              </p>
            </div>
          )}
          {(!dashboardCards || dashboardCards.includes('contas_a_pagar')) && (
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2.5">
                <Receipt className="w-4 h-4 text-gray-400" />
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contas a Pagar</p>
              </div>
              <p className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight tabular-nums">
                {formatBRL(pjData?.parcelasFornecedoresMes ?? 0)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">Boletos e contas pendentes</p>
            </div>
          )}
        </div>

        {/* POSIÇÃO PATRIMONIAL (Saldo Projetado) */}
        {(!dashboardCards || dashboardCards.includes('saldo_projetado')) && pjData && (
          <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-4 md:px-6 py-4 md:py-5 border-t border-slate-700/50">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Scale className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Posição Patrimonial</h3>
                  <p className="text-[11px] text-slate-400">Saldo Projetado · Caixa + A Receber − A Pagar</p>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <ArrowDownRight className="w-4 h-4 text-emerald-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">+ A Receber</p>
                    <p className="text-sm font-extrabold text-emerald-300 truncate tabular-nums">+ {formatBRL(pjData.crediarioAVencerMes ?? 0)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <ArrowUpRight className="w-4 h-4 text-rose-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">− A Pagar</p>
                    <p className="text-sm font-extrabold text-rose-300 truncate tabular-nums">{formatBRL(-(pjData.parcelasFornecedoresMes ?? 0))}</p>
                  </div>
                </div>
                <div className="sm:col-span-2 relative bg-gradient-to-br from-indigo-500 to-indigo-700 p-3 rounded-xl shadow-md overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full" />
                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                      <Scale className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">= Saldo Projetado</p>
                      <p className="text-lg md:text-xl font-extrabold text-white truncate tabular-nums">{formatBRL(pjData.saldoProjetado ?? 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ───────── SEÇÃO 2: DESEMPENHO ───────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="px-4 md:px-6 pt-4 md:pt-5 pb-3 md:pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-gray-900">Desempenho da Operação</h2>
              <p className="text-[11px] md:text-xs text-gray-400">Resultado por competência</p>
            </div>
          </div>
        </div>
        <div className="px-4 md:px-6 pb-4 md:pb-6 space-y-3 md:space-y-4">
          {/* Linha principal: receita e resultado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {(!dashboardCards || dashboardCards.includes('faturamento_bruto')) && (
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2.5">
                <Banknote className="w-4 h-4 text-gray-400" />
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Faturamento Bruto</p>
              </div>
              <p className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight tabular-nums">
                {formatBRL(pjData?.faturamentoBruto ?? 0)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
                Total de vendas do período (competência)
                {dateFilter !== 'today' && periodStart && periodEnd && <span className="block text-[10px] text-gray-400 mt-0.5">{formatDateBR(periodStart)} a {formatDateBR(periodEnd)}</span>}
              </p>
            </div>
          )}

          {(!dashboardCards || dashboardCards.includes('lucro_operacao')) && (
            <div className={`p-4 md:p-5 rounded-xl border ${(pjData?.lucroLiquidoReal ?? 0) >= 0 ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}>
              <div className="flex items-center gap-2 mb-2.5">
                {pjData && pjData.lucroLiquidoReal !== undefined && pjData.lucroLiquidoReal < 0
                  ? <TrendingDown className="w-4 h-4 text-rose-600" />
                  : <TrendingUp className="w-4 h-4 text-emerald-600" />}
                <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Lucro da Operação</h3>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className={`text-xl md:text-2xl font-extrabold tracking-tight tabular-nums ${(pjData?.lucroLiquidoReal ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatBRL(pjData?.lucroLiquidoReal ?? 0)}
                </p>
                {pjData && pjData.lucroCrescimento !== undefined && (
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                    pjData.lucroCrescimento > 0 ? 'bg-emerald-100 text-emerald-700' :
                    pjData.lucroCrescimento === 0 ? 'bg-slate-100 text-slate-500' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    {pjData.lucroCrescimento > 0 ? <TrendingUp className="w-3 h-3" /> : pjData.lucroCrescimento < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                    {pjData?.lucroCrescimento == null || pjData.lucroCrescimento === 0 ? 'Neutro vs ant.' : ` ${pjData.lucroCrescimento > 0 ? '+' : ''}${(pjData.lucroCrescimento ?? 0).toFixed(1)}%`}
                  
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 leading-snug">
                Faturamento Líquido − CMV − Despesas Operacionais
              </p>
            </div>
          )}
          </div>

          {/* Linha secundária: composição do resultado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {(!dashboardCards || dashboardCards.includes('comissoes_pagas')) && (
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2.5">
                <HandCoins className="w-4 h-4 text-gray-400" />
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Comissões Pagas</p>
              </div>
              <p className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight tabular-nums">
                {formatBRL(comissaoPagasMes)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
                Total pago em comissões no período
                <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">Já incluída em Despesas Operacionais — desconta do Lucro</span>
                {dateFilter !== 'today' && periodStart && periodEnd && <span className="block text-[10px] text-gray-400 mt-0.5">{formatDateBR(periodStart)} a {formatDateBR(periodEnd)}</span>}
              </p>
            </div>
          )}

          {(!dashboardCards || dashboardCards.includes('estoque_atual')) && (
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2.5">
                <Box className="w-4 h-4 text-gray-400" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Estoque Atual</h3>
              </div>
              <p className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight tabular-nums">
                {formatBRL(pjData?.dinheiroImobilizado ?? 0)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">Custo dos Produtos em Estoque</p>
            </div>
          )}

          {(!dashboardCards || dashboardCards.includes('despesas_operacionais')) && (
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2.5">
                <FileMinus className="w-4 h-4 text-gray-400" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Despesas Operacionais</h3>
              </div>
              <p className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight tabular-nums">
                {formatBRL(pjData?.despesasOperacionais ?? despesasMes)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">Custos Operacionais do Mês (exceto fornecedores/estoque) · inclui comissões</p>
              {(pjData?.despesasOperacionais === 0 || (pjData === null && despesasMes === 0)) && (
                <p className="text-[10px] text-amber-600 font-semibold mt-1.5">
                  ⓘ Nenhuma despesa registrada. Use o módulo A Pagar ou o lançamento de Despesa para registrar.
                </p>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* ───────── SEÇÃO 3: DISTRIBUIÇÃO ───────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      {/* CARTEIRAS */}
      {(!dashboardCards || dashboardCards.includes('saldos_carteira')) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 order-2 xl:order-1">
          <div className="px-4 md:px-6 pt-4 md:pt-5 pb-3 md:pb-4 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <WalletIcon className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-gray-900">Saldos por Carteira</h2>
              <p className="text-[11px] md:text-xs text-gray-400">Onde o dinheiro está alocado</p>
            </div>
          </div>
          <div className="px-4 md:px-6 pb-4 md:pb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wallets.map(w => (
              <div key={w.id} className="bg-gray-50/70 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${w.tipo === 'EMPRESA' ? 'bg-brand-50 text-brand-600' : 'bg-white text-gray-400 border border-gray-200'}`}>
                  <WalletIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{w.nome}</p>
                  <p className="text-lg font-extrabold text-gray-900 tracking-tight tabular-nums">{formatBRL(Number(w.saldoAtual))}</p>
                </div>
                <span className="text-[9px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full uppercase font-bold shrink-0">{w.tipo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MIX DE PAGAMENTO */}
      {(!dashboardCards || dashboardCards.includes('mix_pagamento')) && pjData?.paymentMethodsBreakdown && pjData.paymentMethodsBreakdown.some(p => p.value > 0) && (() => {
        const items = pjData.paymentMethodsBreakdown.filter(p => p.value > 0);
        const mixTotal = items.reduce((acc, pm) => acc + pm.value, 0) || 1;
        return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 order-1 xl:order-2">
          <div className="px-4 md:px-6 pt-4 md:pt-5 pb-3 md:pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold text-gray-900">Mix de Pagamento</h2>
                <p className="text-[11px] md:text-xs text-gray-400">Vendas por forma de pagamento</p>
              </div>
            </div>
          </div>
          <div className="px-4 md:px-6 pb-4 md:pb-6">
          <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-5">
            {items.map(pm => (
              <div key={pm.method} className="h-full transition-all duration-300" style={{ width: `${(pm.value / mixTotal) * 100}%`, backgroundColor: PAYMENT_METHOD_COLORS[pm.method] || '#64748b' }} title={`${pm.label}: ${Math.round((pm.value / mixTotal) * 100)}%`} />
            ))}
          </div>
          <div className="space-y-3">
            {items.map(pm => {
              const pct = Math.round((pm.value / mixTotal) * 100);
              const color = PAYMENT_METHOD_COLORS[pm.method] || '#64748b';
              return (
                <div key={pm.method} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm text-gray-600 flex-1">{pm.label}</span>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{formatBRL(pm.value)}</span>
                  <span className="text-xs font-extrabold w-11 text-right tabular-nums" style={{ color }}>{pct}%</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-4 text-center border-t border-gray-50 pt-3">
            *Crediário considera o valor total da venda, não apenas o sinal recebido
          </p>
          </div>
        </div>
        );
      })()}
      </div>

      {/* ABAS */}
      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
        <div className="px-3 md:px-4 pt-3 md:pt-4">
          <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto">
            <button 
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-xs md:text-sm whitespace-nowrap transition-colors ${activeTab === 'TRANSACOES' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => changeTab('TRANSACOES')}
            >
              Extrato
            </button>
            <button 
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-xs md:text-sm whitespace-nowrap transition-colors ${activeTab === 'RECEBER' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => changeTab('RECEBER')}
            >
              A Receber
            </button>
            <button 
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-xs md:text-sm whitespace-nowrap transition-colors ${activeTab === 'PAGAR' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => changeTab('PAGAR')}
            >
              A Pagar
            </button>
            <button 
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-xs md:text-sm whitespace-nowrap transition-colors ${activeTab === 'DRE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => changeTab('DRE')}
            >
              DRE
            </button>
          </div>
        </div>

        <div className="overflow-x-auto mt-3 md:mt-4">
          {activeTab === 'TRANSACOES' && (
            <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-[11px] uppercase tracking-wider">
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                      checked={transactions.length > 0 && selectedIds.length === transactions.length}
                      onChange={() => handleSelectAll(transactions.map(t => t.id))}
                    />
                  </th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 whitespace-nowrap">Data</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 whitespace-nowrap">Tipo</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200">Descrição</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 hidden md:table-cell">Categoria</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 hidden md:table-cell">Carteira</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 text-right whitespace-nowrap">Valor</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 text-center w-14 md:w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors">
                    <td className="px-3 md:px-4 py-2.5 md:py-3 text-center">
                      <input 
                        type="checkbox" 
                        className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                        checked={selectedIds.includes(tx.id)}
                        onChange={() => handleToggleSelect(tx.id)}
                      />
                    </td>
                    <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-600 whitespace-nowrap tabular-nums">
                      {formatDateTimeBR(tx.dataTransacao)}
                    </td>
                    <td className="px-3 md:px-4 py-2.5 md:py-3">
                      {tx.tipo === 'ENTRADA' ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold">Entrada</span>
                      ) : (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold">Saída</span>
                      )}
                    </td>
                    <td className="px-3 md:px-4 py-2.5 md:py-3 max-w-[120px] md:max-w-none">
                      <div className="font-medium text-gray-800 text-xs md:text-sm truncate">{tx.descricao}</div>
                      {tx.sale?.saleItems && tx.sale.saleItems.length > 0 && (
                        <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1 max-w-[100px] md:max-w-xs truncate">
                          {tx.sale.saleItems.map((item: SaleItem) => `${Number(item.quantidade)}x ${item.product?.nome || 'Produto'}`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-500 hidden md:table-cell">{tx.categoria || '-'}</td>
                    <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-500 hidden md:table-cell">{tx.wallet.nome}</td>
                    <td className={`px-3 md:px-4 py-2.5 md:py-3 text-right font-bold text-xs md:text-sm ${tx.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'} whitespace-nowrap tabular-nums`}>
                      {tx.tipo === 'ENTRADA' ? '+' : '-'} {formatBRL(Number(tx.valor))}
                    </td>
                    <td className="px-3 md:px-4 py-2.5 md:py-3 text-center">
                      <button onClick={() => abrirModalEditarTx(tx)} className="text-gray-400 hover:text-brand-600 transition-colors p-1.5 rounded-lg hover:bg-brand-50" title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">Nenhuma transação encontrada no período.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'RECEBER' && (
            <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-[11px] uppercase tracking-wider">
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                      checked={receivables.length > 0 && selectedIds.length === receivables.length}
                      onChange={() => handleSelectAll(receivables.map(r => r.id))}
                    />
                  </th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 whitespace-nowrap">Cliente</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 whitespace-nowrap">Vencimento</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 hidden md:table-cell">Parcela</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 text-right whitespace-nowrap">Valor Original</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 text-right whitespace-nowrap">Saldo</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 text-center whitespace-nowrap">Status</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map(rec => {
                  const status = rec.statusExibicao;
                  const isPago = status === 'PAGO';
                  const isParcial = status === 'PAGO_PARCIAL';
                  const isVencido = status === 'VENCIDO';
                  const totalPago = rec.valorJaPago ?? 0;
                  const saldo = saldoRestante(rec);
                  return (
                    <tr key={rec.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors">
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-center">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                          checked={selectedIds.includes(rec.id)}
                          onChange={() => handleToggleSelect(rec.id)}
                        />
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 font-medium text-gray-800 text-xs md:text-sm truncate max-w-[100px] md:max-w-none">{rec.customer?.nomeCompleto || '-'}</td>
                      <td className={`px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm whitespace-nowrap tabular-nums ${isVencido ? 'text-rose-600 font-bold' : 'text-gray-600'}`}>
                        {formatDateBR(rec.dataVencimento)}
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-500 hidden md:table-cell tabular-nums">{rec.numeroParcela} / {rec.totalParcelas}</td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-right text-gray-600 text-xs md:text-sm whitespace-nowrap tabular-nums">{formatBRL(Number(rec.valorParcela))}</td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-right font-bold text-xs md:text-sm whitespace-nowrap tabular-nums">
                        {isPago ? (
                          <span className="text-emerald-600">{formatBRL(0)}</span>
                        ) : (
                          <span className={isParcial ? 'text-amber-600' : 'text-gray-800'}>
                            {formatBRL(saldo)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-center">
                        <span className={`inline-block text-[10px] md:text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${isPago ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isParcial ? 'bg-blue-50 text-blue-700 border border-blue-200' : isVencido ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {isPago ? 'Quitado' : isParcial ? 'Parcial' : isVencido ? 'Vencido' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-center">
                        {!isPago && (
                          <button 
                            onClick={() => { modais.openBaixa(rec); }}
                            className="text-[10px] md:text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg shadow-sm transition-colors whitespace-nowrap"
                          >
                            {totalPago > 0 ? 'Completar' : 'Receber'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {receivables.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">Nenhum fiado a receber.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'PAGAR' && (
            <table className="w-full text-left border-collapse min-w-[500px] md:min-w-0">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-[11px] uppercase tracking-wider">
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                      checked={payables.length > 0 && selectedIds.length === payables.length}
                      onChange={() => handleSelectAll(payables.map(p => p.id))}
                    />
                  </th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200">Descrição</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 hidden md:table-cell">Fornecedor</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 whitespace-nowrap">Vencimento</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 text-right whitespace-nowrap">Valor</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 text-center whitespace-nowrap">Status</th>
                  <th className="px-3 md:px-4 py-3 border-b border-gray-200 text-center whitespace-nowrap">Ação</th>
                </tr>
              </thead>
              <tbody>
                {payables.map(pay => {
                  const vencido = new Date(pay.dataVencimento) < new Date() && pay.status === 'PENDENTE';
                  return (
                    <tr key={pay.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors">
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-center">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                          checked={selectedIds.includes(pay.id)}
                          onChange={() => handleToggleSelect(pay.id)}
                        />
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 font-medium text-gray-800 text-xs md:text-sm truncate max-w-[100px] md:max-w-none">{pay.descricao}</td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-500 hidden md:table-cell">{pay.fornecedor || '-'}</td>
                      <td className={`px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm whitespace-nowrap tabular-nums ${vencido ? 'text-rose-600 font-bold' : 'text-gray-600'}`}>
                        {formatDateBR(pay.dataVencimento)}
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-right font-bold text-xs md:text-sm whitespace-nowrap tabular-nums">{formatBRL(Number(pay.valor))}</td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-center">
                        <span className={`inline-block text-[10px] md:text-xs px-2 py-0.5 rounded-full font-semibold ${pay.status === 'PAGO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {pay.status === 'PAGO' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 text-center">
                        <button
                          onClick={() => {
                            modais.openLancamentoPayable({
                              id: pay.id,
                              descricao: pay.descricao,
                              categoria: pay.categoria || '',
                              fornecedor: pay.fornecedor || '',
                              dataVencimento: pay.dataVencimento.split('T')[0],
                              valor: String(Number(pay.valor)),
                              isParcelado: false,
                              numeroParcelas: 2,
                              frequencia: 'MENSAL',
                              isFirstPaid: false,
                            });
                          }}
                          className="text-sm text-gray-400 hover:text-brand-600 px-2 py-1 font-medium transition-colors"
                        >
                          Editar
                        </button>
                        {pay.status === 'PENDENTE' && (
                          <button 
                            onClick={() => modais.openBaixaPagar(pay)}
                            className="text-xs md:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg shadow-sm transition-colors"
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {payables.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">Nenhuma conta a pagar.</td></tr>
                )}
              </tbody>
            </table>
          )}
        {activeTab === 'DRE' && dreData && (
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <div>
                  <h3 className="text-sm md:text-lg font-bold text-gray-900">Demonstração do Resultado do Exercício</h3>
                  <p className="text-[11px] md:text-xs text-gray-400 mt-0.5">Resultado do período selecionado no filtro</p>
                </div>
                <span className="text-[10px] md:text-sm text-gray-500 bg-gray-100 px-2 md:px-3 py-0.5 md:py-1 rounded-full whitespace-nowrap">Método de Competência</span>
              </div>
              
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* 1. Receita Operacional Bruta */}
                <div className="flex justify-between px-4 py-3.5 bg-gray-50/80 border-b border-gray-200">
                  <span className="font-bold text-gray-800 text-sm">1. RECEITA OPERACIONAL BRUTA</span>
                  <span className="font-bold text-gray-800 text-sm tabular-nums">{formatBRL(dreData.receitaBruta)}</span>
                </div>
                
                {/* 2. Deduções */}
                <div className="flex justify-between px-4 py-3 border-b border-gray-200 text-rose-600">
                  <span className="font-semibold ml-4 text-sm">2. (-) DEDUÇÕES DA RECEITA BRUTA</span>
                  <span className="font-semibold text-sm tabular-nums">{formatBRL(-dreData.deducoes.total)}</span>
                </div>
                <div className="flex justify-between px-8 py-2 text-sm text-gray-600">
                  <span>Descontos Concedidos</span>
                  <span className="tabular-nums">{formatBRL(-dreData.deducoes.descontos)}</span>
                </div>
                <div className="flex justify-between px-8 py-2 text-sm text-gray-600 border-b border-gray-100">
                  <span>Taxas de Cartão/Gateway</span>
                  <span className="tabular-nums">{formatBRL(-dreData.deducoes.taxasGateway)}</span>
                </div>

                {/* 3. Receita Operacional Líquida */}
                <div className="flex justify-between px-4 py-3.5 bg-gray-50/80 border-b border-gray-200">
                  <span className="font-bold text-gray-800 text-sm">3. (=) RECEITA OPERACIONAL LÍQUIDA</span>
                  <span className="font-bold text-gray-800 text-sm tabular-nums">{formatBRL(dreData.receitaLiquida)}</span>
                </div>

                {/* 4. Custos (CMV) */}
                <div className="flex justify-between px-4 py-3 border-b border-gray-200 text-rose-600">
                  <span className="font-semibold ml-4 text-sm">4. (-) CUSTOS DAS MERCADORIAS VENDIDAS (CMV)</span>
                  <span className="font-semibold text-sm tabular-nums">{formatBRL(-dreData.custos.cmv)}</span>
                </div>

                {/* 5. Lucro Bruto */}
                <div className="flex justify-between px-4 py-3.5 bg-gray-50/80 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-sm">5. (=) RESULTADO OPERACIONAL BRUTO</span>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full tabular-nums">Margem: {(dreData?.margemLucroBruto ?? 0).toFixed(1)}%</span>
                  </div>
                  <span className="font-bold text-gray-800 text-sm tabular-nums">{formatBRL(dreData.lucroBruto)}</span>
                </div>

                {/* 6. Despesas Operacionais */}
                <div className="flex justify-between px-4 py-3 border-b border-gray-200 text-orange-600">
                  <span className="font-semibold ml-4 text-sm">6. (-) DESPESAS OPERACIONAIS</span>
                  <span className="font-semibold text-sm tabular-nums">{formatBRL(-dreData.despesas.total)}</span>
                </div>
                {dreData.despesas.detalhamento.map((desp, idx) => (
                  <div key={idx} className="flex justify-between px-8 py-2 text-sm text-gray-600 border-b border-gray-50 last:border-b-gray-200">
                    <span>{desp.categoria}</span>
                    <span className="tabular-nums">{formatBRL(-desp.valor)}</span>
                  </div>
                ))}
                {dreData.despesas.detalhamento.length === 0 && (
                  <div className="px-8 py-2 text-sm text-gray-400 italic border-b border-gray-200">Nenhuma despesa registrada no período.</div>
                )}

                {/* 7. Lucro Líquido */}
                <div className={`flex justify-between px-4 py-4 ${dreData.lucroLiquido >= 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm md:text-base">7. (=) RESULTADO LÍQUIDO DO EXERCÍCIO</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold tabular-nums ${dreData.lucroLiquido >= 0 ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                      Margem Líquida: {(dreData?.margemLucroLiquido ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  <span className="font-bold text-sm md:text-base tabular-nums">{formatBRL(dreData.lucroLiquido)}</span>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAIS: Lançamento, Baixa, Pagar Conta, Cobrança WhatsApp */}
      <LancamentoModal
        open={modais.lancamento.isOpen}
        onClose={() => modais.closeLancamento()}
        tipoInicial={modais.lancamento.tipoInicial}
        initialTx={modais.lancamento.initialTx}
        initialPayable={modais.lancamento.initialPayable}
        onSubmitTx={handleSalvarTx}
        onSubmitPayable={handleSalvarPayable}
      />

      <BaixaModal
        open={modais.baixa.isOpen}
        onClose={() => modais.closeBaixa()}
        rec={modais.baixa.rec ?? null}
        onSubmit={handleBaixa}
      />

      <BaixaPagarModal
        open={modais.baixaPagar.isOpen}
        onClose={() => modais.closeBaixaPagar()}
        payable={modais.baixaPagar.payable ?? null}
        onSubmit={handleBaixaPagar}
      />

      <CobrancaModal
        open={modais.cobranca}
        onClose={() => modais.closeCobranca()}
        devedores={devedoresAtrasados}
        onCobrar={handleCobrancaWhatsapp}
      />
      {/* MODAL IMPORTAÇÃO */}
      {modais.import && (
        <Modal open={modais.import} onClose={() => modais.closeImport()} size="sm" title="Importar Planilha">
            <p className="text-gray-600 mb-4 text-sm">
              Faça o upload do seu arquivo CSV ou Excel. O sistema processará automaticamente os lançamentos com base no nosso modelo inteligente.
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <p className="text-gray-600 font-medium">Clique para selecionar</p>
              <p className="text-xs text-gray-400 mt-1">.csv, .xlsx (Máx 5MB)</p>
              <input type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
            </div>
            <div className="pt-6 flex gap-3">
              <button onClick={() => modais.closeImport()} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-md" onClick={() => { modais.closeImport(); toast.success('Upload iniciado! (Simulado)'); }}>Iniciar Importação</button>
            </div>
        </Modal>
      )}

      {/* FLOATING ACTION BAR FOR BULK ACTIONS */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-40 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <span className="bg-brand-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{selectedIds.length}</span>
            <span className="font-medium text-sm">selecionados</span>
          </div>
          
          <div className="w-px h-6 bg-gray-700"></div>
          
          <div className="flex items-center gap-3">
            {activeTab !== 'TRANSACOES' && (
              <button 
                onClick={() => handleBulkAction('MARK_PAID')}
                className="text-sm font-medium hover:text-emerald-400 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Marcar como Pago
              </button>
            )}
            <button 
              onClick={() => handleBulkAction('DELETE')}
              className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Excluir
            </button>
          </div>
          
          <button onClick={() => setSelectedIds([])} className="ml-2 text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      {/* BOTÃO DE HARD RESET NO RODAPÉ */}
      <div className="mt-8 flex justify-end">
        <button 
          onClick={handleHardReset}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          HARD RESET (LIMPAR DADOS)
        </button>
      </div>

      {/* FAB - Novo Lançamento (mobile only) */}
      <button
        onClick={() => abrirModalNovoLancamento()}
        className="md:hidden fixed bottom-6 right-4 z-30 w-14 h-14 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
      </button>

    </div>
  );
};

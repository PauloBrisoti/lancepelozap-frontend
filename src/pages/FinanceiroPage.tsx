import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { TrendingUp, TrendingDown, Banknote, HandCoins, CalendarClock, Receipt, PiggyBank, Scale, Activity, Box, FileMinus, Wallet, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDateFilter } from '../hooks/useDateFilter';
import type { Sale, SaleItem } from '../types/api';

const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDateBR = (iso: string) => iso.split('-').reverse().join('/');

const PM_COLORS: Record<string, string> = {
  PIX: '#059669',
  DINHEIRO: '#f59e0b',
  CREDIARIO: '#6366f1',
  CARTAO_CREDITO: '#8b5cf6',
  CARTAO_DEBITO: '#0ea5e9',
  BOLETO: '#ef4444',
  OUTRO: '#64748b',
};

interface Wallet {
  id: string;
  nome: string;
  tipo: string;
  saldoAtual: number;
}

interface Transaction {
  id: string;
  tipo: string;
  valor: number;
  descricao: string;
  categoria?: string;
  dataTransacao: string;
  wallet: { nome: string };
  sale?: Sale;
  customerId?: string;
  fornecedor?: string;
}

interface Receivable {
  id: string;
  customer: { nomeCompleto: string };
  sale: { id: string } | null;
  dataVencimento: string;
  numeroParcela: number;
  totalParcelas: number;
  valorParcela: number;
  status: string;
  statusExibicao?: string;
  valorJaPago?: number;
  saldoRestante?: number;
  telefone?: string;
  nome?: string;
  valor?: number;
  diasAtraso?: number;
}

interface Customer {
  id: string;
  nomeCompleto: string;
}

interface PaymentMethodEntry {
  method: string;
  label: string;
  value: number;
}

interface PJDashboardData {
  saldoAcumulado: number;
  saldoAnterior: number;
  saldoAtual: number;
  dinheiroCaixaRealizado: number;
  saidasMensais: number;
  saidasTotais: number;
  volumeVendasMes: number;
  faturamentoBruto: number;
  faturamentoLiquido: number;
  faturamentoCrescimento?: number;
  aReceberFiado: number;
  crediarioAVencerMes: number;
  parcelasFornecedoresMes: number;
  despesasFixasMes: number;
  despesasOperacionais: number;
  cmvMes: number;
  lucroBruto: number;
  lucroLiquidoReal: number;
  lucroCrescimento?: number;
  dinheiroImobilizado: number;
  capitalLivre: number;
  impostosEstimados: number;
  saldoProjetado: number;
  paymentMethodsBreakdown?: PaymentMethodEntry[];
  // Novos campos de transparência temporal
  fiadoAVencer?: number;
  fiadoPeriodo?: number;
  dinheiroRecebidoVendasPeriodo?: number;
  dinheiroRecebidoOutros?: number;
  contasAReceberPeriodo?: number;
  contasAReceberAnterior?: number;
  contasAReceberFuturo?: number;
  pagamentosEstoque?: number;
  inadimplenciaTotal?: number;
  inadimplenciaPercentual?: number;
}

interface FinancialCategory {
  id: string;
  nome: string;
  tipo: string;
  isDefault: boolean;
}

interface Payable {
  id: string;
  descricao: string;
  categoria?: string;
  fornecedor?: string;
  dataVencimento: string;
  valor: number;
  status: string;
}
export interface DreData {
  receitaBruta: number;
  deducoes: { total: number; descontos: number; taxasGateway: number; };
  receitaLiquida: number;
  custos: { cmv: number; };
  lucroBruto: number;
  margemLucroBruto: number;
  despesas: { total: number; detalhamento: { categoria: string; valor: number; }[]; };
  lucroLiquido: number;
  margemLucroLiquido: number;
}

export const FinanceiroPage: React.FC = () => {
  const { activeStoreId } = useAuth();
  const [activeTab, setActiveTab] = useState<'TRANSACOES' | 'RECEBER' | 'PAGAR' | 'DRE'>('TRANSACOES');
  const [loading, setLoading] = useState(true);
  
  // Dados do Dashboard
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [, setSaldoProjetado] = useState(0);
  const [devedoresAtrasados, setDevedoresAtrasados] = useState<any[]>([]);
  const [totalAtrasado, setTotalAtrasado] = useState(0);
   
  const [_totalAVencer, _setTotalAVencer] = useState(0);
   
  const [_receitasMes, _setReceitasMes] = useState(0);
  const [despesasMes, setDespesasMes] = useState(0);
  const [pjData, setPjData] = useState<PJDashboardData | null>(null);

  // Dados das abas
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [dreData, setDreData] = useState<DreData | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modais
  const [modalCobranca, setModalCobranca] = useState(false);
  const [modalLancamento, setModalLancamento] = useState(false);
  const [modalBaixa, setModalBaixa] = useState<{ isOpen: boolean; rec?: Receivable }>({ isOpen: false });
  const [modalBaixaPagar, setModalBaixaPagar] = useState<{ isOpen: boolean; payable?: Payable }>({ isOpen: false });
  const [modalImport, setModalImport] = useState(false);
  const [novaCategoriaMode, setNovaCategoriaMode] = useState<'tx' | null>(null);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');

  // Tipo do lançamento no modal unificado
  const [dashboardCards, setDashboardCards] = useState<string[] | null>(null);
  const [tipoLancamento, setTipoLancamento] = useState<'RECEITA' | 'DESPESA_VISTA' | 'CONTA_PAGAR'>('RECEITA');

  // Form Lançamento (Receita / Despesa à Vista)
  const [formTx, setFormTx] = useState({ 
    id: '', tipo: 'SAIDA', valor: '', descricao: '', walletId: '', categoria: '', dataTransacao: '',
    customerId: '', fornecedor: '',
    isParcelado: false, numeroParcelas: 2, frequencia: 'MENSAL', isFirstPaid: true,
    comprovante: null as File | null
  });
  // Form Baixa
  const [formBaixa, setFormBaixa] = useState({ walletId: '', valorPago: '' });
  // Form Conta a Pagar
  const [formPayable, setFormPayable] = useState({ id: '', descricao: '', categoria: '', fornecedor: '', dataVencimento: '', valor: '', isParcelado: false, numeroParcelas: 2, frequencia: 'MENSAL', isFirstPaid: false });
  const [formBaixaPagar, setFormBaixaPagar] = useState({ walletId: '' });

  // Date filter state
  const [dateFilter, setDateFilter] = useState('THIS_MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [diaInicioMes, setDiaInicioMes] = useState(1);
  const { query: queryParams, start: periodStart, end: periodEnd } = useDateFilter(dateFilter as any, customStart || undefined, customEnd || undefined, diaInicioMes);

  const carregarDados = async () => {
    try {
      const dash = await fetchApi(`/finance/dashboard${queryParams}`);
      setWallets(dash.wallets);
      setSaldoTotal(dash.saldoTotal);
      setSaldoProjetado(dash.saldoProjetado || 0);
      setDevedoresAtrasados(dash.devedoresAtrasados || []);
      setTotalAtrasado(dash.totalAtrasado);
      _setTotalAVencer(dash.totalAVencer);
      _setReceitasMes(dash.receitasMes || 0);
      setDespesasMes(dash.despesasMes || 0);

      const cats = await fetchApi('/finance/categories').catch(() => []);
      setCategories(cats);

      fetchApi(`/v2/dashboard/pj${queryParams}`)
        .then(dataPj => {
          if (dataPj && dataPj.metrics) setPjData(dataPj.metrics);
        })
        .catch(() => null);

      if (activeTab === 'TRANSACOES') {
        const txs = await fetchApi(`/finance/transactions${queryParams}`);
        setTransactions(txs);
        // Load customers for the modal
        const custs = await fetchApi('/customers').catch(() => []);
        setCustomers(custs);
      } else if (activeTab === 'RECEBER') {
        const recs = await fetchApi(`/finance/receivables`);
        setReceivables(recs);
      } else if (activeTab === 'PAGAR') {
        const payables = await fetchApi('/finance/payables');
        setPayables(payables);
      } else if (activeTab === 'DRE') {
        const dre = await fetchApi(`/finance/dre${queryParams}`);
        setDreData(dre);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApi(`/store/my/${activeStoreId}/fiscal-config`).then((res: any) => {
      if (res?.diaInicioMes) setDiaInicioMes(res.diaInicioMes);
    }).catch(() => {});
    fetchApi(`/store/my/${activeStoreId}/dashboard-config`).then((res: any) => {
      if (res?.cards) setDashboardCards(res.cards);
    }).catch(() => {});
  }, [activeStoreId]);

  useEffect(() => {
    setLoading(true);
    carregarDados();
  }, [activeTab, queryParams, activeStoreId]);

  const handleSalvarLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setModalLancamento(false);
      carregarDados();
      toast.success('Lançamento salvo com sucesso!');
    } catch (error) {
      toast.error((error as Error).message || 'Erro ao salvar lançamento');
    }
  };

  const handleCriarCategoria = async (tipo: 'ENTRADA' | 'SAIDA') => {
    if (!novaCategoriaNome.trim()) return;
    try {
      const nova = await fetchApi('/finance/categories', {
        method: 'POST',
        body: JSON.stringify({ nome: novaCategoriaNome.trim(), tipo }),
      });
      setCategories(prev => [...prev, nova]);
      if (tipoLancamento === 'CONTA_PAGAR') {
        setFormPayable({ ...formPayable, categoria: novaCategoriaNome.trim() });
      } else {
        setFormTx({ ...formTx, categoria: novaCategoriaNome.trim() });
      }
      setNovaCategoriaMode(null);
      setNovaCategoriaNome('');
      toast.success('Categoria criada!');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar categoria');
    }
  };

  const handleHardReset = async () => {
    const confirmar = window.confirm("CUIDADO: Tem certeza que deseja apagar TODOS os dados financeiros desta loja? O catálogo de produtos será mantido.");
    if (!confirmar) return;
    try {
      await fetchApi('/import/smart/hard-reset', { method: 'POST' });
      alert("Dados apagados com sucesso! O ambiente está limpo.");
      window.location.reload();
    } catch (error) {
      console.error("Erro ao realizar Hard Reset:", error);
      alert("Ocorreu um erro ao tentar limpar os dados.");
    }
  };

  const handleTipoLancamentoChange = (tipo: 'RECEITA' | 'DESPESA_VISTA' | 'CONTA_PAGAR') => {
    setTipoLancamento(tipo);
    setNovaCategoriaMode(null);
    setNovaCategoriaNome('');
    if (tipo === 'CONTA_PAGAR') {
    setFormPayable({ id: '', descricao: '', categoria: '', fornecedor: '', dataVencimento: '', valor: '', isParcelado: false, numeroParcelas: 2, frequencia: 'MENSAL', isFirstPaid: false });
    } else {
      const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
      setFormTx(prev => ({
        ...prev,
        id: '',
        tipo: tipo === 'RECEITA' ? 'ENTRADA' : 'SAIDA',
        descricao: '',
        valor: '',
        categoria: '',
        customerId: '',
        fornecedor: '',
        dataTransacao: localISOTime,
        isParcelado: false,
        numeroParcelas: 2,
      }));
    }
  };

  const abrirModalEditarTx = (tx: Transaction) => {
    // Local datetime format: YYYY-MM-DDThh:mm
    const dateObj = new Date(tx.dataTransacao);
    const tzoffset = dateObj.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(dateObj.getTime() - tzoffset)).toISOString().slice(0, 16);

    setFormTx({
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
    setModalLancamento(true);
  };

  const abrirModalNovoLancamento = (tipo?: 'RECEITA' | 'DESPESA_VISTA' | 'CONTA_PAGAR') => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    setTipoLancamento(tipo || 'RECEITA');
    setFormTx({ 
      id: '', tipo: tipo === 'RECEITA' ? 'ENTRADA' : 'SAIDA', valor: '', descricao: '', walletId: wallets[0]?.id || '', categoria: '', dataTransacao: localISOTime,
      customerId: '', fornecedor: '', isParcelado: false, numeroParcelas: 2, frequencia: 'MENSAL', isFirstPaid: true, comprovante: null
    });
    setFormPayable({ id: '', descricao: '', categoria: '', fornecedor: '', dataVencimento: '', valor: '', isParcelado: false, numeroParcelas: 2, frequencia: 'MENSAL', isFirstPaid: false });
    setModalLancamento(true);
  };

  const handleBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!modalBaixa.rec) return;
      if (!formBaixa.walletId) {
        toast.error('Selecione uma carteira para receber o pagamento.');
        return;
      }
      await fetchApi(`/finance/receivables/${modalBaixa.rec.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ walletId: formBaixa.walletId, valorPago: Number(formBaixa.valorPago) })
      });
      toast.success('Baixa realizada com sucesso!');
      setModalBaixa({ isOpen: false });
      carregarDados();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao realizar baixa');
    }
  };

  const handleBaixaPagar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!modalBaixaPagar.payable) return;
      await fetchApi(`/finance/payables/${modalBaixaPagar.payable.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ walletId: formBaixaPagar.walletId })
      });
      toast.success('Conta paga com sucesso!');
      setModalBaixaPagar({ isOpen: false });
      carregarDados();
    } catch (error) {
      toast.error('Erro ao pagar conta');
    }
  };

  const handleSalvarPayable = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setModalLancamento(false);
      carregarDados();
    } catch (error) {
      toast.error('Erro ao salvar conta a pagar');
    }
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

  if (loading && wallets.length === 0) return <div className="p-8">Carregando financeiro...</div>;

  return (
    <div className="p-3 md:p-8 space-y-4 md:space-y-8">
      <div className="flex justify-between items-start md:items-center mb-4 md:mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">Acompanhe e detalhe todas as transações, receitas e despesas.</p>
        </div>
        <div className="flex gap-1.5 md:gap-2 shrink-0 ml-2">
          <button 
            onClick={() => setModalImport(true)}
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
        <button onClick={() => setDateFilter('TODAY')} className={`px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors ${dateFilter === 'TODAY' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Hoje</button>
        <button onClick={() => setDateFilter('LAST_7_DAYS')} className={`px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors ${dateFilter === 'LAST_7_DAYS' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>7 Dias</button>
        <button onClick={() => setDateFilter('THIS_MONTH')} className={`px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors ${dateFilter === 'THIS_MONTH' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Este Mês</button>
        <button onClick={() => setDateFilter('LAST_MONTH')} className={`px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors ${dateFilter === 'LAST_MONTH' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Mês Passado</button>

        <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2 ml-1">
          <input type="date" className="w-24 sm:w-28 md:w-auto text-xs md:text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-brand-500" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setDateFilter('CUSTOM'); }} />
          <span className="text-gray-400 text-xs shrink-0">–</span>
          <input type="date" className="w-24 sm:w-28 md:w-auto text-xs md:text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-brand-500" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setDateFilter('CUSTOM'); }} />
        </div>
      </div>

      {/* ALERTA DE INADIMPLÊNCIA */}
      {totalAtrasado > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-red-800 font-bold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Atenção: Inadimplência Detectada
            </h3>
            <p className="text-red-600 text-sm mt-1">
              Você possui <strong>{formatBRL(Number(totalAtrasado))}</strong> em contas atrasadas (Fiado).
            </p>
          </div>
          <button 
            onClick={() => setModalCobranca(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors whitespace-nowrap"
          >
            Cobrar Devedores
          </button>
        </div>
      )}

      {/* ───────── BLOCO 1: FLUXO FINANCEIRO ───────── */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-brand-600" />
              </div>
              <h2 className="text-sm md:text-lg font-bold text-gray-800">Visão Geral</h2>
            </div>
            <span className="hidden sm:inline text-xs text-gray-400">Faturamento Bruto → Recebimentos → Saldo Disponível</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
            {(!dashboardCards || dashboardCards.includes('faturamento_bruto')) && (
              <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Banknote className="w-5 h-5 text-brand-600" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Faturamento Bruto</p>
                </div>
                <p className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
                  {formatBRL(pjData?.faturamentoBruto ?? 0)}
                </p>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
                  Total de vendas do período (competência)
                  {dateFilter !== 'TODAY' && periodStart && periodEnd && <span className="block text-[10px] text-gray-300 mt-0.5">{formatDateBR(periodStart)} a {formatDateBR(periodEnd)}</span>}
                </p>
              </div>
            )}
            {(!dashboardCards || dashboardCards.includes('dinheiro_recebido')) && (
              <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <HandCoins className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dinheiro Recebido</p>
                </div>
                <p className="text-xl md:text-2xl font-extrabold text-emerald-700 tracking-tight">
                  {formatBRL(pjData?.dinheiroCaixaRealizado ?? 0)}
                </p>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
                  Entradas realizadas (caixa)
                  {pjData && pjData.dinheiroRecebidoVendasPeriodo !== undefined && (
                    <span className="block text-[10px] text-gray-400 mt-0.5">
                      <strong>{formatBRL(pjData.dinheiroRecebidoVendasPeriodo)}</strong> de vendas deste período
                      {pjData.dinheiroRecebidoOutros! > 0 && ` · ${formatBRL(pjData.dinheiroRecebidoOutros!)} de anteriores`}
                    </span>
                  )}
                </p>
              </div>
            )}
            {(!dashboardCards || dashboardCards.includes('fiado_a_receber')) && (
              <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <CalendarClock className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Fiado a Receber</p>
                </div>
                <p className="text-xl md:text-2xl font-extrabold text-amber-600 tracking-tight">
                  {formatBRL(pjData?.fiadoAVencer ?? 0)}
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
                    <span className="block text-[10px] text-red-500 font-bold mt-0.5">
                      {formatBRL(pjData!.inadimplenciaTotal!)} vencido
                      {pjData!.inadimplenciaPercentual! > 0 && ` (${pjData!.inadimplenciaPercentual!.toFixed(1)}%)`}
                    </span>
                  )}
                </p>
              </div>
            )}
            {(!dashboardCards || dashboardCards.includes('contas_a_pagar')) && (
              <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5 text-rose-600" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contas a Pagar</p>
                </div>
                <p className="text-xl md:text-2xl font-extrabold text-rose-600 tracking-tight">
                  {formatBRL(pjData?.parcelasFornecedoresMes ?? 0)}
                </p>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">Boletos e contas pendentes</p>
              </div>
            )}
            {(!dashboardCards || dashboardCards.includes('caixa_disponivel')) && (
              <div className="relative bg-gradient-to-br from-brand-600 to-brand-800 p-4 md:p-5 rounded-2xl shadow-md text-white overflow-hidden">
                <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full" />
                <div className="absolute -bottom-10 -left-6 w-24 h-24 bg-white/5 rounded-full" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <PiggyBank className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-[11px] font-bold text-brand-100 uppercase tracking-wider">Caixa Disponível</p>
                  </div>
                  <p className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                    {formatBRL(pjData?.saldoAtual ?? saldoTotal)}
                  </p>
                  <p className="text-[11px] text-brand-100/70 mt-1.5 leading-snug">Saldo total em todas as carteiras</p>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* ───────── BLOCO 2: RESULTADO DA OPERAÇÃO ───────── */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <h2 className="text-sm md:text-lg font-bold text-gray-800">Resultado da Operação</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {(!dashboardCards || dashboardCards.includes('lucro_operacao')) && (
            <div className="relative bg-gradient-to-br from-emerald-600 to-emerald-800 p-4 md:p-5 rounded-2xl shadow-md text-white overflow-hidden">
              <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Lucro da Operação</h3>
                </div>
                <p className="text-2xl font-extrabold text-white tracking-tight">
                  {formatBRL(pjData?.lucroLiquidoReal ?? 0)}
                </p>
                {pjData && pjData.lucroCrescimento !== undefined && (
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mt-2.5 ${
                    pjData.lucroCrescimento > 0 ? 'bg-emerald-400/20 text-emerald-200' :
                    pjData.lucroCrescimento === 0 ? 'bg-white/10 text-slate-200' :
                    'bg-rose-400/20 text-rose-200'
                  }`}>
                    {pjData.lucroCrescimento > 0 ? <TrendingUp className="w-3 h-3" /> : pjData.lucroCrescimento < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                    {pjData.lucroCrescimento === 0 ? 'Neutro vs ant.' : ` ${pjData.lucroCrescimento > 0 ? '+' : ''}${pjData.lucroCrescimento.toFixed(1)}%`}
                  </span>
                )}
                <p className="text-[11px] text-emerald-100/80 mt-2 leading-snug">
                  Faturamento Líquido − CMV − Despesas Operacionais
                </p>
              </div>
            </div>
          )}

          {(!dashboardCards || dashboardCards.includes('estoque_atual')) && (
            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Box className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Estoque Atual</h3>
              </div>
              <p className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
                {formatBRL(pjData?.dinheiroImobilizado ?? 0)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">Custo dos Produtos em Estoque</p>
            </div>
          )}

          {(!dashboardCards || dashboardCards.includes('despesas_operacionais')) && (
            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                  <FileMinus className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Despesas Operacionais</h3>
              </div>
              <p className="text-xl md:text-2xl font-extrabold text-rose-600 tracking-tight">
                {formatBRL(pjData?.despesasOperacionais ?? despesasMes)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">Custos Operacionais do Mês (exceto fornecedores/estoque)</p>
              {(pjData?.despesasOperacionais === 0 || (pjData === null && despesasMes === 0)) && (
                <p className="text-[10px] text-amber-500 font-semibold mt-1.5">
                  ⓘ Nenhuma despesa registrada. Use o módulo A Pagar ou o lançamento de Despesa para registrar.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ───────── BLOCO 1B: SALDO PROJETADO ───────── */}
      {(!dashboardCards || dashboardCards.includes('saldo_projetado')) && pjData && (
        <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl p-4 md:p-6 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Scale className="w-4 h-4 text-indigo-300" />
              </div>
              <h2 className="text-sm md:text-lg font-bold text-white">Saldo Projetado</h2>
            </div>
            <span className="hidden sm:inline text-[10px] md:text-xs text-slate-400">Caixa + A Receber − A Pagar</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
                <PiggyBank className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Caixa Disponível</p>
                <p className="text-base md:text-lg font-extrabold text-white truncate">{formatBRL(pjData.saldoAtual ?? 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
                <ArrowDownRight className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">+ A Receber</p>
                <p className="text-base md:text-lg font-extrabold text-emerald-300 truncate">+ {formatBRL(pjData.crediarioAVencerMes ?? 0)}</p>
                <p className="text-[10px] text-slate-400 truncate">Fiado a receber</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-full bg-rose-400/20 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-5 h-5 text-rose-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">− A Pagar</p>
                <p className="text-base md:text-lg font-extrabold text-rose-300 truncate">{formatBRL(-((pjData.parcelasFornecedoresMes ?? 0) + (pjData.pagamentosEstoque ?? 0) + (pjData.despesasFixasMes ?? 0)))}</p>
                <p className="text-[10px] text-slate-400 truncate">Fornecedores + despesas</p>
              </div>
            </div>
            <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-700 p-3.5 rounded-xl shadow-md overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">= Saldo Projetado</p>
                  <p className="text-lg md:text-xl font-extrabold text-white truncate">{formatBRL(pjData.saldoProjetado ?? 0)}</p>
                  <p className="text-[10px] text-indigo-200 truncate">Caixa + A Receber − A Pagar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────── MIX DE PAGAMENTO + CARTEIRAS ───────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      {/* CARTEIRAS */}
      {(!dashboardCards || dashboardCards.includes('saldos_carteira')) && (
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 order-2 xl:order-1">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-gray-600" />
            </div>
            <h2 className="text-sm md:text-lg font-bold text-gray-800">Saldos por Carteira</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wallets.map(w => (
              <div key={w.id} className="bg-gray-50/70 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${w.tipo === 'EMPRESA' ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-500'}`}>
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{w.nome}</p>
                  <p className="text-lg font-extrabold text-gray-900 tracking-tight">{formatBRL(Number(w.saldoAtual))}</p>
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
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 order-1 xl:order-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-brand-600" />
              </div>
              <h2 className="text-sm md:text-lg font-bold text-gray-800">Mix de Pagamento</h2>
            </div>
            <span className="hidden sm:inline text-xs text-gray-400">Vendas por forma de pagamento</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-5">
            {items.map(pm => (
              <div key={pm.method} className="h-full transition-all duration-300" style={{ width: `${(pm.value / mixTotal) * 100}%`, backgroundColor: PM_COLORS[pm.method] || '#64748b' }} title={`${pm.label}: ${Math.round((pm.value / mixTotal) * 100)}%`} />
            ))}
          </div>
          <div className="space-y-3">
            {items.map(pm => {
              const pct = Math.round((pm.value / mixTotal) * 100);
              const color = PM_COLORS[pm.method] || '#64748b';
              return (
                <div key={pm.method} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm text-gray-600 flex-1">{pm.label}</span>
                  <span className="text-sm font-bold text-gray-900">{formatBRL(pm.value)}</span>
                  <span className="text-xs font-extrabold w-11 text-right" style={{ color }}>{pct}%</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-4 text-center border-t border-gray-50 pt-3">
            *Crediário considera o valor total da venda, não apenas o sinal recebido
          </p>
        </div>
        );
      })()}
      </div>

      {/* ABAS */}
      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto whitespace-nowrap">
          <button 
            className={`px-4 md:px-6 py-3 md:py-4 font-semibold text-xs md:text-sm ${activeTab === 'TRANSACOES' ? 'text-brand-600 border-b-2 border-brand-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('TRANSACOES')}
          >
            Extrato
          </button>
          <button 
            className={`px-4 md:px-6 py-3 md:py-4 font-semibold text-xs md:text-sm ${activeTab === 'RECEBER' ? 'text-brand-600 border-b-2 border-brand-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('RECEBER')}
          >
            A Receber
          </button>
          <button 
            className={`px-4 md:px-6 py-3 md:py-4 font-semibold text-xs md:text-sm ${activeTab === 'PAGAR' ? 'text-brand-600 border-b-2 border-brand-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('PAGAR')}
          >
            A Pagar
          </button>
          <button 
            className={`px-4 md:px-6 py-3 md:py-4 font-semibold text-xs md:text-sm ${activeTab === 'DRE' ? 'text-brand-600 border-b-2 border-brand-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('DRE')}
          >
            DRE
          </button>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'TRANSACOES' && (
            <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-2 md:p-4 border-b w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                      checked={transactions.length > 0 && selectedIds.length === transactions.length}
                      onChange={() => handleSelectAll(transactions.map(t => t.id))}
                    />
                  </th>
                  <th className="p-2 md:p-4 border-b whitespace-nowrap">Data</th>
                  <th className="p-2 md:p-4 border-b whitespace-nowrap">Tipo</th>
                  <th className="p-2 md:p-4 border-b">Descrição</th>
                  <th className="p-2 md:p-4 border-b hidden md:table-cell">Categoria</th>
                  <th className="p-2 md:p-4 border-b hidden md:table-cell">Carteira</th>
                  <th className="p-2 md:p-4 border-b text-right whitespace-nowrap">Valor</th>
                  <th className="p-2 md:p-4 border-b text-center w-14 md:w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-2 md:p-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                        checked={selectedIds.includes(tx.id)}
                        onChange={() => handleToggleSelect(tx.id)}
                      />
                    </td>
                    <td className="p-2 md:p-4 text-xs md:text-sm text-gray-600 whitespace-nowrap">
                      {new Date(tx.dataTransacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-2 md:p-4">
                      {tx.tipo === 'ENTRADA' ? (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold">Entrada</span>
                      ) : (
                        <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold">Saída</span>
                      )}
                    </td>
                    <td className="p-2 md:p-4 max-w-[120px] md:max-w-none">
                      <div className="font-medium text-gray-800 text-xs md:text-sm truncate">{tx.descricao}</div>
                      {tx.sale?.saleItems && tx.sale.saleItems.length > 0 && (
                        <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1 max-w-[100px] md:max-w-xs truncate">
                          {tx.sale.saleItems.map((item: SaleItem) => `${Number(item.quantidade)}x ${item.product?.nome || 'Produto'}`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-2 md:p-4 text-xs md:text-sm text-gray-500 hidden md:table-cell">{tx.categoria || '-'}</td>
                    <td className="p-2 md:p-4 text-xs md:text-sm text-gray-500 hidden md:table-cell">{tx.wallet.nome}</td>
                    <td className={`p-2 md:p-4 text-right font-bold text-xs md:text-sm ${tx.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'} whitespace-nowrap`}>
                      {tx.tipo === 'ENTRADA' ? '+' : '-'} {formatBRL(Number(tx.valor))}
                    </td>
                    <td className="p-2 md:p-4 text-center">
                      <button onClick={() => abrirModalEditarTx(tx)} className="text-brand-500 hover:text-brand-700 transition-colors p-1" title="Editar">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhuma transação encontrada.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'RECEBER' && (
            <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-2 md:p-4 border-b w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                      checked={receivables.length > 0 && selectedIds.length === receivables.length}
                      onChange={() => handleSelectAll(receivables.map(r => r.id))}
                    />
                  </th>
                  <th className="p-2 md:p-4 border-b whitespace-nowrap">Cliente</th>
                  <th className="p-2 md:p-4 border-b whitespace-nowrap">Vencimento</th>
                  <th className="p-2 md:p-4 border-b hidden md:table-cell">Parcela</th>
                  <th className="p-2 md:p-4 border-b text-right whitespace-nowrap">Valor Original</th>
                  <th className="p-2 md:p-4 border-b text-right whitespace-nowrap">Saldo</th>
                  <th className="p-2 md:p-4 border-b text-center whitespace-nowrap">Status</th>
                  <th className="p-2 md:p-4 border-b text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map(rec => {
                  const status = rec.statusExibicao;
                  const isPago = status === 'PAGO';
                  const isParcial = status === 'PAGO_PARCIAL';
                  const isVencido = status === 'VENCIDO';
                  const totalPago = rec.valorJaPago ?? 0;
                  const saldoRestante = rec.saldoRestante ?? (Number(rec.valorParcela) - totalPago);
                  return (
                    <tr key={rec.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-2 md:p-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                          checked={selectedIds.includes(rec.id)}
                          onChange={() => handleToggleSelect(rec.id)}
                        />
                      </td>
                      <td className="p-2 md:p-4 font-medium text-gray-800 text-xs md:text-sm truncate max-w-[100px] md:max-w-none">{rec.customer?.nomeCompleto || '-'}</td>
                      <td className={`p-2 md:p-4 text-xs md:text-sm whitespace-nowrap ${isVencido ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {new Date(rec.dataVencimento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-2 md:p-4 text-xs md:text-sm text-gray-500 hidden md:table-cell">{rec.numeroParcela} / {rec.totalParcelas}</td>
                      <td className="p-2 md:p-4 text-right text-gray-600 text-xs md:text-sm whitespace-nowrap">{formatBRL(Number(rec.valorParcela))}</td>
                      <td className="p-2 md:p-4 text-right font-bold text-xs md:text-sm whitespace-nowrap">
                        {isPago ? (
                          <span className="text-emerald-600">{formatBRL(0)}</span>
                        ) : (
                          <span className={isParcial ? 'text-amber-600' : 'text-gray-800'}>
                            {formatBRL(saldoRestante)}
                          </span>
                        )}
                      </td>
                      <td className="p-2 md:p-4 text-center">
                        <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${isPago ? 'bg-emerald-100 text-emerald-700' : isParcial ? 'bg-blue-100 text-blue-700' : isVencido ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isPago ? 'Quitado' : isParcial ? 'Parcial' : isVencido ? 'Vencido' : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-2 md:p-4 text-center">
                        {!isPago && (
                          <button 
                            onClick={() => { setFormBaixa({ walletId: wallets[0]?.id || '', valorPago: '' }); setModalBaixa({ isOpen: true, rec }); }}
                            className="text-[10px] md:text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg shadow-sm transition-colors whitespace-nowrap"
                          >
                            {totalPago > 0 ? 'Completar' : 'Receber'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {receivables.length === 0 && (
                  <tr><td colSpan={8} className="p-4 md:p-8 text-center text-gray-500 text-xs md:text-sm">Nenhum fiado a receber.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'PAGAR' && (
            <table className="w-full text-left border-collapse min-w-[500px] md:min-w-0">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-2 md:p-4 border-b w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                      checked={payables.length > 0 && selectedIds.length === payables.length}
                      onChange={() => handleSelectAll(payables.map(p => p.id))}
                    />
                  </th>
                  <th className="p-2 md:p-4 border-b">Descrição</th>
                  <th className="p-2 md:p-4 border-b hidden md:table-cell">Fornecedor</th>
                  <th className="p-2 md:p-4 border-b whitespace-nowrap">Vencimento</th>
                  <th className="p-2 md:p-4 border-b text-right whitespace-nowrap">Valor</th>
                  <th className="p-2 md:p-4 border-b text-center whitespace-nowrap">Status</th>
                  <th className="p-2 md:p-4 border-b text-center whitespace-nowrap">Ação</th>
                </tr>
              </thead>
              <tbody>
                {payables.map(pay => {
                  const vencido = new Date(pay.dataVencimento) < new Date() && pay.status === 'PENDENTE';
                  return (
                    <tr key={pay.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-2 md:p-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                          checked={selectedIds.includes(pay.id)}
                          onChange={() => handleToggleSelect(pay.id)}
                        />
                      </td>
                      <td className="p-2 md:p-4 font-medium text-gray-800 text-xs md:text-sm truncate max-w-[100px] md:max-w-none">{pay.descricao}</td>
                      <td className="p-2 md:p-4 text-xs md:text-sm text-gray-500 hidden md:table-cell">{pay.fornecedor || '-'}</td>
                      <td className={`p-2 md:p-4 text-xs md:text-sm whitespace-nowrap ${vencido ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {new Date(pay.dataVencimento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-2 md:p-4 text-right font-bold text-xs md:text-sm whitespace-nowrap">{formatBRL(Number(pay.valor))}</td>
                      <td className="p-2 md:p-4 text-center">
                        <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full font-bold ${pay.status === 'PAGO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {pay.status === 'PAGO' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-2 md:p-4 text-center">
                        <button
                          onClick={() => {
                            setTipoLancamento('CONTA_PAGAR');
                            setFormPayable({
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
                            setModalLancamento(true);
                          }}
                          className="text-sm text-brand-600 hover:text-brand-800 px-2 py-1 font-medium"
                        >
                          Editar
                        </button>
                        {pay.status === 'PENDENTE' && (
                          <button 
                            onClick={() => { setFormBaixaPagar({ walletId: wallets[0]?.id || '' }); setModalBaixaPagar({ isOpen: true, payable: pay }); }}
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
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500">Nenhuma conta a pagar.</td></tr>
                )}
              </tbody>
            </table>
          )}
        {activeTab === 'DRE' && dreData && (
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-sm md:text-lg font-bold text-gray-900">DRE</h3>
                <span className="text-[10px] md:text-sm text-gray-500 bg-gray-100 px-2 md:px-3 py-0.5 md:py-1 rounded-full whitespace-nowrap">Método de Competência</span>
              </div>
              
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* 1. Receita Operacional Bruta */}
                <div className="flex justify-between p-4 bg-gray-50 border-b border-gray-200">
                  <span className="font-bold text-gray-800">1. RECEITA OPERACIONAL BRUTA</span>
                  <span className="font-bold text-gray-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dreData.receitaBruta)}</span>
                </div>
                
                {/* 2. Deduções */}
                <div className="flex justify-between p-4 border-b border-gray-200 text-red-600">
                  <span className="font-semibold ml-4">2. (-) DEDUÇÕES DA RECEITA BRUTA</span>
                  <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(-dreData.deducoes.total)}</span>
                </div>
                <div className="flex justify-between px-8 py-2 text-sm text-gray-600">
                  <span>Descontos Concedidos</span>
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(-dreData.deducoes.descontos)}</span>
                </div>
                <div className="flex justify-between px-8 py-2 text-sm text-gray-600 border-b border-gray-100">
                  <span>Taxas de Cartão/Gateway</span>
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(-dreData.deducoes.taxasGateway)}</span>
                </div>

                {/* 3. Receita Operacional Líquida */}
                <div className="flex justify-between p-4 bg-blue-50 border-b border-gray-200">
                  <span className="font-bold text-blue-900">3. (=) RECEITA OPERACIONAL LÍQUIDA</span>
                  <span className="font-bold text-blue-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dreData.receitaLiquida)}</span>
                </div>

                {/* 4. Custos (CMV) */}
                <div className="flex justify-between p-4 border-b border-gray-200 text-rose-600">
                  <span className="font-semibold ml-4">4. (-) CUSTOS DAS MERCADORIAS VENDIDAS (CMV)</span>
                  <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(-dreData.custos.cmv)}</span>
                </div>

                {/* 5. Lucro Bruto */}
                <div className="flex justify-between p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">5. (=) RESULTADO OPERACIONAL BRUTO</span>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">Margem: {dreData.margemLucroBruto.toFixed(1)}%</span>
                  </div>
                  <span className="font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dreData.lucroBruto)}</span>
                </div>

                {/* 6. Despesas Operacionais */}
                <div className="flex justify-between p-4 border-b border-gray-200 text-orange-600">
                  <span className="font-semibold ml-4">6. (-) DESPESAS OPERACIONAIS</span>
                  <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(-dreData.despesas.total)}</span>
                </div>
                {dreData.despesas.detalhamento.map((desp, idx) => (
                  <div key={idx} className="flex justify-between px-8 py-2 text-sm text-gray-600 border-b border-gray-50 last:border-b-gray-200">
                    <span>{desp.categoria}</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(-desp.valor)}</span>
                  </div>
                ))}
                {dreData.despesas.detalhamento.length === 0 && (
                  <div className="px-8 py-2 text-sm text-gray-400 italic border-b border-gray-200">Nenhuma despesa registrada no período.</div>
                )}

                {/* 7. Lucro Líquido */}
                <div className={`flex justify-between p-4 ${dreData.lucroLiquido >= 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">7. (=) RESULTADO LÍQUIDO DO EXERCÍCIO</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${dreData.lucroLiquido >= 0 ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                      Margem Líquida: {dreData.margemLucroLiquido.toFixed(1)}%
                    </span>
                  </div>
                  <span className="font-bold text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dreData.lucroLiquido)}</span>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL LANÇAMENTO / EDIÇÃO UNIFICADO */}
      {modalLancamento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {tipoLancamento === 'CONTA_PAGAR' ? (formPayable.id ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar') : (formTx.id ? 'Editar Lançamento' : 'Novo Lançamento')}
              </h2>
              <button type="button" onClick={() => setModalLancamento(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={tipoLancamento === 'CONTA_PAGAR' ? handleSalvarPayable : handleSalvarLancamento} className="space-y-4">
              
              {/* ─── SELETOR DE TIPO ─── */}
              {!formTx.id && !formPayable.id && (
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => handleTipoLancamentoChange('RECEITA')} className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center font-bold transition-all text-[11px] leading-tight ${tipoLancamento === 'RECEITA' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    <span>Receita</span>
                  </button>
                  <button type="button" onClick={() => handleTipoLancamentoChange('DESPESA_VISTA')} className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center font-bold transition-all text-[11px] leading-tight ${tipoLancamento === 'DESPESA_VISTA' ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                    <span>Despesa à Vista</span>
                  </button>
                  <button type="button" onClick={() => handleTipoLancamentoChange('CONTA_PAGAR')} className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center font-bold transition-all text-[11px] leading-tight ${tipoLancamento === 'CONTA_PAGAR' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>Conta a Pagar</span>
                  </button>
                </div>
              )}

              {/* ─── CAMPOS: RECEITA / DESPESA À VISTA ─── */}
              {tipoLancamento !== 'CONTA_PAGAR' && (
                <>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora</label>
                      <input required type="datetime-local" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formTx.dataTransacao} onChange={e => setFormTx({...formTx, dataTransacao: e.target.value})} />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                      <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formTx.descricao} onChange={e => setFormTx({...formTx, descricao: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                      <input required type="number" step="0.01" min="0.01" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formTx.valor} onChange={e => setFormTx({...formTx, valor: e.target.value})} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                      {novaCategoriaMode === 'tx' ? (
                        <div className="flex gap-1">
                          <input type="text" autoFocus placeholder="Nome da nova categoria..." className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 outline-none text-sm" value={novaCategoriaNome} onChange={e => setNovaCategoriaNome(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCriarCategoria(formTx.tipo as 'ENTRADA' | 'SAIDA'); } }} />
                          <button type="button" onClick={() => handleCriarCategoria(formTx.tipo as 'ENTRADA' | 'SAIDA')} className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700">OK</button>
                          <button type="button" onClick={() => { setNovaCategoriaMode(null); setNovaCategoriaNome(''); }} className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">✕</button>
                        </div>
                      ) : (
                        <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none bg-white" value={formTx.categoria} onChange={e => {
                          if (e.target.value === '__NOVA__') {
                            setNovaCategoriaMode('tx');
                            setNovaCategoriaNome('');
                          } else {
                            setFormTx({...formTx, categoria: e.target.value});
                          }
                        }}>
                          <option value="">Selecione...</option>
                          {(() => {
                            const padrao = categories.filter(c => c.tipo === formTx.tipo && c.isDefault);
                            const personalizadas = categories.filter(c => c.tipo === formTx.tipo && !c.isDefault);
                            return (
                              <>
                                {padrao.length > 0 && (
                                  <optgroup label="─ Padrão ─">
                                    {padrao.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                  </optgroup>
                                )}
                                {personalizadas.length > 0 && (
                                  <optgroup label="─ Personalizadas ─">
                                    {personalizadas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                  </optgroup>
                                )}
                                <option disabled>──────────</option>
                                <option value="__NOVA__" className="text-brand-600 font-medium">✚ Criar nova categoria...</option>
                              </>
                            );
                          })()}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contato (Opcional)</label>
                      {tipoLancamento === 'RECEITA' ? (
                        <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formTx.customerId} onChange={e => setFormTx({...formTx, customerId: e.target.value})}>
                          <option value="">Selecione o Cliente...</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.nomeCompleto}</option>)}
                        </select>
                      ) : (
                        <input type="text" placeholder="Nome do Fornecedor..." className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formTx.fornecedor} onChange={e => setFormTx({...formTx, fornecedor: e.target.value})} />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante</label>
                      <input type="file" accept="image/*,.pdf" className="w-full px-2 py-1.5 border rounded-lg text-sm" onChange={e => setFormTx({...formTx, comprovante: e.target.files?.[0] || null})} />
                    </div>
                  </div>

                  {!formTx.id && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" checked={formTx.isParcelado} onChange={e => setFormTx({...formTx, isParcelado: e.target.checked})} />
                        Lançamento Parcelado / Recorrente
                      </label>
                      
                      {formTx.isParcelado && (
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas</label>
                            <input type="number" min="2" max="120" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={formTx.numeroParcelas} onChange={e => setFormTx({...formTx, numeroParcelas: Number(e.target.value)})} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Frequência</label>
                            <select className="w-full px-3 py-1.5 border rounded-lg text-sm" value={formTx.frequencia} onChange={e => setFormTx({...formTx, frequencia: e.target.value})}>
                              <option value="MENSAL">Mensal</option>
                              <option value="QUINZENAL">Quinzenal</option>
                              <option value="SEMANAL">Semanal</option>
                            </select>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <input type="checkbox" id="firstPaid" className="w-4 h-4 rounded border-gray-300 text-indigo-600" checked={formTx.isFirstPaid} onChange={e => setFormTx({...formTx, isFirstPaid: e.target.checked})} />
                            <label htmlFor="firstPaid" className="text-xs font-medium text-gray-700 cursor-pointer">
                              A 1ª parcela ({formTx.dataTransacao ? new Date(formTx.dataTransacao).toLocaleDateString() : 'hoje'}) já está paga?
                            </label>
                          </div>
                          <div className="col-span-2 text-xs text-gray-500 mt-1">
                            O valor inserido de <b>R$ {formTx.valor || '0,00'}</b> será o valor de <b>cada parcela</b>.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Carteira de Origem/Destino</label>
                    <select required className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none bg-gray-50" value={formTx.walletId} onChange={e => setFormTx({...formTx, walletId: e.target.value})}>
                      <option value="">Selecione...</option>
                      {wallets.map(w => <option key={w.id} value={w.id}>{w.nome}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* ─── CAMPOS: CONTA A PAGAR ─── */}
              {tipoLancamento === 'CONTA_PAGAR' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" placeholder="Ex: Aluguel, compra de estoque..." value={formPayable.descricao} onChange={e => setFormPayable({...formPayable, descricao: e.target.value})} />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento</label>
                      <input required type="date" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formPayable.dataVencimento} onChange={e => setFormPayable({...formPayable, dataVencimento: e.target.value})} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                      <input required type="number" step="0.01" min="0.01" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formPayable.valor} onChange={e => setFormPayable({...formPayable, valor: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor (Opcional)</label>
                      <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formPayable.fornecedor} onChange={e => setFormPayable({...formPayable, fornecedor: e.target.value})} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                      {novaCategoriaMode === 'tx' ? (
                        <div className="flex gap-1">
                          <input type="text" autoFocus placeholder="Nome da nova categoria..." className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 outline-none text-sm" value={novaCategoriaNome} onChange={e => setNovaCategoriaNome(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCriarCategoria('SAIDA'); } }} />
                          <button type="button" onClick={() => handleCriarCategoria('SAIDA')} className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700">OK</button>
                          <button type="button" onClick={() => { setNovaCategoriaMode(null); setNovaCategoriaNome(''); }} className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">✕</button>
                        </div>
                      ) : (
                        <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none bg-white" value={formPayable.categoria} onChange={e => {
                          if (e.target.value === '__NOVA__') {
                            setNovaCategoriaMode('tx');
                            setNovaCategoriaNome('');
                          } else {
                            setFormPayable({...formPayable, categoria: e.target.value});
                          }
                        }}>
                          <option value="">Selecione...</option>
                          {(() => {
                            const padrao = categories.filter(c => c.tipo === 'SAIDA' && c.isDefault);
                            const personalizadas = categories.filter(c => c.tipo === 'SAIDA' && !c.isDefault);
                            return (
                              <>
                                {padrao.length > 0 && (
                                  <optgroup label="─ Padrão ─">
                                    {padrao.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                  </optgroup>
                                )}
                                {personalizadas.length > 0 && (
                                  <optgroup label="─ Personalizadas ─">
                                    {personalizadas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                  </optgroup>
                                )}
                                <option disabled>──────────</option>
                                <option value="__NOVA__" className="text-brand-600 font-medium">✚ Criar nova categoria...</option>
                              </>
                            );
                          })()}
                        </select>
                      )}
                    </div>
                  </div>

                  {!formPayable.id && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" checked={formPayable.isParcelado} onChange={e => setFormPayable({...formPayable, isParcelado: e.target.checked})} />
                        Conta Parcelada
                      </label>

                      {formPayable.isParcelado && (
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas</label>
                            <input type="number" min="2" max="120" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={formPayable.numeroParcelas} onChange={e => setFormPayable({...formPayable, numeroParcelas: Number(e.target.value)})} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Frequência</label>
                            <select className="w-full px-3 py-1.5 border rounded-lg text-sm" value={formPayable.frequencia} onChange={e => setFormPayable({...formPayable, frequencia: e.target.value})}>
                              <option value="MENSAL">Mensal</option>
                              <option value="QUINZENAL">Quinzenal</option>
                              <option value="SEMANAL">Semanal</option>
                            </select>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <input type="checkbox" id="firstPaidPayable" className="w-4 h-4 rounded border-gray-300 text-indigo-600" checked={formPayable.isFirstPaid} onChange={e => setFormPayable({...formPayable, isFirstPaid: e.target.checked})} />
                            <label htmlFor="firstPaidPayable" className="text-xs font-medium text-gray-700 cursor-pointer">
                              A 1ª parcela ({formPayable.dataVencimento ? new Date(formPayable.dataVencimento + 'T12:00:00').toLocaleDateString() : 'hoje'}) já está paga?
                            </label>
                          </div>
                          <div className="col-span-2 text-xs text-gray-500 mt-1">
                            Valor total da conta: <b>{formatBRL(Number(formPayable.valor || 0))}</b>. Serão <b>{formPayable.numeroParcelas}x</b> de <b>{formatBRL(Number(formPayable.valor || 0) / formPayable.numeroParcelas)}</b> cada.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setModalLancamento(false)} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className={`flex-1 py-2 font-bold rounded-lg shadow-md ${tipoLancamento === 'CONTA_PAGAR' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-brand-600 hover:bg-brand-700'} text-white`}>
                  {tipoLancamento === 'CONTA_PAGAR' ? 'Salvar Conta' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DAR BAIXA */}
      {modalBaixa.isOpen && modalBaixa.rec && (() => {
        const rec = modalBaixa.rec;
        const tp = rec.valorJaPago ?? 0;
        const sr = rec.saldoRestante ?? (Number(rec.valorParcela) - tp);
        const maxPagamento = Math.max(0, sr);
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Confirmar Pagamento</h2>
              <p className="text-gray-600 mb-4">
                Cliente: <strong>{rec.customer?.nomeCompleto || 'Cliente'}</strong><br/>
                Parcela: {rec.numeroParcela}/{rec.totalParcelas}<br/>
                Valor Original: {formatBRL(Number(rec.valorParcela))}<br/>
                Já Pago: {formatBRL(Number(tp))}<br/>
                Saldo Restante: <strong>{formatBRL(Number(sr))}</strong>
              </p>
            <form onSubmit={handleBaixa} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Recebido (R$)</label>
                <input required type="number" step="0.01" min="0.01" placeholder="Digite o valor a pagar" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formBaixa.valorPago} onChange={e => {
                  const raw = e.target.value;
                  if (raw !== '' && Number(raw) > maxPagamento) {
                    setFormBaixa({...formBaixa, valorPago: maxPagamento.toFixed(2)});
                  } else {
                    setFormBaixa({...formBaixa, valorPago: raw});
                  }
                }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entrar o dinheiro em qual Carteira?</label>
                <select required className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formBaixa.walletId} onChange={e => setFormBaixa({...formBaixa, walletId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.nome}</option>)}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setModalBaixa({ isOpen: false })} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md">Confirmar Baixa</button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}


      {/* MODAL PAGAR CONTA */}
      {modalBaixaPagar.isOpen && modalBaixaPagar.payable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Confirmar Pagamento</h2>
            <p className="text-gray-600 mb-4">
              Deseja registrar o pagamento de <strong>{modalBaixaPagar.payable.descricao}</strong> no valor de {formatBRL(Number(modalBaixaPagar.payable.valor))}?
            </p>
            <form onSubmit={handleBaixaPagar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sair o dinheiro de qual Carteira?</label>
                <select required className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formBaixaPagar.walletId} onChange={e => setFormBaixaPagar({...formBaixaPagar, walletId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.nome}</option>)}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setModalBaixaPagar({ isOpen: false })} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md">Confirmar Pagamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE COBRANÇA WHATSAPP */}
      {modalCobranca && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Cobrança Rápida via WhatsApp
              </h2>
              <button onClick={() => setModalCobranca(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              {devedoresAtrasados.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum devedor encontrado.</p>
              ) : (
                devedoresAtrasados.map((dev, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="mb-2 sm:mb-0">
                      <p className="font-bold text-gray-800">{dev.nome}</p>
                      <p className="text-sm text-gray-500">Atraso: <span className="text-red-500 font-semibold">{dev.diasAtraso} dias</span></p>
                      <p className="text-sm font-semibold text-gray-700">{formatBRL(Number(dev.valor))}</p>
                    </div>
                    <button
                      onClick={() => handleCobrancaWhatsapp(dev)}
                      className="bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors w-full sm:w-auto justify-center"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.383 0 0 5.383 0 12.031c0 2.124.552 4.161 1.603 5.975L.01 24l6.143-1.611A11.96 11.96 0 0012.031 24c6.648 0 12.031-5.383 12.031-12.031C24.062 5.383 18.679 0 12.031 0zM17.5 16.5c-.378 1.066-1.928 1.956-3.085 2.112-1.047.142-2.39-.089-4.808-1.092-2.91-1.21-4.795-4.22-4.945-4.422-.15-.202-1.182-1.572-1.182-2.998 0-1.426.745-2.128 1.018-2.428.273-.3.593-.375.792-.375.2 0 .4.002.578.01.196.009.46-.076.716.544.3.722.955 2.336 1.04 2.508.085.172.142.375.04.578-.1.202-.15.328-.3.504-.15.176-.312.372-.45.517-.152.16-.309.336-.135.638.174.302.775 1.282 1.666 2.077 1.15.103 2.155.674 2.474.836.319.162.505.14.693-.075.188-.215.81-1.037 1.026-1.393.216-.356.432-.296.72-.188.288.108 1.82.858 2.132 1.015.312.158.52.235.596.368.076.133.076.772-.302 1.838z"/></svg>
                      Cobrar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* MODAL IMPORTAÇÃO */}
      {modalImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Importar Planilha</h2>
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
              <button onClick={() => setModalImport(false)} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-md" onClick={() => { setModalImport(false); toast.success('Upload iniciado! (Simulado)'); }}>Iniciar Importação</button>
            </div>
          </div>
        </div>
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

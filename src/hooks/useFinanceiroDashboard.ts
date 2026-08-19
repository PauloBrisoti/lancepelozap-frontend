import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { useStoreDashboardConfig } from '../lib/query';
import type { Sale } from '../types/api';

export interface Wallet {
  id: string;
  nome: string;
  tipo: string;
  saldoAtual: number;
}

export interface Transaction {
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

export interface Receivable {
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

export interface Customer {
  id: string;
  nomeCompleto: string;
}

export interface PaymentMethodEntry {
  method: string;
  label: string;
  value: number;
}

export interface PJDashboardData {
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

export interface FinancialCategory {
  id: string;
  nome: string;
  tipo: string;
  isDefault: boolean;
}

export interface Payable {
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

interface UseFinanceiroDashboardParams {
  activeStoreId: string | null;
  activeTab: 'TRANSACOES' | 'RECEBER' | 'PAGAR' | 'DRE';
  queryParams: string;
}

export function useFinanceiroDashboard({ activeStoreId, activeTab, queryParams }: UseFinanceiroDashboardParams) {
  const [loading, setLoading] = useState(true);

  // Dados do Dashboard
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [, setSaldoProjetado] = useState(0);
  const [devedoresAtrasados, setDevedoresAtrasados] = useState<any[]>([]);
  const [totalAtrasado, setTotalAtrasado] = useState(0);

  const [, setTotalAVencer] = useState(0);

  const [, setReceitasMes] = useState(0);
  const [despesasMes, setDespesasMes] = useState(0);
  const [comissaoPagasMes, setComissaoPagasMes] = useState(0);
  const [pjData, setPjData] = useState<PJDashboardData | null>(null);

  // Dados das abas
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [dreData, setDreData] = useState<DreData | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);

  const [dashboardCards, setDashboardCards] = useState<string[] | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      const dash = await fetchApi(`/finance/dashboard${queryParams}`);
      setWallets(dash.wallets);
      setSaldoTotal(dash.saldoTotal);
      setSaldoProjetado(dash.saldoProjetado || 0);
      setDevedoresAtrasados(dash.devedoresAtrasados || []);
      setTotalAtrasado(dash.totalAtrasado);
      setTotalAVencer(dash.totalAVencer);
      setReceitasMes(dash.receitasMes || 0);
      setDespesasMes(dash.despesasMes || 0);
      setComissaoPagasMes(dash.comissaoPagasMes || 0);

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
  }, [activeTab, queryParams]);

  const storeCfg = useStoreDashboardConfig(activeStoreId);

  useEffect(() => {
    if (storeCfg.data?.cards) setDashboardCards(storeCfg.data.cards);
  }, [storeCfg.data]);

  useEffect(() => {
    setLoading(true);
    carregarDados();
  }, [activeTab, queryParams, activeStoreId, carregarDados]);

  return {
    loading,
    wallets,
    saldoTotal,
    devedoresAtrasados,
    totalAtrasado,
    despesasMes,
    comissaoPagasMes,
    pjData,
    transactions,
    receivables,
    payables,
    dreData,
    customers,
    categories,
    dashboardCards,
    setCategories,
    carregarDados,
  };
}

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { fetchApi } from '../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTransactionForm } from '../hooks/useTransactionForm';
import { formatBRL } from '../utils/format';

const toUTCDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
};
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} às ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
import {
  TrendingUp, TrendingDown, PiggyBank, Lightbulb,
  Wallet, Plus, Trash2, X, ArrowUpCircle, ArrowDownCircle, Pencil, ChevronLeft, ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'react-hot-toast';
import { SkeletonTable } from '../components/LoadingSkeleton';
import { Modal } from '../components/Modal';

interface Category {
  id: string; nome: string; tipo: string; icone: string; cor: string;
}
interface Wallet {
  id: string; nome: string; icone: string;
}
interface Transaction {
  id: string; categoryId: string; walletId?: string; tipo: string; valor: number; descricao?: string; data: string; recorrente: boolean;
  dataCompetencia?: string; parcelas?: number; observacoes?: string;
  createdAt: string; updatedAt: string;
  category: { id: string; nome: string; icone: string; cor: string };
  wallet?: { id: string; nome: string; icone: string };
}
interface Budget {
  id: string; categoryId: string; mes: number; ano: number; valorLimite: number; valorGasto?: number; percentual?: number; estourou?: boolean;
  category: { id: string; nome: string; icone: string; cor: string };
}
interface DashboardData {
  ganhos: number; gastos: number; sobraMes: number;
  variacaoGanhos: number; variacaoGastos: number;
  saudeFinanceira: string; categoriasEstouradas: number; proporcaoGastos: number;
  gastosPorCategoria: { categoryId: string; nome: string; icone: string; cor: string; gasto: number; limite: number; estourou: boolean }[];
  budgets: Budget[];
  ultimasTransacoes: Transaction[];
  monthlyBudgetLimit: number;
  saldoAcumulado: number;
  saldosAcumuladosPorConta: { id: string; nome: string; saldo: number; isCreditCard?: boolean }[];
}
interface AIAnalysis {
  insights: string[]; insightsGanhos?: string[]; sobraMes: number;
  dicaInvestimento: { reservaEmergencia: number; curtoPrazo: number; longoPrazo: number; mensagem: string } | null;
  gastosPorCategoria: { nome: string; icone: string; atual: number; passado: number }[];
}

const HEALTH = {
  SAUDAVEL: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: '🟢', label: 'Saudável' },
  ATENCAO: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: '🟡', label: 'Atenção' },
  PERDA_DE_CONTROLE: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: '🔴', label: 'Perda de Controle' },
};

const CHART_COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

function cycleLabel(mes: number, ano: number, startDay: number): string {
  if (startDay === 1) {
    return format(new Date(ano, mes - 1), "MMMM 'de' yyyy", { locale: ptBR });
  }
  const start = new Date(ano, mes - 1, startDay);
  const end = new Date(ano, mes, startDay - 1);
  return `${startDay}/${format(start, 'MMM', { locale: ptBR })} - ${end.getDate()}/${format(end, 'MMM', { locale: ptBR })}`;
}

function parseBRLraw(v: string): number {
  const cleaned = v.replace(/[^0-9,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function PersonalDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'dashboard' | 'transactions' | 'budgets'>('dashboard');
  const formTx = useTransactionForm();
  const [budgetForm, setBudgetForm] = useState<Record<string, string>>({});
  const [focusCategoryId, setFocusCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catForm, setCatForm] = useState({ nome: '', tipo: 'SAIDA' as 'ENTRADA' | 'SAIDA', icone: '💵' });
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPeriod = searchParams.get('period');
  let initialMes = new Date().getMonth() + 1;
  let initialAno = new Date().getFullYear();
  if (urlPeriod && /^\d{4}-\d{2}$/.test(urlPeriod)) {
    const [y, m] = urlPeriod.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) { initialMes = m; initialAno = y; }
  }
  const [mesFilter, setMesFilter] = useState(initialMes);
  const [anoFilter, setAnoFilter] = useState(initialAno);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [cycleDay, setCycleDay] = useState(() => {
    const saved = localStorage.getItem('pf_cycle_day');
    return saved ? Number(saved) : 1;
  });
  const [cycleBudgetLimit, setCycleBudgetLimit] = useState(0);
  const [searchTx, setSearchTx] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);

  function goMonth(delta: number) {
    let m = mesFilter + delta;
    let a = anoFilter;
    if (m < 1) { m = 12; a--; }
    if (m > 12) { m = 1; a++; }
    setMesFilter(m);
    setAnoFilter(a);
    setSearchParams({ period: `${a}-${String(m).padStart(2, '0')}` }, { replace: true });
  }

  useEffect(() => {
    fetchApi<{ billingCycleStartDay: number; monthlyBudgetLimit: number }>('/personal/cycle-config')
      .then(cfg => {
        const day = cfg?.billingCycleStartDay || 1;
        setCycleDay(day);
        localStorage.setItem('pf_cycle_day', String(day));
        setCycleBudgetLimit(cfg?.monthlyBudgetLimit || 0);
        if (!urlPeriod && day > 1) {
          const today = new Date();
          if (today.getDate() < day) {
            let m = today.getMonth() - 1;
            let a = today.getFullYear();
            if (m < 0) { m = 11; a--; }
            setMesFilter(m + 1);
            setAnoFilter(a);
            setSearchParams({ period: `${a}-${String(m + 1).padStart(2, '0')}` }, { replace: true });
          }
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true));
  }, []);

  useEffect(() => {
    if (configLoaded) loadAll();
  }, [mesFilter, anoFilter, configLoaded]);

  async function loadAll() {
    setLoading(true);
    try {
      const q = `?mes=${mesFilter}&ano=${anoFilter}`;
      const results = await Promise.allSettled([
        fetchApi<DashboardData>('/personal/dashboard' + q),
        fetchApi<AIAnalysis>('/personal/ai-analysis' + q),
        fetchApi<Transaction[]>('/personal/transactions' + q),
        fetchApi<Category[]>('/personal/categories'),
        fetchApi<Wallet[]>('/personal/wallets'),
      ]);
      if (results[0].status === 'fulfilled') setDashboard(results[0].value);
      else console.error('Dashboard fetch failed', results[0].reason);
      if (results[1].status === 'fulfilled') setAnalysis(results[1].value);
      else console.error('Analysis fetch failed', results[1].reason);
      if (results[2].status === 'fulfilled') setTransactions(results[2].value);
      else console.error('Transactions fetch failed', results[2].reason);
      if (results[3].status === 'fulfilled') setCategories(results[3].value);
      else console.error('Categories fetch failed', results[3].reason);
      if (results[4].status === 'fulfilled') setWallets(results[4].value);
      else console.error('Wallets fetch failed', results[4].reason);
    } catch (err: unknown) {
      console.error('loadAll error (forçando dados zerados):', err);
      setDashboard({
        ganhos: 0, gastos: 0, sobraMes: 0,
        variacaoGanhos: 0, variacaoGastos: 0,
        saudeFinanceira: 'SAUDAVEL', categoriasEstouradas: 0, proporcaoGastos: 0,
        gastosPorCategoria: [], budgets: [], ultimasTransacoes: [],
        monthlyBudgetLimit: 0, saldoAcumulado: 0, saldosAcumuladosPorConta: [],
      });
      setAnalysis({ insights: [], insightsGanhos: [], sobraMes: 0, dicaInvestimento: null, gastosPorCategoria: [] });
      setTransactions([]); setCategories([]); setWallets([]);
    } finally {
      setLoading(false);
    }
  }

  function openEditTransaction(tx: Transaction) {
    formTx.openEdit(tx);
  }

  function openNewTransaction(tipo: 'ENTRADA' | 'SAIDA') {
    formTx.openNew(tipo);
  }

  async function handleSave() {
    const errors: string[] = [];
    if (!formTx.categoryId) errors.push('Categoria é obrigatória');
    if (!formTx.valor || parseBRLraw(formTx.valor) <= 0) errors.push('Valor deve ser maior que zero');
    if (!formTx.data) errors.push('Data é obrigatória');

    if (errors.length > 0) {
      toast.error(errors.join('. '));
      return;
    }

    setSaving(true);
    try {
      const method = formTx.editingTx ? 'PUT' : 'POST';
      const url = formTx.editingTx ? `/personal/transactions/${formTx.editingTx.id}` : '/personal/transactions';
      const body: Record<string, unknown> = {
        categoryId: formTx.categoryId,
        walletId: formTx.walletId || null,
        tipo: formTx.tipo,
        valor: parseBRLraw(formTx.valor),
        descricao: formTx.descricao,
        dataVencimento: toUTCDate(formTx.data),
      };
      await fetchApi(url, { method, body: JSON.stringify(body) });
      toast.success(formTx.editingTx ? 'Transação atualizada!' : (formTx.tipo === 'ENTRADA' ? 'Ganho registrado!' : 'Gasto registrado!'));
      formTx.close();
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar transação');
    } finally {
      setSaving(false);
    }
  }

  async function createCategory() {
    if (!catForm.nome.trim()) { toast.error('Nome da categoria é obrigatório'); return; }
    try {
      await fetchApi('/personal/categories', {
        method: 'POST',
        body: JSON.stringify(catForm),
      });
      toast.success('Categoria criada!');
      setCatForm({ nome: '', tipo: 'SAIDA', icone: '💵' });
      const cats = await fetchApi<Category[]>('/personal/categories');
      setCategories(cats);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar categoria');
    }
  }

  async function saveCycleDay() {
    if (cycleDay < 1 || cycleDay > 31) { toast.error('Dia deve ser entre 1 e 31'); return; }
    try {
      await fetchApi('/personal/cycle-config', {
        method: 'PUT',
        body: JSON.stringify({ billingCycleStartDay: cycleDay, monthlyBudgetLimit: cycleBudgetLimit }),
      });
      localStorage.setItem('pf_cycle_day', String(cycleDay));
      toast.success('Configurações salvas!');
      setShowCycleModal(false);
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  async function deleteCategory(id: string) {
    try {
      await fetchApi(`/personal/categories/${id}`, { method: 'DELETE' });
      toast.success('Categoria removida');
      const cats = await fetchApi<Category[]>('/personal/categories');
      setCategories(cats);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover categoria');
    }
  }

  async function deleteTransaction(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try {
      await fetchApi(`/personal/transactions/${id}`, { method: 'DELETE' });
      toast.success('Transação removida');
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  }

  async function saveBudget(categoryId: string) {
    const valor = budgetForm[categoryId];
    if (!valor || parseBRLraw(valor) <= 0) {
      toast.error('Informe um valor de limite válido');
      return;
    }
    try {
      const now = new Date();
      await fetchApi('/personal/budgets', {
        method: 'POST',
        body: JSON.stringify({ categoryId, mes: now.getMonth() + 1, ano: now.getFullYear(), valorLimite: parseBRLraw(valor) }),
      });
      toast.success('Orçamento salvo!');
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar orçamento');
    }
  }

  const saude = dashboard ? HEALTH[dashboard.saudeFinanceira as keyof typeof HEALTH] || HEALTH.SAUDAVEL : null;

  if (!configLoaded || loading) return <div className="p-6 space-y-4"><SkeletonTable rows={8} cols={4} /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finanças Pessoais</h1>
          <p className="text-gray-500 mt-1">Gerencie seus Ganhos, Gastos e Sobra do Mês</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
            <button onClick={() => goMonth(-1)} className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-800 min-w-[150px] text-center select-none">
              {cycleLabel(mesFilter, anoFilter, cycleDay)}
            </span>
            <button onClick={() => goMonth(1)} className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setShowCycleModal(true)} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 shadow-sm" title="Início do Mês Financeiro">
            ⚙️
          </button>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'dashboard' ? 'bg-brand-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Dashboard</button>
          <button onClick={() => setTab('transactions')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'transactions' ? 'bg-brand-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Transações</button>
          <button onClick={() => setTab('budgets')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'budgets' ? 'bg-brand-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Orçamentos</button>
          <button onClick={() => setShowCategoryModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1.5">
            ⚙️ Categorias
          </button>
        </div>
      </div>

      {/* ==================== DASHBOARD ==================== */}
      {tab === 'dashboard' && dashboard && (
        <>
          {saude && dashboard.saudeFinanceira !== 'SAUDAVEL' && (
            <div className={`p-4 md:p-6 rounded-xl border-2 ${saude.bg}`}>
              <div className="flex items-start gap-4">
                <span className="text-3xl">{saude.icon}</span>
                <div className="flex-1">
                  <p className={`text-lg font-bold ${saude.text}`}>{saude.label} Financeiro</p>
                  {(() => {
                    const pct = dashboard.proporcaoGastos;
                    const pctGlobal = dashboard.monthlyBudgetLimit > 0
                      ? Math.round((dashboard.gastos / dashboard.monthlyBudgetLimit) * 100)
                      : 0;
                    if (dashboard.saudeFinanceira === 'PERDA_DE_CONTROLE') {
                      return <div className="text-sm text-gray-600 mt-1 space-y-3">
                        <p>
                          Suas despesas ({formatBRL(dashboard.gastos)}) representam {pct}% da sua renda de {formatBRL(dashboard.ganhos)}.
                          {dashboard.monthlyBudgetLimit > 0 && <> Você já consumiu {pctGlobal}% do seu limite global de {formatBRL(dashboard.monthlyBudgetLimit)}.</>}
                        </p>
                        <button onClick={() => setTab('transactions')} className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors">
                          📊 Revisar Minhas Despesas
                        </button>
                      </div>;
                    }
                    return <p className="text-sm text-gray-600 mt-1">
                      Seus gastos ({formatBRL(dashboard.gastos)}) já atingiram {pct}% da sua renda.
                      {dashboard.monthlyBudgetLimit > 0
                        ? <> Seu limite global é de {formatBRL(dashboard.monthlyBudgetLimit)} e você já consumiu {pctGlobal}%.</>
                        : <> Defina um limite global de gastos na engrenagem ⚙️.</>}
                      {' '}Acompanhe de perto.
                    </p>;
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ganhos</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{formatBRL(dashboard.ganhos)}</p>
              {dashboard.variacaoGanhos !== 0 && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${dashboard.variacaoGanhos > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {dashboard.variacaoGanhos > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(dashboard.variacaoGanhos)}% vs mês passado
                </p>
              )}
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownCircle className="w-5 h-5 text-red-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gastos</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{formatBRL(dashboard.gastos)}</p>
              {dashboard.variacaoGastos !== 0 && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${dashboard.variacaoGastos > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {dashboard.variacaoGastos > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(dashboard.variacaoGastos)}% vs mês passado
                </p>
              )}
            </div>
            <div className={`p-5 rounded-xl shadow-sm border-2 ${dashboard.sobraMes >= 0 ? 'bg-white border-gray-200' : 'bg-red-50 border-red-300'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-brand-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sobra do Mês</span>
              </div>
              <p className={`text-2xl font-bold ${dashboard.sobraMes >= 0 ? 'text-gray-900' : 'text-red-700'}`}>
                {formatBRL(dashboard.sobraMes)}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saldo em Conta</span>
              </div>
              <p className={`text-2xl font-bold ${dashboard.saldoAcumulado >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatBRL(dashboard.saldoAcumulado)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Desde o início até o fim do ciclo</p>
            </div>
          </div>

          {/* Saldos por Conta (acumulado até o fim do ciclo) */}
          {dashboard.saldosAcumuladosPorConta && dashboard.saldosAcumuladosPorConta.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">🏦 Saldos por Conta</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboard.saldosAcumuladosPorConta.map(w => (
                  <div key={w.id} className={`p-4 rounded-lg border ${w.isCreditCard ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className={`text-xs font-medium mb-1 ${w.isCreditCard ? 'text-red-600' : 'text-gray-500'}`}>
                      {w.isCreditCard ? '💳 Fatura - ' : ''}{w.nome}
                    </p>
                    <p className={`text-lg font-bold ${w.isCreditCard ? 'text-red-600' : w.saldo >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      {formatBRL(w.saldo)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gráficos lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Termômetro: Ganhos vs Gastos */}
            {(dashboard.ganhos > 0 || dashboard.gastos > 0) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">📊 Termômetro do Mês</h3>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={[{ name: 'Mês', Ganhos: dashboard.ganhos, Gastos: dashboard.gastos }]} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" hide />
                    <Bar dataKey="Ganhos" fill="#10b981" radius={[0, 4, 4, 0]} barSize={28} />
                    <Bar dataKey="Gastos" fill={dashboard.gastos > dashboard.ganhos ? '#ef4444' : '#f59e0b'} radius={[0, 4, 4, 0]} barSize={28} />
                    <Tooltip formatter={(v) => formatBRL(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Raio-X das Despesas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">🍩 Raio-X das Despesas</h3>
              {dashboard.gastosPorCategoria.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">Nenhum gasto registrado este mês.</p>
              ) : (() => {
                const sorted = [...dashboard.gastosPorCategoria].sort((a, b) => b.gasto - a.gasto);
                const top5 = sorted.slice(0, 5);
                const outros = sorted.slice(5);
                const outrosTotal = outros.reduce((s, c) => s + c.gasto, 0);
                const pieData = [
                  ...top5.map(c => ({ name: c.nome, value: c.gasto, icone: c.icone })),
                  ...(outrosTotal > 0 ? [{ name: 'Outros', value: outrosTotal, icone: '📦' }] : []),
                ];
                const total = dashboard.gastosPorCategoria.reduce((s, c) => s + c.gasto, 0);
                return (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                        dataKey="value" paddingAngle={3}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={i < 5 ? CHART_COLORS[i % CHART_COLORS.length] : '#9ca3af'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => {
                          const v = Number(value);
                          const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
                          return [`${formatBRL(v)} (${pct}%)`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 flex-1 w-full">
                    {pieData.map((cat, i) => {
                      const pct = total > 0 ? ((cat.value / total) * 100).toFixed(1) : '0.0';
                      return (
                        <div key={cat.name} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: i < 5 ? CHART_COLORS[i % CHART_COLORS.length] : '#9ca3af' }} />
                          <span className="text-gray-500 min-w-0 flex-1 truncate">{cat.icone} {cat.name}</span>
                          <span className="font-semibold text-gray-900 text-right">{formatBRL(cat.value)}</span>
                          <span className="text-gray-400 w-9 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })()}
            </div>
          </div>

          {/* Insights de Otimização */}
          {analysis && analysis.insights.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Insights de Otimização</h3>
              </div>
              <ul className="space-y-3">
                {analysis.insights.map((insight, i) => {
                  const catName = insight.match(/orçamento de ([^,.]+)/i)?.[1] || insight.match(/gastos com ([^.]+)/i)?.[1];
                  const matched = catName && categories.find(c => catName.toLowerCase().includes(c.nome.toLowerCase()) || c.nome.toLowerCase().includes(catName.toLowerCase()));
                  return (
                    <li key={i} className="text-sm text-gray-700 p-3 bg-white/60 rounded-lg space-y-2">
                      <span className="leading-relaxed block">{insight}</span>
                      {matched && (
                        <button onClick={() => { setFocusCategoryId(matched.id); setTab('budgets'); }} className="text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-lg transition-colors">
                          🎯 Criar Limite de Orçamento para {matched.nome}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Insights de Ganhos */}
          {analysis && analysis.insightsGanhos && analysis.insightsGanhos.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-sm border border-emerald-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">Insights de Ganhos</h3>
              </div>
              <ul className="space-y-3">
                {analysis.insightsGanhos.map((insight, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-3 p-2 bg-white/60 rounded-lg">
                    <span className="leading-relaxed">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hub de Investimento */}
          {analysis?.dicaInvestimento && (
            <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <PiggyBank className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">Sugestão de Alocação</h3>
              </div>
              <p className="text-sm text-gray-600 mb-5">{analysis.dicaInvestimento.mensagem}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-medium mb-1">🛡️ Reserva de Emergência</p>
                  <p className="text-xl font-bold text-emerald-700">{formatBRL(analysis.dicaInvestimento.reservaEmergencia)}</p>
                  <div className="mt-2 w-full bg-emerald-200 rounded-full h-2"><div className="w-1/2 h-full bg-emerald-500 rounded-full" /></div>
                  <p className="text-xs text-emerald-500 mt-1">50%</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium mb-1">🎯 Metas Curto Prazo</p>
                  <p className="text-xl font-bold text-blue-700">{formatBRL(analysis.dicaInvestimento.curtoPrazo)}</p>
                  <div className="mt-2 w-full bg-blue-200 rounded-full h-2"><div className="w-[30%] h-full bg-blue-500 rounded-full" /></div>
                  <p className="text-xs text-blue-500 mt-1">30%</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 font-medium mb-1">🚀 Aportes Longo Prazo</p>
                  <p className="text-xl font-bold text-purple-700">{formatBRL(analysis.dicaInvestimento.longoPrazo)}</p>
                  <div className="mt-2 w-full bg-purple-200 rounded-full h-2"><div className="w-1/5 h-full bg-purple-500 rounded-full" /></div>
                  <p className="text-xs text-purple-500 mt-1">20%</p>
                </div>
              </div>
            </div>
          )}

          {/* Últimas Transações */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-semibold text-gray-900">Últimas Transações</h3>
              <div className="flex gap-2">
                <button onClick={() => openNewTransaction('ENTRADA')} className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Novo Ganho
                </button>
                <button onClick={() => openNewTransaction('SAIDA')} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Novo Gasto
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {dashboard.ultimasTransacoes.slice(0, 5).length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Nenhuma transação neste mês.</div>
              ) : dashboard.ultimasTransacoes.slice(0, 5).map(tx => (
                <div key={tx.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">{tx.category.icone}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.descricao || tx.category.nome}</p>
                      <p className="text-xs text-gray-400">
                        {fmtDate(tx.data)}
                        {new Date(tx.updatedAt) > new Date(tx.createdAt) && <span className="text-gray-300 ml-1">(Editado em: {fmtDate(tx.updatedAt)})</span>}
                        {tx.wallet && <span className="ml-2 text-gray-300">• {tx.wallet.icone} {tx.wallet.nome}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`font-semibold text-sm ${tx.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.tipo === 'ENTRADA' ? '+' : '-'} {formatBRL(Number(tx.valor))}
                    </span>
                    <button onClick={() => openEditTransaction(tx)} className="text-gray-300 hover:text-brand-600 transition-colors p-1">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteTransaction(tx.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {dashboard.ultimasTransacoes.length > 5 && (
              <div className="px-6 py-3 border-t border-gray-100 text-center">
                <button onClick={() => setTab('transactions')} className="text-sm text-brand-600 hover:text-brand-800 font-medium">
                  Ver todas as {dashboard.ultimasTransacoes.length} transações →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== TRANSAÇÕES ==================== */}
      {tab === 'transactions' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-semibold text-gray-900">Todas as Transações</h3>
            <div className="flex gap-2">
              <button onClick={() => openNewTransaction('ENTRADA')} className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Novo Ganho
              </button>
              <button onClick={() => openNewTransaction('SAIDA')} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Novo Gasto
              </button>
            </div>
          </div>
          {/* Filtros */}
          <div className="px-6 py-3 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text" placeholder="🔍 Buscar por descrição..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                value={searchTx} onChange={e => setSearchTx(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="">Todas as categorias</option>
                {categories.filter(c => c.tipo === 'SAIDA' || c.tipo === 'ENTRADA').map(c => (
                  <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {(() => {
              const q = searchTx.toLowerCase().trim();
              const filtered = transactions.filter(tx => {
                if (q && !(tx.descricao || tx.category.nome).toLowerCase().includes(q)) return false;
                if (filterCategory && tx.categoryId !== filterCategory) return false;
                return true;
              });
              const hasFilter = !!q || !!filterCategory;
              return (
                <>
                  {hasFilter && (
                    <div className="px-6 py-2 bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                      Mostrando {filtered.length} transação{filtered.length !== 1 ? 'es' : ''}
                      {filterCategory && <> de {categories.find(c => c.id === filterCategory)?.nome || ''}</>}
                      {q && <> com "{searchTx}"</>}
                    </div>
                  )}
                  {filtered.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-gray-400 text-sm mb-4">
                        {hasFilter ? 'Nenhuma transação encontrada com esses filtros.' : 'Nenhuma transação registrada este mês.'}
                      </p>
                      {!hasFilter && (
                        <button onClick={() => openNewTransaction('SAIDA')} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                          <Plus className="w-4 h-4 inline mr-1" /> Adicionar Primeira
                        </button>
                      )}
                    </div>
                  ) : filtered.map(tx => (
                    <div key={tx.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg shrink-0">{tx.category.icone}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{tx.descricao || tx.category.nome}</p>
                          <p className="text-xs text-gray-400">
                            {fmtDate(tx.data)}
                            {new Date(tx.updatedAt) > new Date(tx.createdAt) && <span className="text-gray-300 ml-1">(Editado em: {fmtDate(tx.updatedAt)})</span>}
                            {tx.wallet && <span className="ml-2 text-gray-300">• {tx.wallet.icone} {tx.wallet.nome}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className={`font-semibold text-sm ${tx.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.tipo === 'ENTRADA' ? '+' : '-'} {formatBRL(Number(tx.valor))}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditTransaction(tx)} className="text-gray-300 hover:text-brand-600 transition-colors p-1">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteTransaction(tx.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==================== ORÇAMENTOS ==================== */}
      {tab === 'budgets' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Orçamentos por Categoria</h3>
            <p className="text-xs text-gray-400 mt-1">Defina limites mensais para controlar seus gastos.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {categories.filter(c => c.tipo === 'SAIDA').length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Nenhuma categoria de gasto disponível.</div>
            ) : categories.filter(c => c.tipo === 'SAIDA').map(cat => {
              const budget = dashboard?.budgets?.find(b => b.categoryId === cat.id);
              const isFocused = focusCategoryId === cat.id;
              if (isFocused) setTimeout(() => document.getElementById(`budget-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
              return (
                <div key={cat.id} id={`budget-${cat.id}`} className={`px-6 py-4 flex items-center justify-between gap-4 transition-colors ${isFocused ? 'bg-brand-50 border-l-4 border-l-brand-500' : ''}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">{cat.icone}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{cat.nome}</p>
                      {budget && (
                        <p className={`text-xs ${budget.estourou ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          Gasto: {formatBRL(Number(budget.valorGasto || 0))} / Limite: {formatBRL(Number(budget.valorLimite))}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={budget ? formatBRL(Number(budget.valorLimite)) : 'R$ 0,00'}
                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                      value={budgetForm[cat.id]?.replace('R$ ', '') || ''}
                      onChange={e => setBudgetForm({ ...budgetForm, [cat.id]: e.target.value })}
                    />
                    <button onClick={() => saveBudget(cat.id)} className="px-3 py-2 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                      {budget ? 'Atualizar' : 'Definir'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== MODAL NOVA TRANSAÇÃO ==================== */}
      {formTx.open && (
        <Modal open={formTx.open} onClose={formTx.close} size="sm" className="shadow-2xl overflow-hidden">
          {/* Header */}
            <div className={`px-6 py-5 flex justify-between items-center ${formTx.tipo === 'ENTRADA' ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3">
                {formTx.tipo === 'ENTRADA'
                  ? <ArrowUpCircle className="w-6 h-6 text-emerald-600" />
                  : <ArrowDownCircle className="w-6 h-6 text-red-600" />
                }
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {formTx.editingTx ? 'Editar Transação' : (formTx.tipo === 'ENTRADA' ? 'Novo Ganho' : 'Novo Gasto')}
                  </h3>
                  <p className="text-xs text-gray-500">{formTx.editingTx ? 'Corrija os dados da transação' : 'Registre uma movimentação financeira'}</p>
                </div>
              </div>
              <button onClick={() => formTx.close()} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">
              {/* Tipo selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => formTx.setTipo('ENTRADA')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    formTx.tipo === 'ENTRADA'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4 inline mr-1.5" /> Ganho
                </button>
                <button
                  onClick={() => formTx.setTipo('SAIDA')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    formTx.tipo === 'SAIDA'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4 inline mr-1.5" /> Gasto
                </button>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                <select
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  value={formTx.categoryId}
                  onChange={e => {
                    if (e.target.value === '__new__') {
                      setShowCategoryModal(true);
                      setCatForm(prev => ({ ...prev, tipo: formTx.tipo }));
                      formTx.setField('categoryId', '');
                    } else {
                      formTx.setField('categoryId', e.target.value);
                    }
                  }}
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.filter(c => c.tipo === formTx.tipo).map(c => (
                    <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                  ))}
                  <option value="__new__" className="text-brand-600 font-medium border-t border-gray-200">➕ Criar Nova Categoria</option>
                </select>
              </div>

              {/* Conta/Carteira */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Conta de Origem/Destino</label>
                <select
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  value={formTx.walletId}
                  onChange={e => formTx.setField('walletId', e.target.value)}
                >
                  <option value="">Selecione uma conta</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.icone} {w.nome}</option>
                  ))}
                </select>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-lg font-bold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    placeholder="0,00"
                    value={formTx.valor}
                    onChange={e => formTx.setField('valor', e.target.value)}
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder={formTx.tipo === 'ENTRADA' ? 'Ex: Salário mensal' : 'Ex: Compras do mês'}
                  value={formTx.descricao}
                  onChange={e => formTx.setField('descricao', e.target.value)}
                  maxLength={120}
                />
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    value={formTx.data}
                    onChange={e => formTx.setField('data', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Hora</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    value={formTx.hora}
                    onChange={e => formTx.setField('hora', e.target.value)}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all ${
                  formTx.tipo === 'ENTRADA'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saving ? 'Salvando...' : `Confirmar ${formTx.tipo === 'ENTRADA' ? 'Ganho' : 'Gasto'}`}
              </button>
            </div>
        </Modal>
      )}

      {/* ==================== MODAL CICLO FINANCEIRO ==================== */}
      {showCycleModal && (
        <Modal open={showCycleModal} onClose={() => setShowCycleModal(false)} size="sm" className="shadow-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">⚙️ Início do Mês Financeiro</h3>
                <p className="text-xs text-gray-500 mt-0.5">Seu ciclo pessoal de faturamento</p>
              </div>
              <button onClick={() => setShowCycleModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Se o seu salário cai todo dia 15, defina o início do ciclo como <strong>15</strong>. O mês "Julho" passará a mostrar dados de <strong>15/Jun até 14/Jul</strong>.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Dia de início do ciclo (1 a 31)</label>
                <input
                  type="number" min={1} max={31}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-lg font-bold text-center focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  value={cycleDay}
                  onChange={e => setCycleDay(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Limite Global de Gastos (mensal)</label>
                <input
                  type="text" inputMode="decimal"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-lg font-bold text-center focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  value={cycleBudgetLimit === 0 ? '' : formatBRL(cycleBudgetLimit).replace('R$ ', '')}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setCycleBudgetLimit(raw ? Number(raw) / 100 : 0);
                  }}
                />
              </div>
              <button onClick={saveCycleDay} className="w-full py-3.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 transition-colors">
                Salvar
              </button>
            </div>
        </Modal>
      )}

      {/* ==================== MODAL GERENCIAR CATEGORIAS ==================== */}
      {showCategoryModal && (
        <Modal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} size="md" className="shadow-2xl flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Gerenciar Categorias</h3>
                <p className="text-xs text-gray-500 mt-0.5">Crie ou remova categorias de ganhos e gastos</p>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Nova Categoria inline */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Nova Categoria</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nome"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    value={catForm.nome}
                    onChange={e => setCatForm({ ...catForm, nome: e.target.value })}
                  />
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    value={catForm.tipo}
                    onChange={e => setCatForm({ ...catForm, tipo: e.target.value as 'ENTRADA' | 'SAIDA' })}
                  >
                    <option value="SAIDA">Gasto</option>
                    <option value="ENTRADA">Ganho</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ícone (ex: 💰)"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    value={catForm.icone}
                    onChange={e => setCatForm({ ...catForm, icone: e.target.value })}
                    maxLength={2}
                  />
                  <button
                    onClick={createCategory}
                    className="flex-1 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Lista de categorias */}
              {categories.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">Nenhuma categoria cadastrada.</div>
              ) : (
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0">{cat.icone}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{cat.nome}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {cat.tipo === 'ENTRADA' ? 'Ganho' : 'Gasto'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </Modal>
      )}
    </div>
  );
}

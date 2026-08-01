import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Package, ShoppingBag, AlertCircle, PlayCircle } from 'lucide-react';
import { fetchApi } from '../lib/api';
import toast from 'react-hot-toast';
import { subDays, startOfMonth, format, subMonths, endOfMonth } from 'date-fns';
import { useApiQuery, useSuperAdminDashboard } from '../lib/query';
import { PersonalDashboardPage } from './PersonalDashboardPage';

export function DashboardPage() {
  const { user, activeWorkspace, activeStoreId, loading: authLoading } = useAuth();
  const [dateFilter, setDateFilter] = useState('THIS_MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Calcula parâmetros de data (executa antes de qualquer early return para manter consistência de hooks)
  const today = new Date();
  let start = '';
  let end = '';
  if (dateFilter === 'TODAY') {
    start = format(today, 'yyyy-MM-dd');
    end = format(today, 'yyyy-MM-dd');
  } else if (dateFilter === 'LAST_7_DAYS') {
    start = format(subDays(today, 7), 'yyyy-MM-dd');
    end = format(today, 'yyyy-MM-dd');
  } else if (dateFilter === 'THIS_MONTH') {
    start = format(startOfMonth(today), 'yyyy-MM-dd');
    end = format(today, 'yyyy-MM-dd');
  } else if (dateFilter === 'LAST_MONTH') {
    const lastMonth = subMonths(today, 1);
    start = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
    end = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
  } else if (dateFilter === 'CUSTOM' && customStart && customEnd) {
    start = customStart;
    end = customEnd;
  }

  // Requisições usando React Query (sempre chamadas, mesma ordem em todo render)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' && !user?.isImpersonating;
  const { data: superAdmData, isError: errorSuperAdm } = useSuperAdminDashboard(isSuperAdmin);
  const workspaceTipoResolved = !isSuperAdmin ? !!activeWorkspace : true;
  const { data: tenantData, isLoading: loadingTenant, isError: errorTenant } = useApiQuery<any>(
    ['dashboard', 'tenant', activeStoreId, start, end],
    `/v2/dashboard/tenant?startDate=${start}&endDate=${end}`,
    { enabled: !isSuperAdmin && workspaceTipoResolved && activeWorkspace?.tipo !== 'PF' && !!start && !!end, retry: false }
  );

  // Guard: aguarda contexto auth + workspace resolver
  if (authLoading || (!isSuperAdmin && !activeWorkspace)) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" /></div>;
  }

  // Guard de carregamento de dados (não-PF)
  if (!isSuperAdmin && activeWorkspace?.tipo !== 'PF') {
    if (loadingTenant && !errorTenant && !!start && !!end) {
      return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" /></div>;
    }
  }

  // PF → renderiza dashboard pessoal inline
  if (activeWorkspace?.tipo === 'PF') {
    return <PersonalDashboardPage />;
  }

  const exportParams = () => {
    if (dateFilter === 'CUSTOM' && customStart && customEnd) {
      return `startDate=${customStart}&endDate=${customEnd}`;
    }
    if (dateFilter === 'LAST_MONTH') {
      const prev = subMonths(new Date(), 1);
      return `startDate=${format(startOfMonth(prev), 'yyyy-MM-dd')}&endDate=${format(endOfMonth(prev), 'yyyy-MM-dd')}`;
    }
    const now = new Date();
    return `startDate=${format(startOfMonth(now), 'yyyy-MM-dd')}&endDate=${format(now, 'yyyy-MM-dd')}`;
  };

  const handleExportCSV = () => {
    window.open(`/api/finance/dre/export?formato=csv&${exportParams()}`, '_blank');
  };

  const handleExportPDF = () => {
    window.open(`/api/finance/dre/export?formato=pdf&${exportParams()}`, '_blank');
  };

  // --- Visão SUPER ADMIN (independente do estado do fetch) ---
  if (user?.role === 'SUPER_ADMIN' && !user?.isImpersonating) {
    if (errorSuperAdm) {
      return <div className="p-6 text-gray-500 flex justify-center items-center h-64 text-red-500 text-lg">Erro ao carregar dados do dashboard.</div>;
    }
    if (!superAdmData) {
      return <div className="p-6 text-gray-500 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>;
    }
    const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Visão Geral do SaaS</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <MetricCard title="MRR (Receita Recorrente)" value={formatBRL(superAdmData.mrr)} color="green" />
          <MetricCard title="Lojas Pagantes" value={String(superAdmData.lojasAtivas)} subtitle={`de ${superAdmData.totalLojas} lojas`} color="brand" />
          <MetricCard title="Clientes Totais" value={String(superAdmData.totalClientes)} subtitle={`${superAdmData.totalUsuarios} usuários`} color="purple" />
          <MetricCard title="Inadimplentes" value={String(superAdmData.inadimplentes)} subtitle={`${superAdmData.churnRate}% churn rate`} color="red" />
        </div>

        {/* Ações Rápidas */}
        <div className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Varredura Financeira</h3>
              <p className="text-xs text-gray-500 mt-1">Dispara manualmente a verificação de boletos vencidos e bloqueio de lojistas inadimplentes.</p>
            </div>
            <button
              onClick={() => {
                const promise = fetchApi('/super-admin/trigger-billing', { method: 'POST' });
                toast.promise(promise, {
                  loading: 'Enfileirando varredura financeira...',
                  success: 'Varredura iniciada em background!',
                  error: 'Erro ao enfileirar varredura',
                });
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition shadow-sm"
            >
              <PlayCircle className="w-5 h-5" />
              Executar Varredura Financeira
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-6">
          <MetricCard title="ARPU (Receita por Loja)" value={formatBRL(superAdmData.arpu)} color="blue" />
          <MetricCard title="LTV (Valor do Cliente)" value={formatBRL(superAdmData.ltv)} color="teal" />
          <MetricCard title="Novos Clientes (Mês)" value={String(superAdmData.novosClientesMes)} subtitle={`${superAdmData.momGrowth > 0 ? '+' : ''}${superAdmData.momGrowth}% vs mês anterior`} color="emerald" />
          <MetricCard title="Receita Pendente" value={formatBRL(superAdmData.receitaPendente)} color="amber" />
        </div>

        <div className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4">Evolução MRR (6 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={superAdmData.receitaChart}>
              <defs>
                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `R$${v}`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => [formatBRL(Number(v)), 'MRR']} />
              <Area type="monotone" dataKey="receita" stroke="#059669" fillOpacity={1} fill="url(#colorMrr)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  function MetricCard({ title, value, subtitle, color }: { title: string; value: string; subtitle?: string; color: string }) {
    const colors: Record<string, string> = {
      brand: 'border-t-brand-500', green: 'border-t-emerald-500', purple: 'border-t-purple-500',
      red: 'border-t-red-500', blue: 'border-t-blue-500', teal: 'border-t-teal-500',
      emerald: 'border-t-emerald-500', amber: 'border-t-amber-500',
    };
    return (
      <div className={`bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200 border-t-4 ${colors[color] || colors.brand}`}>
        <h3 className="text-xs md:text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-sm md:text-3xl font-bold mt-0 md:mt-2 text-gray-900 leading-tight">{value}</p>
        {subtitle && <p className="text-[10px] md:text-xs text-gray-400 mt-0 md:mt-1">{subtitle}</p>}
      </div>
    );
  }

  // --- Visão LOJISTA ---
  const pjData = tenantData ?? {
    faturamentoPeriodo: 0, faturamentoCrescimento: 0, pedidosPeriodo: 0,
    ticketMedio: 0, estoqueBaixoCount: 0, faturamentoBruto: 0,
    impostosEstimados: 0, aliquotaImposto: 0, faturamentoLiquido: 0,
    cmvPeriodo: 0, lucroBruto: 0, margemBruta: 0, despesasPeriodo: 0,
    lucroLiquido: 0, margemLiquida: 0, aReceberFiado: 0,
    saldoAnterior: 0, capitalLivre: 0, saldoCarteiras: 0,
    crediarioAVencerMes: 0, parcelasFornecedoresMes: 0, despesasFixasMes: 0,
    chartData: [] as any[], topProdutos: [] as any[], ultimasVendas: [] as any[],
  };

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
  const num = (v: any) => Number(v ?? 0);

  const renderGrowth = (value: number) => {
    if (value === 0) return <span className="text-gray-400 text-xs ml-2">Neutro vs último período</span>;
    if (value > 0) return <span className="text-emerald-500 text-xs ml-2 flex items-center font-semibold"><TrendingUp className="w-3 h-3 mr-1" /> +{value.toFixed(1)}% vs anterior</span>;
    return <span className="text-red-500 text-xs ml-2 flex items-center font-semibold"><TrendingDown className="w-3 h-3 mr-1" /> {value.toFixed(1)}% vs anterior</span>;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center flex-wrap gap-2">
          Dashboard 
          {user?.isImpersonating && <span className="text-red-500 text-xs ml-0 bg-red-100 px-2 py-1 rounded-full whitespace-nowrap">(Visualizando como cliente)</span>}
        </h1>
        
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200 w-full md:w-auto">
          <button onClick={() => setDateFilter('TODAY')} className={`px-2.5 py-1 text-xs md:text-sm font-medium rounded-md transition-colors ${dateFilter === 'TODAY' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Hoje</button>
          <button onClick={() => setDateFilter('LAST_7_DAYS')} className={`px-2.5 py-1 text-xs md:text-sm font-medium rounded-md transition-colors ${dateFilter === 'LAST_7_DAYS' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>7 Dias</button>
          <button onClick={() => setDateFilter('THIS_MONTH')} className={`px-2.5 py-1 text-xs md:text-sm font-medium rounded-md transition-colors ${dateFilter === 'THIS_MONTH' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Este Mês</button>
          <button onClick={() => setDateFilter('LAST_MONTH')} className={`px-2.5 py-1 text-xs md:text-sm font-medium rounded-md transition-colors ${dateFilter === 'LAST_MONTH' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Mês Passado</button>
          
          <div className="flex items-center gap-1 ml-0 md:ml-2 border-0 md:border-l pl-0 md:pl-2">
            <input type="date" className="text-xs md:text-sm border border-gray-300 rounded px-1.5 py-1 outline-none focus:border-indigo-500 w-28 md:w-auto" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setDateFilter('CUSTOM'); }} />
            <span className="text-gray-400 text-xs">-</span>
            <input type="date" className="text-xs md:text-sm border border-gray-300 rounded px-1.5 py-1 outline-none focus:border-indigo-500 w-28 md:w-auto" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setDateFilter('CUSTOM'); }} />
          </div>
        </div>
      </div>
        
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
        <div className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">Faturamento (Período)</h3>
              <p className="text-2xl md:text-3xl font-bold mt-1 md:mt-2 text-gray-900 break-all">
                {formatBRL(num(pjData.faturamentoPeriodo))}
              </p>
            </div>
            <div className="bg-indigo-100 p-2 md:p-3 rounded-lg text-indigo-600">
              <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
          <div className="mt-2 md:mt-4 flex items-center">
            {renderGrowth(pjData.faturamentoCrescimento)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">Pedidos (Período)</h3>
              <p className="text-2xl md:text-3xl font-bold mt-1 md:mt-2 text-gray-900">{pjData.pedidosPeriodo}</p>
            </div>
            <div className="bg-purple-100 p-2 md:p-3 rounded-lg text-purple-600">
              <Package className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
          <div className="mt-2 md:mt-4 flex items-center">
            <span className="text-gray-500 text-xs md:text-sm font-medium">Ticket Médio: {formatBRL(num(pjData.ticketMedio))}</span>
          </div>
        </div>

        <div className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">Alertas de Estoque</h3>
              <p className="text-2xl md:text-3xl font-bold mt-1 md:mt-2 text-gray-900">{pjData.estoqueBaixoCount}</p>
            </div>
            <div className="bg-rose-100 p-2 md:p-3 rounded-lg text-rose-600">
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
          <div className="mt-2 md:mt-4 flex items-center">
             <span className="text-rose-500 text-xs md:text-sm font-medium">Produtos precisando de reposição</span>
          </div>
        </div>
      </div>

      {/* Saldo Anterior e Capital Livre */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
        <div className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-amber-500">
          <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">Saldo Anterior</h3>
          <p className="text-xl md:text-2xl font-bold mt-1 md:mt-2 text-gray-900">
            {formatBRL(num(pjData.saldoAnterior))}
          </p>
          <p className="text-[10px] md:text-xs text-gray-400 mt-1">Entradas - Saídas antes do período</p>
        </div>
        <div className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-emerald-500">
          <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">Capital Livre</h3>
          <p className="text-xl md:text-2xl font-bold mt-1 md:mt-2 text-gray-900">
            {formatBRL(num(pjData.capitalLivre))}
          </p>
          <p className="text-[10px] md:text-xs text-gray-400 mt-1">Saldo + Crediário - Fornecedores - Despesas Fixas</p>
        </div>
        <div className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-blue-500">
          <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">Saldo em Conta</h3>
          <p className="text-xl md:text-2xl font-bold mt-1 md:mt-2 text-gray-900">
            {formatBRL(num(pjData.saldoCarteiras))}
          </p>
          <p className="text-[10px] md:text-xs text-gray-400 mt-1">
            Crediário: {formatBRL(num(pjData.crediarioAVencerMes))} · Forn: {formatBRL(num(pjData.parcelasFornecedoresMes))} · Desp: {formatBRL(num(pjData.despesasFixasMes))}
          </p>
        </div>
      </div>

      {/* DRE Summary */}
      <div className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-3 md:mb-4">
          <h3 className="text-sm md:text-lg font-bold text-gray-800">Resumo DRE (Período)</h3>
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 text-xs md:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              CSV
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 text-xs md:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
              PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto -mx-4 md:-mx-0 px-4 md:px-0">
          <div className="flex md:grid md:grid-cols-4 lg:grid-cols-8 gap-4 md:gap-4 min-w-[640px] md:min-w-0">
            <div className="shrink-0 md:shrink">
              <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Faturamento Bruto</p>
              <p className="text-sm md:text-lg font-bold text-gray-900">{formatBRL(num(pjData.faturamentoBruto))}</p>
            </div>
            <div className="shrink-0 md:shrink">
              <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Impostos</p>
              <p className="text-sm md:text-lg font-bold text-rose-600">-{formatBRL(num(pjData.impostosEstimados))}</p>
              {num(pjData.aliquotaImposto) > 0 && <p className="text-[10px] md:text-xs text-rose-400">{pjData.aliquotaImposto}%</p>}
            </div>
            <div className="shrink-0 md:shrink">
              <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Faturamento Líquido</p>
              <p className="text-sm md:text-lg font-bold text-gray-900">{formatBRL(num(pjData.faturamentoLiquido))}</p>
            </div>
            <div className="shrink-0 md:shrink">
              <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">CMV</p>
              <p className="text-sm md:text-lg font-bold text-rose-600">-{formatBRL(num(pjData.cmvPeriodo))}</p>
            </div>
            <div className="shrink-0 md:shrink">
              <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Lucro Bruto</p>
              <p className="text-sm md:text-lg font-bold text-emerald-600">{formatBRL(num(pjData.lucroBruto))}</p>
              <p className="text-[10px] md:text-xs text-emerald-500">{num(pjData.margemBruta).toFixed(1)}%</p>
            </div>
            <div className="shrink-0 md:shrink">
              <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Despesas</p>
              <p className="text-sm md:text-lg font-bold text-rose-600">-{formatBRL(num(pjData.despesasPeriodo))}</p>
              {num(pjData.despesasPeriodo) === 0 && num(pjData.faturamentoBruto) > 0 && (
                <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">Nenhuma despesa lançada no período</p>
              )}
            </div>
            <div className="shrink-0 md:shrink">
              <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Lucro Líquido</p>
              <p className={`text-sm md:text-lg font-bold ${num(pjData.lucroLiquido) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatBRL(num(pjData.lucroLiquido))}
              </p>
              <p className={`text-[10px] md:text-xs ${num(pjData.margemLiquida) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {num(pjData.margemLiquida).toFixed(1)}%
              </p>
            </div>
            <div className="shrink-0 md:shrink">
              <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Fiado</p>
              <p className="text-sm md:text-lg font-bold text-amber-600">{formatBRL(num(pjData.aReceberFiado))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-5">
        
        {/* Main Chart */}
        <div className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
          <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 md:mb-6 flex items-center">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2 text-indigo-500" /> 
            Desempenho Financeiro
          </h3>
          <div className="h-56 md:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pjData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} tickFormatter={(val) => `R$ ${new Intl.NumberFormat('pt-BR').format(val)}`} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="receitas" name="Receitas Líquidas" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h3 className="text-sm md:text-lg font-bold text-gray-800 mb-2 md:mb-4 border-b pb-2 md:pb-4">Top 5 Produtos</h3>
          <div className="flex-1">
            {pjData.topProdutos && pjData.topProdutos.length > 0 ? (
              <ul className="space-y-4">
                {pjData.topProdutos.map((prod: { nome: string; qtd: number; valor: number }, index: number) => (
                  <li key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mr-3">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[120px] md:max-w-[150px]">{prod.nome}</p>
                        <p className="text-xs text-gray-500">{prod.qtd} unidades vendidas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatBRL(num(prod.valor))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Package className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">Nenhum produto vendido no período</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-sm md:text-lg font-bold text-gray-800 mb-2 md:mb-4">Últimas Vendas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Data/Hora</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Pagamento</th>
                <th className="px-4 py-3 font-semibold text-right">Valor Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pjData.ultimasVendas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">Nenhuma venda registrada ainda.</td>
                </tr>
              ) : (
                pjData.ultimasVendas.map((venda: { id: string; data: string; cliente: string; pagamento: string; valor: number }) => (
                  <tr key={venda.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(venda.data).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{venda.cliente}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold uppercase">
                        {venda.pagamento}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatBRL(num(venda.valor))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

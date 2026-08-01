import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../lib/api';
import { TrendingUp, TrendingDown, Building2, DollarSign, Package, AlertCircle, Calendar, Landmark, PiggyBank, Wallet, AlertTriangle } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

interface FluxoFinanceiroMetric {
  saldoAcumulado: number;
  entradasDoMes: number;
  saidasDoMes: number;
  saldoDisponivel: number;
}

interface ResultadoOperacaoMetric {
  faturamentoLiquido: number;
  cmv: number;
  despesasOperacionais: number;
  impostosEstimados: number;
  lucroOperacao: number;
  margemOperacional: number;
}

interface StoreMetric {
  storeId: string;
  storeName: string;
  fluxoFinanceiro: FluxoFinanceiroMetric;
  resultadoOperacao: ResultadoOperacaoMetric;
  volumeVendas: number;
  faturamentoBruto: number;
  estoqueImobilizado: number;
  estoqueBaixoCount: number;
  aReceberFiado: number;
  fiadoVencido: number;
  apPendentes: number;
  apVencido: number;
  apVencendo7d: number;
  paymentMethodsBreakdown?: Array<{ method: string; label: string; value: number }>;
  prevCmv?: number;
  prevEntradas?: number;
  prevSaidas?: number;
}

interface ConsolidatedData {
  totalStores: number;
  stores: StoreMetric[];
  faturamentoPorDia?: Array<{ storeId: string; data: string; atual: number; anterior: number }>;
  consolidated: {
    fluxoFinanceiro: FluxoFinanceiroMetric;
    resultadoOperacao: ResultadoOperacaoMetric;
    faturamentoCrescimento: number;
    lucroCrescimento: number;
    faturamentoMesPassado: number;
    prevCmv: number;
    prevEntradas: number;
    prevSaidas: number;
    estoqueBaixoCount: number;
    fiadoVencido: number;
    apPendentes: number;
    apVencido: number;
    apVencendo7d: number;
  };
}

export function DashboardPJPage() {
  const { user, activeStoreId } = useAuth();
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  function getDateRange() {
    const today = new Date();
    let start = '';
    let end = format(today, 'yyyy-MM-dd');
    if (period === '7d') start = format(subDays(today, 7), 'yyyy-MM-dd');
    else if (period === '30d') start = format(subDays(today, 30), 'yyyy-MM-dd');
    else if (period === 'este_mes') { start = format(startOfMonth(today), 'yyyy-MM-dd'); }
    else if (period === 'mes_passado') {
      const last = subMonths(today, 1);
      start = format(startOfMonth(last), 'yyyy-MM-dd');
      end = format(endOfMonth(last), 'yyyy-MM-dd');
    } else if (period === 'personalizado') { start = customStart; end = customEnd; }
    return { start, end };
  }

  useEffect(() => {
    if (!activeStoreId) { setLoading(false); return; }
    const { start, end } = getDateRange();
    if (!start || !end) { setLoading(false); return; }
    async function load() {
      try {
        const data = await fetchApi(`/dashboard/pj/consolidated?startDate=${start}&endDate=${end}`);
        setData(data);
      } catch (e) {
        console.error('Erro ao carregar dashboard PJ (forçando dados zerados):', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeStoreId, period, customStart, customEnd]);

  if (user?.role === 'SUPER_ADMIN' && !user?.isImpersonating) {
    return <div className="p-6 text-gray-500 text-center mt-12 text-lg">Use o Dashboard Principal para visão de administrador.</div>;
  }

  if (loading) {
    return (
      <div className="p-6 text-gray-500 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
      </div>
    );
  }

  const consolidated = data ?? {
    totalStores: 0, stores: [],
    faturamentoPorDia: [],
    consolidated: {
      fluxoFinanceiro: { saldoAcumulado: 0, entradasDoMes: 0, saidasDoMes: 0, saldoDisponivel: 0 },
      resultadoOperacao: { faturamentoLiquido: 0, cmv: 0, despesasOperacionais: 0, impostosEstimados: 0, lucroOperacao: 0, margemOperacional: 0 },
      faturamentoCrescimento: 0, lucroCrescimento: 0, faturamentoMesPassado: 0,
      prevCmv: 0, prevEntradas: 0, prevSaidas: 0,
      estoqueBaixoCount: 0, fiadoVencido: 0, apPendentes: 0, apVencido: 0, apVencendo7d: 0,
    },
  };
  const c = consolidated.consolidated;
  const activeStores = selectedStore
    ? consolidated.stores.filter(s => s.storeId === selectedStore)
    : consolidated.stores;

  const activeTotal = activeStores.reduce((acc, s) => ({
    saldoAcumulado: acc.saldoAcumulado + s.fluxoFinanceiro.saldoAcumulado,
    volumeVendas: acc.volumeVendas + s.volumeVendas,
    faturamentoBruto: acc.faturamentoBruto + (s.faturamentoBruto || 0),
    entradasDoMes: acc.entradasDoMes + s.fluxoFinanceiro.entradasDoMes,
    saidasDoMes: acc.saidasDoMes + s.fluxoFinanceiro.saidasDoMes,
    saldoDisponivel: acc.saldoDisponivel + s.fluxoFinanceiro.saldoDisponivel,
    faturamentoLiquido: acc.faturamentoLiquido + s.resultadoOperacao.faturamentoLiquido,
    cmv: acc.cmv + s.resultadoOperacao.cmv,
    despesasOperacionais: acc.despesasOperacionais + s.resultadoOperacao.despesasOperacionais,
    impostosEstimados: acc.impostosEstimados + s.resultadoOperacao.impostosEstimados,
    lucroOperacao: acc.lucroOperacao + s.resultadoOperacao.lucroOperacao,
    estoqueImobilizado: acc.estoqueImobilizado + s.estoqueImobilizado,
    estoqueBaixoCount: acc.estoqueBaixoCount + (s.estoqueBaixoCount || 0),
    aReceberFiado: acc.aReceberFiado + s.aReceberFiado,
    fiadoVencido: acc.fiadoVencido + (s.fiadoVencido || 0),
    apPendentes: acc.apPendentes + (s.apPendentes || 0),
    apVencido: acc.apVencido + (s.apVencido || 0),
    apVencendo7d: acc.apVencendo7d + (s.apVencendo7d || 0),
    prevEntradas: acc.prevEntradas + (s.prevEntradas || 0),
    prevSaidas: acc.prevSaidas + (s.prevSaidas || 0),
    prevCmv: acc.prevCmv + (s.prevCmv || 0),
  }), {
    saldoAcumulado: 0, volumeVendas: 0, faturamentoBruto: 0,
    entradasDoMes: 0, saidasDoMes: 0, saldoDisponivel: 0,
    faturamentoLiquido: 0, cmv: 0, despesasOperacionais: 0,
    impostosEstimados: 0, lucroOperacao: 0,
    estoqueImobilizado: 0, estoqueBaixoCount: 0, aReceberFiado: 0,
    fiadoVencido: 0, apPendentes: 0, apVencido: 0, apVencendo7d: 0,
    prevEntradas: 0, prevSaidas: 0, prevCmv: 0,
  });

  const saldoProjetado = activeTotal.saldoAcumulado + activeTotal.aReceberFiado - activeTotal.apPendentes;

  const Card = ({ label, value, icon, color, suffix }: { label: string; value: string; icon: React.ReactNode; color: string; suffix?: React.ReactNode }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-2 text-gray-900">{value}</p>
          {suffix && <p className="text-xs text-gray-400 mt-1">{suffix}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      </div>
    </div>
  );

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  const deltaPct = (atual: number, prev: number) => prev === 0 ? (atual === 0 ? '0.0%' : '+100%') : pct(((atual - prev) / prev) * 100);
  const deltaNode = (atual: number, prev: number, invert = false) => {
    const p = prev === 0 ? (atual === 0 ? 0 : 100) : ((atual - prev) / prev) * 100;
    const good = invert ? p < 0 : p > 0;
    return (
      <span className={`font-semibold ${p === 0 ? 'text-gray-400' : good ? 'text-emerald-600' : 'text-rose-600'}`}>
        {deltaPct(atual, prev)} vs período anterior
      </span>
    );
  };

  const hasAlerts = activeTotal.fiadoVencido > 0 || activeTotal.apVencido > 0 || activeTotal.apVencendo7d > 0 || activeTotal.estoqueBaixoCount > 0;

  const seriesMap = new Map<string, { atual: number; anterior: number }>();
  for (const p of (data?.faturamentoPorDia || [])) {
    if (selectedStore && p.storeId !== selectedStore) continue;
    const e = seriesMap.get(p.data) || { atual: 0, anterior: 0 };
    e.atual += p.atual;
    e.anterior += p.anterior;
    seriesMap.set(p.data, e);
  }
  const chartData = [...seriesMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([iso, v]) => ({
      name: `${iso.slice(8, 10)}/${iso.slice(5, 7)}`,
      atual: Math.round(v.atual * 100) / 100,
      anterior: Math.round(v.anterior * 100) / 100,
    }));

  const pmLabels = new Map(activeStores.flatMap(s => s.paymentMethodsBreakdown || []).map(p => [p.method, p.label]));
  const pmAgg = new Map<string, number>();
  for (const s of activeStores) {
    for (const p of (s.paymentMethodsBreakdown || [])) {
      pmAgg.set(p.method, (pmAgg.get(p.method) || 0) + p.value);
    }
  }
  const pmData = [...pmAgg.entries()].filter(([, v]) => v > 0).map(([method, value]) => ({
    method,
    label: pmLabels.get(method) || method,
    value: Math.round(value * 100) / 100,
  }));
  const PM_COLORS: Record<string, string> = {
    PIX: '#10b981', DINHEIRO: '#84cc16', CARTAO_DEBITO: '#0ea5e9',
    CARTAO_CREDITO_AVISTA: '#6366f1', CARTAO_CREDITO_PARCELADO: '#8b5cf6',
    CREDIARIO: '#f59e0b', OUTROS: '#9ca3af',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Consolidado</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 items-center bg-gray-100 p-1 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-400 ml-1" />
            {[
              { key: '7d', label: '7d' },
              { key: '30d', label: '30d' },
              { key: 'este_mes', label: 'Mês' },
              { key: 'mes_passado', label: 'Mês Pass.' },
              { key: 'personalizado', label: 'Personalizar' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setPeriod(key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${period === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
            ))}
          </div>
          {period === 'personalizado' && (
            <div className="flex gap-2 items-center">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
              <span className="text-gray-400">até</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            </div>
          )}
          <Building2 className="w-5 h-5 text-gray-400 ml-2" />
          <select
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
            value={selectedStore || ''}
            onChange={e => setSelectedStore(e.target.value || null)}
          >
            <option value="">Todas as Lojas ({consolidated.totalStores})</option>
            {consolidated.stores.map(s => (
              <option key={s.storeId} value={s.storeId}>{s.storeName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alertas */}
      {hasAlerts && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-col gap-2">
          <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Pontos de atenção
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
            {activeTotal.fiadoVencido > 0 && (
              <span className="flex items-center gap-1.5 text-red-700 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> {fmt(activeTotal.fiadoVencido)} de fiado vencido
              </span>
            )}
            {activeTotal.apVencido > 0 && (
              <span className="flex items-center gap-1.5 text-red-700 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> {fmt(activeTotal.apVencido)} em contas a pagar vencidas
              </span>
            )}
            {activeTotal.apVencendo7d > 0 && (
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <Calendar className="w-3.5 h-3.5" /> {fmt(activeTotal.apVencendo7d)} vencem nos próximos 7 dias
              </span>
            )}
            {activeTotal.estoqueBaixoCount > 0 && (
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <Package className="w-3.5 h-3.5" /> {activeTotal.estoqueBaixoCount} produtos abaixo do estoque mínimo
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bloco 1: Fluxo Financeiro */}
      <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
        <Wallet className="w-5 h-5" /> Fluxo Financeiro (Regime de Caixa)
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card
          label="Saldo Acumulado"
          value={fmt(activeTotal.saldoAcumulado)}
          icon={<Landmark className="w-6 h-6 text-white" />}
          color="bg-teal-100 text-teal-600"
          suffix="Dinheiro total em caixa (inclui meses anteriores)"
        />
        <Card
          label="Entradas do Período"
          value={fmt(activeTotal.entradasDoMes)}
          icon={<Wallet className="w-6 h-6 text-white" />}
          color="bg-sky-100 text-sky-600"
          suffix={deltaNode(activeTotal.entradasDoMes, activeTotal.prevEntradas)}
        />
        <Card
          label="Saídas do Período"
          value={fmt(activeTotal.saidasDoMes)}
          icon={<TrendingDown className="w-6 h-6 text-white" />}
          color="bg-rose-100 text-rose-600"
          suffix={deltaNode(activeTotal.saidasDoMes, activeTotal.prevSaidas, true)}
        />
        <Card
          label="Saldo Projetado"
          value={fmt(saldoProjetado)}
          icon={<PiggyBank className="w-6 h-6 text-white" />}
          color="bg-cyan-100 text-cyan-600"
          suffix="Caixa + Crediário a receber − contas a pagar"
        />
      </div>

      {/* Bloco 1B: Gráficos */}
      <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" /> Evolução do Faturamento & Recebimentos
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Faturamento líquido por dia (período vs anterior)</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAtual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAnterior" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`} />
              <Tooltip formatter={(v: any) => [fmt(Number(v)), '']} />
              <Legend />
              <Area type="monotone" dataKey="anterior" name="Período anterior" stroke="#f59e0b" strokeWidth={2} fill="url(#gradAnterior)" />
              <Area type="monotone" dataKey="atual" name="Período atual" stroke="#10b981" strokeWidth={2} fill="url(#gradAtual)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Formas de recebimento</p>
          {pmData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">Sem recebimentos no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pmData} dataKey="value" nameKey="label" cx="50%" cy="45%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {pmData.map(p => <Cell key={p.method} fill={PM_COLORS[p.method] || '#9ca3af'} />)}
                </Pie>
                <Tooltip formatter={(v: any, name: any) => [fmt(Number(v)), name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 justify-center">
            {pmData.map(p => (
              <span key={p.method} className="text-xs text-gray-600 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PM_COLORS[p.method] || '#9ca3af' }} />
                {p.label}: {fmt(p.value)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bloco 2: Resultado da Operação */}
      <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" /> Resultado da Operação (Regime de Competência)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card
          label="Faturamento Líquido"
          value={fmt(activeTotal.faturamentoLiquido)}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-emerald-100 text-emerald-600"
          suffix={pct(c.faturamentoCrescimento)}
        />
        <Card
          label="CMV"
          value={fmt(activeTotal.cmv)}
          icon={<Package className="w-6 h-6 text-white" />}
          color="bg-amber-100 text-amber-600"
          suffix={deltaNode(activeTotal.cmv, activeTotal.prevCmv, true)}
        />
        <Card
          label="Despesas Operacionais"
          value={fmt(activeTotal.despesasOperacionais)}
          icon={<TrendingDown className="w-6 h-6 text-white" />}
          color="bg-rose-100 text-rose-600"
          suffix="(exclui pagamento a fornecedores)"
        />
        <Card
          label="Lucro da Operação"
          value={fmt(activeTotal.lucroOperacao)}
          icon={activeTotal.lucroOperacao >= 0 ? <TrendingUp className="w-6 h-6 text-white" /> : <TrendingDown className="w-6 h-6 text-white" />}
          color={activeTotal.lucroOperacao >= 0 ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}
          suffix={`${pct(c.lucroCrescimento)} | ${c.resultadoOperacao.margemOperacional.toFixed(1)}% margem`}
        />
        <Card
          label="Impostos Estimados"
          value={fmt(activeTotal.impostosEstimados)}
          icon={<TrendingDown className="w-6 h-6 text-white" />}
          color="bg-orange-100 text-orange-600"
          suffix="Configure os impostos em Configurações"
        />
        <Card
          label="Crediário"
          value={fmt(activeTotal.aReceberFiado)}
          icon={<AlertCircle className="w-6 h-6 text-white" />}
          color="bg-purple-100 text-purple-600"
          suffix={activeTotal.fiadoVencido > 0 ? (
            <span className="text-rose-600 font-semibold">{fmt(activeTotal.fiadoVencido)} vencido</span>
          ) : 'a receber'}
        />
        <Card
          label="Estoque Imobilizado"
          value={fmt(activeTotal.estoqueImobilizado)}
          icon={<Package className="w-6 h-6 text-white" />}
          color="bg-amber-100 text-amber-600"
          suffix={activeTotal.estoqueBaixoCount > 0 ? (
            <span className="text-amber-600 font-semibold">{activeTotal.estoqueBaixoCount} abaixo do mínimo</span>
          ) : 'em estoque'}
        />
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-4">Desempenho por Loja</h2>
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-xl shadow-sm border border-gray-200">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3 text-right">Faturamento Liq.</th>
              <th className="px-4 py-3 text-right">CMV</th>
              <th className="px-4 py-3 text-right">Desp. Operac.</th>
              <th className="px-4 py-3 text-right">Impostos</th>
              <th className="px-4 py-3 text-right">Lucro Operac.</th>
              <th className="px-4 py-3 text-right">Fiado</th>
            </tr>
          </thead>
          <tbody>
            {activeStores.map(s => (
              <tr key={s.storeId} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                <td className="px-4 py-3 font-medium text-gray-900">{s.storeName}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{fmt(s.resultadoOperacao.faturamentoLiquido)}</td>
                <td className="px-4 py-3 text-right text-amber-600">{fmt(s.resultadoOperacao.cmv)}</td>
                <td className="px-4 py-3 text-right text-rose-600">{fmt(s.resultadoOperacao.despesasOperacionais)}</td>
                <td className="px-4 py-3 text-right text-orange-600">{fmt(s.resultadoOperacao.impostosEstimados)}</td>
                <td className={`px-4 py-3 text-right font-medium ${s.resultadoOperacao.lucroOperacao >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                  {fmt(s.resultadoOperacao.lucroOperacao)}
                </td>
                <td className="px-4 py-3 text-right text-amber-600">{fmt(s.aReceberFiado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-4 mt-8">Extrato Consolidado</h2>
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-xl shadow-sm border border-gray-200">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3">Conta / Loja</th>
              <th className="px-4 py-3 text-right">Saldo Anterior</th>
              <th className="px-4 py-3 text-right">Entradas (Período)</th>
              <th className="px-4 py-3 text-right">Saídas (Período)</th>
              <th className="px-4 py-3 text-right">Saldo Disponível</th>
            </tr>
          </thead>
          <tbody>
            {activeStores.map(s => {
              const saldoAnterior = s.fluxoFinanceiro.saldoAcumulado - s.fluxoFinanceiro.entradasDoMes + s.fluxoFinanceiro.saidasDoMes;
              return (
                <tr key={s.storeId} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.storeName}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(saldoAnterior)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(s.fluxoFinanceiro.entradasDoMes)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{fmt(s.fluxoFinanceiro.saidasDoMes)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(s.fluxoFinanceiro.saldoDisponivel)}</td>
                </tr>
              );
            })}
            {activeStores.length > 1 && (
              <tr className="border-t-2 border-gray-300 bg-gray-50 text-sm font-bold">
                <td className="px-4 py-3 text-gray-900">Total Consolidado</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmt(activeTotal.saldoAcumulado - activeTotal.entradasDoMes + activeTotal.saidasDoMes)}</td>
                <td className="px-4 py-3 text-right text-green-700">{fmt(activeTotal.entradasDoMes)}</td>
                <td className="px-4 py-3 text-right text-red-700">{fmt(activeTotal.saidasDoMes)}</td>
                <td className="px-4 py-3 text-right text-gray-900">{fmt(activeTotal.saldoDisponivel)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
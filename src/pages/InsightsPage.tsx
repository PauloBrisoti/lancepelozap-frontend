import { useState } from 'react';
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, CartesianGrid, Legend, Line } from 'recharts';
import { TrendingUp, Package, AlertTriangle, DollarSign, ShoppingBag, History, RefreshCw } from 'lucide-react';
import { useApiQuery, STALE_TIMES } from '../lib/query';

const ERROR_MESSAGES = {
  forecast: 'Não foi possível carregar a previsão de vendas. Tente novamente mais tarde.',
  stock: 'Não foi possível carregar as recomendações de reposição. Tente novamente mais tarde.',
  anomalies: 'Não foi possível carregar as anomalias. Tente novamente mais tarde.',
};

export function InsightsPage() {
  const [tab, setTab] = useState<'forecast' | 'stock' | 'anomalies'>('forecast');

  const { data: forecastData, isLoading: forecastLoading, error: forecastError, refetch: refetchForecast } = useApiQuery<any>(
    ['insights', 'forecast'],
    '/insights/forecast',
    { enabled: tab === 'forecast', staleTime: STALE_TIMES.NORMAL }
  );
  const { data: stockData, isLoading: stockLoading, error: stockError, refetch: refetchStock } = useApiQuery<any>(
    ['insights', 'stock'],
    '/insights/stock-recommendations',
    { enabled: tab === 'stock', staleTime: STALE_TIMES.NORMAL }
  );
  const { data: anomalyData, isLoading: anomalyLoading, error: anomalyError, refetch: refetchAnomalies } = useApiQuery<any>(
    ['insights', 'anomalies'],
    '/insights/anomalies',
    { enabled: tab === 'anomalies', staleTime: STALE_TIMES.NORMAL }
  );

  const loading = tab === 'forecast' ? forecastLoading : tab === 'stock' ? stockLoading : anomalyLoading;
  const error = tab === 'forecast' ? (forecastError ? ERROR_MESSAGES.forecast : null) : tab === 'stock' ? (stockError ? ERROR_MESSAGES.stock : null) : (anomalyError ? ERROR_MESSAGES.anomalies : null);

  const refetchTab = () => {
    if (tab === 'forecast') refetchForecast();
    else if (tab === 'stock') refetchStock();
    else refetchAnomalies();
  };

  const fmt = (v: number) => `R$ ${v.toFixed(2)}`;
  const fmtQtd = (v: number) => v.toFixed(1);

  const TABS = [
    { key: 'forecast' as const, label: 'Previsão de Vendas', icon: TrendingUp },
    { key: 'stock' as const, label: 'Reposição de Estoque', icon: Package },
    { key: 'anomalies' as const, label: 'Anomalias', icon: AlertTriangle },
  ];

  function EmptyState({ icon: Icon, title, message }: { icon: React.ComponentType<{ className?: string }>; title: string; message: string }) {
    return (
      <div className="bg-white p-10 rounded-xl border border-gray-200 text-center">
        <Icon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto">{message}</p>
      </div>
    );
  }

  function ErrorState({ message }: { message: string }) {
    return (
      <div className="bg-white p-10 rounded-xl border border-red-200 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-300" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">Ops! Algo deu errado</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto mb-4">{message}</p>
        <button onClick={refetchTab} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium transition-colors">
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  const hasInsufficientData = (data: { dadosInsuficientes?: boolean } | null) => {
    if (!data) return true;
    return data.dadosInsuficientes === true;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Insights & IA</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-brand-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
        </div>
      )}

      {error && !loading && <ErrorState message={error} />}

      {!loading && !error && tab === 'forecast' && (
        !forecastData || hasInsufficientData(forecastData) ? (
          <EmptyState icon={History} title="Ainda estamos coletando dados" message={forecastData?.mensagem || 'Precisamos de pelo menos 7 dias de vendas para gerar previsões. Continue vendendo normalmente e volte em alguns dias.'} />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard title="Faturamento (últimos 30 dias)" value={fmt(forecastData.totalLast30Days)} icon={DollarSign} color="bg-green-100 text-green-600" />
              <MetricCard title="Ticket Médio" value={fmt(forecastData.avgTicket)} icon={ShoppingBag} color="bg-blue-100 text-blue-600" />
              <MetricCard title="Previsão Próximos 7 Dias" value={fmt(forecastData.forecast.reduce((s: number, d: { predicted: number }) => s + d.predicted, 0))} icon={History} color="bg-indigo-100 text-indigo-600" />
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Últimos 30 Dias + Previsão 7 Dias</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  ...forecastData.daily.map((d: { date: string; total: number }) => ({ ...d, tipo: 'real' as const })),
                  ...forecastData.forecast.map((d: { date: string; predicted: number }) => ({ ...d, total: null, tipo: 'previsto' as const }))
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v/100).toFixed(0)}`} />
                  <Tooltip formatter={(value: unknown) => fmt(Number(value))} />
                  <Legend />
                  <Bar dataKey="total" fill="#3B82F6" name="Realizado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="predicted" fill="#F59E0B" name="Previsão" radius={[4, 4, 0, 0]} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {forecastData.movingAvg && forecastData.movingAvg.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Média Móvel (7 dias)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={forecastData.movingAvg.map((v: number, i: number) => ({ label: `d-${forecastData.movingAvg.length - i}`, value: v })).slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${v.toFixed(0)}`} />
                    <Tooltip formatter={(value: unknown) => fmt(Number(value))} />
                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} name="Média Móvel" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )
      )}

      {!loading && !error && tab === 'stock' && (
        !stockData ? (
          <EmptyState icon={Package} title="Nada aqui ainda" message="Não foi possível carregar os dados de estoque. Verifique se existem produtos cadastrados." />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard title="Total de Produtos" value={String(stockData.totalProducts)} icon={Package} color="bg-gray-100 text-gray-600" />
              <MetricCard title="Precisam de Reposição" value={String(stockData.productsAtRisk)} icon={AlertTriangle} color="bg-amber-100 text-amber-600" />
              <MetricCard title="Estoque Baixo" value={String(stockData.lowStock.length)} icon={Package} color="bg-rose-100 text-rose-600" />
            </div>

            {stockData.needsReorder && stockData.needsReorder.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Produtos que Precisam de Reposição</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Categoria</th>
                        <th className="px-4 py-3 text-right">Estoque</th>
                        <th className="px-4 py-3 text-right">Venda/Dia</th>
                        <th className="px-4 py-3 text-right">Dias Restantes</th>
                        <th className="px-4 py-3 text-right">Sugestão de Compra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockData.needsReorder.map((p: { productId: string; nome: string; category: string; qtdEstoque: number; dailyVelocity: number; daysUntilStockout: number | null; suggestedOrder: number; lowStock: boolean }) => (
                        <tr key={p.productId} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{p.nome}</td>
                          <td className="px-4 py-3 text-gray-500">{p.category}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={p.lowStock ? 'text-rose-600 font-semibold' : 'text-gray-700'}>{fmtQtd(p.qtdEstoque)}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{fmtQtd(p.dailyVelocity)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={p.daysUntilStockout !== null && p.daysUntilStockout <= 7 ? 'text-rose-600 font-semibold' : 'text-amber-600'}>
                              {p.daysUntilStockout !== null ? `${p.daysUntilStockout}d` : '∞'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{fmtQtd(p.suggestedOrder)} un</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(!stockData.needsReorder || stockData.needsReorder.length === 0) && (
              <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="font-medium">Nenhum produto precisa de reposição no momento</p>
              </div>
            )}
          </div>
        )
      )}

      {!loading && !error && tab === 'anomalies' && (
        !anomalyData ? (
          <EmptyState icon={AlertTriangle} title="Sem dados de anomalias" message="Não foi possível carregar as anomalias. Verifique se existem vendas registradas." />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard title="Produtos sem Venda (30d)" value={String(anomalyData.stagnantCount)} icon={AlertTriangle} color="bg-amber-100 text-amber-600" />
              <MetricCard title="Produtos sem Venda (60d)" value={String(anomalyData.deadCount)} icon={AlertTriangle} color="bg-rose-100 text-rose-600" />
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${anomalyData.todayAnomaly.isAnomaly ? 'bg-rose-100 text-rose-600' : 'bg-green-100 text-green-600'}`}>
                    {anomalyData.todayAnomaly.isAnomaly ? <AlertTriangle className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Hoje vs Esperado</p>
                    <p className="text-lg font-bold text-gray-900">{fmt(anomalyData.todayAnomaly.actual)}</p>
                    <p className="text-xs text-gray-400">
                      Esperado: {fmt(anomalyData.todayAnomaly.expected)}
                      {anomalyData.todayAnomaly.deviation !== 0 && (
                        <span className={anomalyData.todayAnomaly.deviation > 0 ? 'text-green-500 ml-1' : 'text-rose-500 ml-1'}>
                          ({anomalyData.todayAnomaly.deviation > 0 ? '+' : ''}{anomalyData.todayAnomaly.deviation}%)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {anomalyData.stagnantProducts && anomalyData.stagnantProducts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Produtos sem Venda nos Últimos 30 Dias</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3 text-right">Estoque Parado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalyData.stagnantProducts.map((p: { productId: string; nome: string; qtdEstoque: number }) => (
                        <tr key={p.productId} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{p.nome}</td>
                          <td className="px-4 py-3 text-right text-amber-600 font-medium">{fmtQtd(p.qtdEstoque)} un</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(!anomalyData.stagnantProducts || anomalyData.stagnantProducts.length === 0) && (
              <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="font-medium">Nenhuma anomalia detectada — todos os produtos estão vendendo</p>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

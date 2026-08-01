import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, DollarSign, ChartPie } from 'lucide-react';

const CORES_PIE = ['#059669', '#f59e0b', '#ef4444', '#6b7280'];

export function RelatoriosFinanceirosPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/super-admin/financial-reports')
      .then(setData)
      .catch(() => toast.error('Erro ao carregar relatórios'))
      .finally(() => setLoading(false));
  }, []);

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (loading) return <div className="p-8 text-gray-500">Carregando relatórios...</div>;
  if (!data) return <div className="p-8 text-red-500">Erro ao carregar dados.</div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Relatórios Financeiros SaaS</h1>
        <p className="text-gray-500 text-xs md:text-sm">Acompanhe a saúde financeira da sua plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white p-2 md:p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-emerald-500">
          <p className="text-[10px] md:text-sm font-medium text-gray-500">Total Faturado</p>
          <p className="text-sm md:text-3xl font-bold mt-0 md:mt-2 text-gray-900 leading-tight">{formatBRL(data.totalFaturado)}</p>
        </div>
        <div className="bg-white p-2 md:p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-amber-500">
          <p className="text-[10px] md:text-sm font-medium text-gray-500">Total a Receber</p>
          <p className="text-sm md:text-3xl font-bold mt-0 md:mt-2 text-gray-900 leading-tight">{formatBRL(data.totalAReceber)}</p>
        </div>
        <div className="bg-white p-2 md:p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-brand-500">
          <p className="text-[10px] md:text-sm font-medium text-gray-500">Planos Ativos</p>
          <p className="text-sm md:text-3xl font-bold mt-0 md:mt-2 text-gray-900 leading-tight">{data.planos?.length || 0}</p>
        </div>
        <div className="bg-white p-2 md:p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-red-500">
          <p className="text-[10px] md:text-sm font-medium text-gray-500">Status Inadimplentes</p>
          <p className="text-sm md:text-3xl font-bold mt-0 md:mt-2 text-gray-900 leading-tight">
            {data.statusBreakdown?.find((s: any) => s.status === 'VENCIDO')?.quantidade || 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" /> Receita Mensal (MRR)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.receitaMensal}>
              <defs><linearGradient id="recReceita" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#059669" stopOpacity={0.3} /><stop offset="95%" stopColor="#059669" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `R$${v}`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => [formatBRL(Number(v)), 'Receita']} />
              <Area type="monotone" dataKey="receita" stroke="#059669" fillOpacity={1} fill="url(#recReceita)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" /> Novos Clientes vs Churn
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.receitaMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="novosClientes" name="Novos Clientes" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="churn" name="Churn (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ChartPie className="w-5 h-5 text-purple-500" /> Distribuição de Planos
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.planos} dataKey="totalAssinantes" nameKey="nome" cx="50%" cy="50%" outerRadius={100} label={({ nome, percent }: any) => `${nome} ${((percent || 0) * 100).toFixed(0)}%`}>
                {data.planos?.map((_: any, i: number) => <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any, n: any) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-500" /> Status de Pagamento
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.statusBreakdown} dataKey="quantidade" nameKey="status" cx="50%" cy="50%" outerRadius={100} label={({ status, percent }: any) => `${status} ${((percent || 0) * 100).toFixed(0)}%`}>
                {data.statusBreakdown?.map((_: any, i: number) => <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Tabela de Receita Mensal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Mês</th>
                <th className="text-right px-4 py-3 font-semibold">Receita</th>
                <th className="text-right px-4 py-3 font-semibold">Novos Clientes</th>
                <th className="text-right px-4 py-3 font-semibold">Churn (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.receitaMensal?.map((r: any) => (
                <tr key={r.mes} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.mes}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatBRL(r.receita)}</td>
                  <td className="px-4 py-3 text-right">{r.novosClientes}</td>
                  <td className="px-4 py-3 text-right">{r.churn}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

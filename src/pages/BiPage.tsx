import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const CORES_PIE = ['#059669', '#10b981', '#6ee7b7', '#34d399', '#047857', '#065f46', '#a7f3d0', '#022c22'];

export function BiPage() {
  const [activeTab, setActiveTab] = useState('comparativo');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, unknown>>({});

  // Filtros de data
  const hoje = new Date().toISOString().slice(0, 10);
  const mesPassado = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10);
  const mesAtual = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [periodo1, setPeriodo1] = useState({ inicio: mesAtual, fim: hoje });
  const [periodo2, setPeriodo2] = useState({ inicio: mesPassado, fim: mesAtual });

  const carregar = async (tab: string) => {
    setLoading(true);
    try {
      if (tab === 'comparativo') {
        const res = await fetchApi(`/bi/comparativo?dataInicio1=${periodo1.inicio}&dataFim1=${periodo1.fim}&dataInicio2=${periodo2.inicio}&dataFim2=${periodo2.fim}`);
        setData({ comparativo: res });
      } else if (tab === 'abc') {
        const res = await fetchApi(`/bi/abc-curve?dataInicio=${periodo1.inicio}&dataFim=${periodo1.fim}`);
        setData({ abc: res });
      } else if (tab === 'rentabilidade') {
        const res = await fetchApi(`/bi/profitability?dataInicio=${periodo1.inicio}&dataFim=${periodo1.fim}`);
        setData({ rentabilidade: res });
      } else if (tab === 'heatmap') {
        const res = await fetchApi(`/bi/sales-heatmap?dataInicio=${periodo1.inicio}&dataFim=${periodo1.fim}`);
        setData({ heatmap: res });
      } else if (tab === 'topflop') {
        const res = await fetchApi(`/bi/top-flop?dataInicio=${periodo1.inicio}&dataFim=${periodo1.fim}`);
        setData({ topflop: res });
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(activeTab); }, [activeTab]);

  const abas = [
    { key: 'comparativo', label: 'Comparativo' },
    { key: 'abc', label: 'Curva ABC' },
    { key: 'rentabilidade', label: 'Rentabilidade' },
    { key: 'heatmap', label: 'Vendas' },
    { key: 'topflop', label: 'Top/Flop' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">BI & Relatórios</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {abas.map(a => (
          <button key={a.key} onClick={() => setActiveTab(a.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeTab === a.key ? 'bg-brand-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {a.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">Carregando...</div>
      ) : (
        <>
          {activeTab === 'comparativo' && <ComparativoTab data={data.comparativo as { periodo1: ComparativoData; periodo2: ComparativoData }} periodo1={periodo1} periodo2={periodo2} setPeriodo1={setPeriodo1} setPeriodo2={setPeriodo2} onRecarregar={() => carregar('comparativo')} />}
          {activeTab === 'abc' && <AbcTab data={data.abc as { resumo: { a: number; b: number; c: number; receitaA: number; receitaB: number; receitaC: number }; totalReceita: number; produtos: AbcProduto[] }} />}
          {activeTab === 'rentabilidade' && <RentabilidadeTab data={data.rentabilidade as { total: { receita: number; custo: number; margem: number }; categorias: RentabilidadeCategoria[] }} />}
          {activeTab === 'heatmap' && <HeatmapTab data={data.heatmap as { porHora: HeatmapHora[]; porDiaSemana: HeatmapItem[]; porDiaMes: { dia: string; vendas: number }[] }} />}
          {activeTab === 'topflop' && <TopFlopTab data={data.topflop as { top: TopFlopItem[]; flop: TopFlopItem[] }} />}
        </>
      )}
    </div>
  );
}

/* ===== COMPARATIVO ===== */
interface ComparativoData {
  totalVendas: number;
  receita: number;
  cmv: number;
  margem: number;
  ticketMedio: number;
  totalItens: number;
}

interface ComparativoProps {
  data: { periodo1: ComparativoData; periodo2: ComparativoData } | null;
  periodo1: { inicio: string; fim: string };
  periodo2: { inicio: string; fim: string };
  setPeriodo1: (p: { inicio: string; fim: string }) => void;
  setPeriodo2: (p: { inicio: string; fim: string }) => void;
  onRecarregar: () => void;
}

function ComparativoTab({ data, periodo1, periodo2, setPeriodo1, setPeriodo2, onRecarregar }: ComparativoProps) {
  if (!data) return <div className="text-center text-gray-400 py-10">Selecione os períodos e clique em Atualizar</div>;

  const MetricCard = ({ label, v1, v2, format = 'moeda' }: { label: string; v1: number; v2: number; format?: 'moeda' | 'numero' | 'percentual' }) => {
    const diff = v2 > 0 ? ((v1 - v2) / v2 * 100) : 0;
    const fmt = (v: number) => format === 'moeda' ? `R$ ${v.toFixed(2)}` : v.toFixed(1);
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="text-sm text-gray-500 font-medium mb-2">{label}</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-400">Período 1</div>
            <div className="text-lg font-bold text-gray-800">{fmt(v1)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Período 2</div>
            <div className="text-lg font-bold text-gray-800">{fmt(v2)}</div>
          </div>
        </div>
        <div className={`mt-2 text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {diff >= 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Período 1 (atual)</label>
            <div className="flex gap-2">
              <input type="date" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" value={periodo1.inicio} onChange={e => setPeriodo1({ ...periodo1, inicio: e.target.value })} />
              <input type="date" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" value={periodo1.fim} onChange={e => setPeriodo1({ ...periodo1, fim: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Período 2 (comparação)</label>
            <div className="flex gap-2">
              <input type="date" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" value={periodo2.inicio} onChange={e => setPeriodo2({ ...periodo2, inicio: e.target.value })} />
              <input type="date" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" value={periodo2.fim} onChange={e => setPeriodo2({ ...periodo2, fim: e.target.value })} />
            </div>
          </div>
        </div>
        <button onClick={onRecarregar} className="mt-3 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition">Atualizar</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Vendas Realizadas" v1={data.periodo1.totalVendas} v2={data.periodo2.totalVendas} format="numero" />
        <MetricCard label="Receita Total" v1={data.periodo1.receita} v2={data.periodo2.receita} />
        <MetricCard label="Custo (CMV)" v1={data.periodo1.cmv} v2={data.periodo2.cmv} />
        <MetricCard label="Margem Média" v1={data.periodo1.margem} v2={data.periodo2.margem} format="percentual" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Ticket Médio" v1={data.periodo1.ticketMedio} v2={data.periodo2.ticketMedio} />
        <MetricCard label="Itens Vendidos" v1={data.periodo1.totalItens} v2={data.periodo2.totalItens} format="numero" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Receita: Período 1 vs Período 2</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={[
            { nome: 'Receita', 'Período 1': data.periodo1.receita, 'Período 2': data.periodo2.receita },
            { nome: 'CMV', 'Período 1': data.periodo1.cmv, 'Período 2': data.periodo2.cmv },
          ]}>
            <XAxis dataKey="nome" />
            <YAxis />
            <Tooltip formatter={(v: unknown) => `R$ ${Number(v).toFixed(2)}`} />
            <Bar dataKey="Período 1" fill="#059669" />
            <Bar dataKey="Período 2" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ===== CURVA ABC ===== */
interface AbcProduto {
  id: string;
  nome: string;
  receita: number;
  participacao: number;
  margem: number;
  classificacao: string;
}

interface AbcProps {
  data: {
    resumo: { a: number; b: number; c: number; receitaA: number; receitaB: number; receitaC: number };
    totalReceita: number;
    produtos: AbcProduto[];
  } | null;
}

function AbcTab({ data }: AbcProps) {
  if (!data) return <div className="text-center text-gray-400 py-10">Sem dados</div>;

  const pieData = [
    { name: `A (${data.resumo.a} prods)`, value: data.resumo.receitaA },
    { name: `B (${data.resumo.b} prods)`, value: data.resumo.receitaB },
    { name: `C (${data.resumo.c} prods)`, value: data.resumo.receitaC },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição da Receita</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(props: unknown) => { const p = props as { name?: string; percent?: number }; return `${p.name ?? ''} ${((p.percent ?? 0) * 100).toFixed(0)}%`; }}>
                {pieData.map((_, i) => <Cell key={i} fill={CORES_PIE[i]} />)}
              </Pie>
            <Tooltip formatter={(v: unknown) => `R$ ${Number(v).toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumo</h3>
          <div className="space-y-3">
            {[
              { label: 'Classe A', qtd: data.resumo.a, receita: data.resumo.receitaA, cor: 'bg-red-100 text-red-800' },
              { label: 'Classe B', qtd: data.resumo.b, receita: data.resumo.receitaB, cor: 'bg-yellow-100 text-yellow-800' },
              { label: 'Classe C', qtd: data.resumo.c, receita: data.resumo.receitaC, cor: 'bg-green-100 text-green-800' },
            ].map(item => (
              <div key={item.label} className={`p-3 rounded-lg ${item.cor}`}>
                <div className="font-bold">{item.label}</div>
                <div className="text-sm">{item.qtd} produtos — R$ {item.receita.toFixed(2)}</div>
              </div>
            ))}
            <div className="p-3 bg-gray-100 rounded-lg">
              <div className="font-bold">Total</div>
              <div className="text-sm">{data.produtos.length} produtos — R$ {data.totalReceita.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-3 border-b border-gray-100 font-semibold text-gray-700 text-sm">Detalhamento</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500">
              <th className="text-left p-3">Produto</th>
              <th className="text-right p-3">Receita</th>
              <th className="text-right p-3">%</th>
              <th className="text-right p-3">Margem</th>
              <th className="text-center p-3">Classe</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.produtos.slice(0, 50).map((p: AbcProduto) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-3 text-gray-800">{p.nome}</td>
                  <td className="p-3 text-right">R$ {p.receita.toFixed(2)}</td>
                  <td className="p-3 text-right">{p.participacao}%</td>
                  <td className={`p-3 text-right font-medium ${p.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>{p.margem}%</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.classificacao === 'A' ? 'bg-red-100 text-red-700' : p.classificacao === 'B' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{p.classificacao}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===== RENTABILIDADE ===== */
interface RentabilidadeCategoria {
  categoriaId: string;
  categoria: string;
  receita: number;
  custo: number;
  lucro: number;
  margem: number;
  qtd: number;
}

interface RentabilidadeProps {
  data: {
    total: { receita: number; custo: number; margem: number };
    categorias: RentabilidadeCategoria[];
  } | null;
}

function RentabilidadeTab({ data }: RentabilidadeProps) {
  if (!data) return <div className="text-center text-gray-400 py-10">Sem dados</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500">Receita Total</div>
          <div className="text-2xl font-bold text-gray-800">R$ {data.total.receita.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500">Custo Total</div>
          <div className="text-2xl font-bold text-red-600">R$ {data.total.custo.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500">Margem Média</div>
          <div className={`text-2xl font-bold ${data.total.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>{data.total.margem}%</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Rentabilidade por Categoria</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.categorias}>
            <XAxis dataKey="categoria" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip formatter={(v: unknown) => `R$ ${Number(v).toFixed(2)}`} />
            <Legend />
            <Bar dataKey="receita" name="Receita" fill="#059669" />
            <Bar dataKey="custo" name="Custo" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-3 border-b border-gray-100 font-semibold text-gray-700 text-sm">Detalhamento</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500">
              <th className="text-left p-3">Categoria</th>
              <th className="text-right p-3">Receita</th>
              <th className="text-right p-3">Custo</th>
              <th className="text-right p-3">Lucro</th>
              <th className="text-right p-3">Margem</th>
              <th className="text-right p-3">Qtd</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.categorias.map((c: RentabilidadeCategoria) => (
                <tr key={c.categoriaId} className="hover:bg-gray-50">
                  <td className="p-3 text-gray-800">{c.categoria}</td>
                  <td className="p-3 text-right">R$ {c.receita.toFixed(2)}</td>
                  <td className="p-3 text-right">R$ {c.custo.toFixed(2)}</td>
                  <td className={`p-3 text-right font-medium ${c.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {c.lucro.toFixed(2)}</td>
                  <td className={`p-3 text-right font-medium ${c.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>{c.margem}%</td>
                  <td className="p-3 text-right">{c.qtd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===== HEATMAP ===== */
interface HeatmapItem {
  nome: string;
  vendas: number;
}

interface HeatmapHora {
  hora: string;
  vendas: number;
}

interface HeatmapProps {
  data: {
    porHora: HeatmapHora[];
    porDiaSemana: HeatmapItem[];
    porDiaMes: { dia: string; vendas: number }[];
  } | null;
}

function HeatmapTab({ data }: HeatmapProps) {
  if (!data) return <div className="text-center text-gray-400 py-10">Sem dados</div>;

  const maxVendas = Math.max(...data.porHora.map((h: HeatmapHora) => h.vendas), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Vendas por Dia da Semana</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.porDiaSemana}>
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="vendas" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Vendas por Hora</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.porHora}>
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} interval={2} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="vendas" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Vendas por Dia do Mês</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.porDiaMes}>
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="vendas" stroke="#059669" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Heatmap de Vendas (Hora × Dia)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-1 text-gray-400 font-medium">H/D</th>
                {data.porDiaSemana.map((d: HeatmapItem) => <th key={d.nome} className="p-1 text-gray-500 font-medium text-center">{d.nome}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.porHora.filter((h: HeatmapHora) => h.vendas > 0).map((h: HeatmapHora) => (
                <tr key={h.hora}>
                  <td className="p-1 text-gray-400 font-medium text-right pr-2">{h.hora}</td>
                  {data.porDiaSemana.map((d: HeatmapItem) => {
                    const intensity = h.vendas / maxVendas;
                    return (
                      <td key={d.nome} className="p-1 text-center">
                        <div className="w-full h-6 rounded" style={{ backgroundColor: `rgba(5, 150, 105, ${intensity})` }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===== TOP/FLOP ===== */
interface TopFlopItem {
  id: string;
  nome: string;
  categoria: string;
  qtd: number;
  receita: number;
}

interface TopFlopProps {
  data: {
    top: TopFlopItem[];
    flop: TopFlopItem[];
  } | null;
}

function TopFlopTab({ data }: TopFlopProps) {
  if (!data) return <div className="text-center text-gray-400 py-10">Sem dados</div>;

  const Tabela = ({ titulo, items, cor }: { titulo: string; items: TopFlopItem[]; cor: string }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className={`p-3 border-b border-gray-100 font-semibold text-sm ${cor}`}>{titulo}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-gray-500">
            <th className="text-left p-3">#</th>
            <th className="text-left p-3">Produto</th>
            <th className="text-right p-3">Categoria</th>
            <th className="text-right p-3">Qtd</th>
            <th className="text-right p-3">Receita</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((p: TopFlopItem, i: number) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-3 text-gray-400">{i + 1}</td>
                <td className="p-3 text-gray-800">{p.nome}</td>
                <td className="p-3 text-right text-gray-500">{p.categoria}</td>
                <td className="p-3 text-right">{p.qtd}</td>
                <td className="p-3 text-right font-medium">R$ {p.receita.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Tabela titulo="🏆 Top Produtos (maior receita)" items={data.top} cor="text-green-700" />
      <Tabela titulo="📉 Flop Produtos (menor receita)" items={data.flop} cor="text-red-600" />
    </div>
  );
}

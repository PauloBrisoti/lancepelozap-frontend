import { useState } from 'react';import { toast } from 'react-hot-toast';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import type { Sale, Product, Receivable, FinancialTransaction, SaleItem, DashboardMetrics } from '../types/api';
import { useApiQuery, queryKeys, STALE_TIMES } from '../lib/query';
import { useAuthStore } from '../context/AuthContext';
import { formatBRL } from '../utils/format';
import { saldoRestante } from '../utils/financeiro';
import { REPORT_PAYMENT_LABELS } from '../utils/domainMaps';

type Tab = 'vendas' | 'financeiro' | 'estoque';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];


const PERIOD_LABELS: Record<string, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  'este_mes': 'Este mês',
  'mes_passado': 'Mês passado',
  'personalizado': 'Período personalizado',
};

interface DreData {
  receitaBruta: number;
  deducoes: { total: number; descontos: number; taxasGateway: number };
  receitaLiquida: number;
  impostosEstimados: number;
  aliquotaImposto: number;
  custos: { cmv: number };
  lucroBruto: number;
  margemLucroBruto: number;
  despesas: { total: number; detalhamento: { categoria: string; valor: number }[] };
  lucroLiquido: number;
  margemLucroLiquido: number;
}

interface SalesSummary {
  current: { total: number; valor: number; ticketMedio: number; itens: number };
  previous: { total: number; valor: number; ticketMedio: number; itens: number } | null;
}

function formatNumber(v: number | string) {
  return new Intl.NumberFormat('pt-BR').format(Number(v));
}

function calcPrevRange(start: string, end: string) {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const len = e.getTime() - s.getTime();
  const prevEnd = new Date(s.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - len);
  return { prevStart: format(prevStart, 'yyyy-MM-dd'), prevEnd: format(prevEnd, 'yyyy-MM-dd') };
}

function renderPieLabel(props: unknown) {
  const p = props as { percent?: number };
  return `${((p.percent ?? 0) * 100).toFixed(0)}%`;
}

export function RelatoriosPage() {
  const { activeStoreId } = useAuthStore();
  const [tab, setTab] = useState<Tab>('vendas');
  const today = new Date();
  const [period, setPeriod] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Guarda as datas "aplicadas" — só muda com preset ou clique em Atualizar
  const [appliedStart, setAppliedStart] = useState(format(subDays(today, 30), 'yyyy-MM-dd'));
  const [appliedEnd, setAppliedEnd] = useState(format(today, 'yyyy-MM-dd'));

  const query = appliedStart && appliedEnd ? `?startDate=${appliedStart}&endDate=${appliedEnd}` : '';
  const prev = appliedStart && appliedEnd ? calcPrevRange(appliedStart, appliedEnd) : null;

  const { data: dashboard, isLoading } = useApiQuery<DashboardMetrics | null>(
    ['reports', 'dashboard', appliedStart, appliedEnd],
    `/dashboard/tenant${query}`,
    { staleTime: STALE_TIMES.FREQUENT, placeholderData: (prevData) => prevData }
  );
  const { data: sales = [] } = useApiQuery<Sale[]>(
    ['reports', 'sales', appliedStart, appliedEnd],
    `/sales${query}`,
    { staleTime: STALE_TIMES.FREQUENT, placeholderData: (prevData) => prevData }
  );
  const { data: dre } = useApiQuery<DreData | null>(
    ['reports', 'dre', appliedStart, appliedEnd],
    `/finance/dre${query}`,
    { staleTime: STALE_TIMES.FREQUENT, placeholderData: (prevData) => prevData }
  );
  const { data: products = [] } = useApiQuery<Product[]>(
    ['reports', 'products'],
    '/products',
    { staleTime: STALE_TIMES.NORMAL }
  );
  const { data: summary } = useApiQuery<SalesSummary | null>(
    ['reports', 'summary', appliedStart, appliedEnd],
    prev ? `/sales/summary${query}&prevStartDate=${prev.prevStart}&prevEndDate=${prev.prevEnd}` : '',
    { enabled: !!prev, staleTime: STALE_TIMES.FREQUENT, placeholderData: (prevData) => prevData }
  );
  const { data: transactions = [] } = useApiQuery<FinancialTransaction[]>(
    ['reports', 'transactions', appliedStart, appliedEnd],
    `/finance/transactions${query}`,
    { enabled: tab === 'financeiro', staleTime: STALE_TIMES.FREQUENT, placeholderData: (prevData) => prevData }
  );
  const { data: receivables = [] } = useApiQuery<Receivable[]>(
    queryKeys.receivables(activeStoreId),
    '/finance/receivables',
    { enabled: tab === 'financeiro', staleTime: STALE_TIMES.FREQUENT, placeholderData: (prevData) => prevData }
  );

  function applyPeriod(p: string) {
    setPeriod(p);
    if (p !== 'personalizado') {
      const today = new Date();
      let start = '';
      let end = format(today, 'yyyy-MM-dd');
      if (p === '7d') start = format(subDays(today, 7), 'yyyy-MM-dd');
      else if (p === '30d') start = format(subDays(today, 30), 'yyyy-MM-dd');
      else if (p === 'este_mes') { start = format(startOfMonth(today), 'yyyy-MM-dd'); }
      else if (p === 'mes_passado') {
        const last = subMonths(today, 1);
        start = format(startOfMonth(last), 'yyyy-MM-dd');
        end = format(endOfMonth(last), 'yyyy-MM-dd');
      }
      setAppliedStart(start);
      setAppliedEnd(end);
    }
  }

  function applyDates() {
    if (period === 'personalizado') {
      setAppliedStart(customStart);
      setAppliedEnd(customEnd);
    } else {
      applyPeriod(period);
    }
  }

  // Sales by payment method
  const salesByMethod = sales.reduce((acc: Record<string, { count: number; total: number }>, s: Sale) => {
    const method = s.formaPagamento || 'OUTROS';
    if (!acc[method]) acc[method] = { count: 0, total: 0 };
    acc[method].count++;
    acc[method].total += Number(s.valorTotalLiquido);
    return acc;
  }, {});

  const paymentChartData = Object.entries(salesByMethod).map(([name, data]) => ({ name: REPORT_PAYMENT_LABELS[name] || name, value: data.total, count: data.count }));

  // Sales by day (ordenado cronologicamente)
  const salesByDay: Record<string, number> = {};
  sales.forEach((s: Sale) => {
    const day = format(new Date(s.dataVenda), 'yyyy-MM-dd');
    salesByDay[day] = (salesByDay[day] || 0) + Number(s.valorTotalLiquido);
  });

  const salesChartData = Object.entries(salesByDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => ({ name: format(new Date(`${key}T12:00:00`), 'dd/MM'), value }));

  // Top products
  const productSales: Record<string, { nome: string; qtd: number; total: number }> = {};
  sales.forEach((s: Sale) => {
    (s.saleItems || []).forEach((item: SaleItem) => {
      const pName = item.product?.nome || 'Produto';
      if (!productSales[pName]) productSales[pName] = { nome: pName, qtd: 0, total: 0 };
      productSales[pName].qtd += Number(item.quantidade);
      productSales[pName].total += Number(item.precoUnitarioVendido) * Number(item.quantidade);
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.total - a.total).slice(0, 10);

  // Low stock
  const lowStockProducts = products.filter((p: Product) => Number(p.qtdEstoqueAtual) <= Number(p.estoqueMinimo));

  // Sales table data for PDF/CSV
  const salesTableData = sales.map((s: Sale) => [
    format(new Date(s.dataVenda), 'dd/MM/yyyy'),
    s.customer?.nomeCompleto || 'Avulso',
    REPORT_PAYMENT_LABELS[s.formaPagamento] || s.formaPagamento,
    formatBRL(s.valorTotalLiquido),
    s.user?.nome || '-',
  ]);

  const periodLabel = () => {
    if (period === 'personalizado') return `${format(new Date(`${appliedStart}T00:00:00`), 'dd/MM/yyyy')} a ${format(new Date(`${appliedEnd}T00:00:00`), 'dd/MM/yyyy')}`;
    return PERIOD_LABELS[period] || period;
  };

  const downloadWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Planilha exportada!');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Vendas', 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${periodLabel()}`, 14, 28);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 34);

    // Summary
    const totalVendas = sales.length;
    const totalValor = sales.reduce((acc, s) => acc + Number(s.valorTotalLiquido), 0);
    const ticketMedio = totalVendas > 0 ? totalValor / totalVendas : 0;
    doc.text(`Total de Vendas: ${totalVendas}`, 14, 44);
    doc.text(`Valor Total: ${formatBRL(totalValor)}`, 14, 50);
    doc.text(`Ticket Médio: ${formatBRL(ticketMedio)}`, 14, 56);

    autoTable(doc, {
      startY: 62,
      head: [['Data', 'Cliente', 'Pagamento', 'Valor', 'Vendedor']],
      body: salesTableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
    });

    doc.save(`relatorio-vendas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exportado!');
  };

  const handleExportCSV = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Vendas');

    sheet.columns = [
      { header: 'Data', key: 'data' },
      { header: 'Cliente', key: 'cliente' },
      { header: 'Forma Pagamento', key: 'pagamento' },
      { header: 'Valor', key: 'valor' },
      { header: 'Status', key: 'status' },
      { header: 'Vendedor', key: 'vendedor' },
    ];

    sales.forEach((s: Sale) => {
      sheet.addRow({
        data: format(new Date(s.dataVenda), 'dd/MM/yyyy'),
        cliente: s.customer?.nomeCompleto || 'Avulso',
        pagamento: REPORT_PAYMENT_LABELS[s.formaPagamento] || s.formaPagamento,
        valor: Number(s.valorTotalLiquido),
        status: s.status,
        vendedor: s.user?.nome || '-',
      });
    });

    await downloadWorkbook(workbook, `relatorio-vendas-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const dreRows = dre ? [
    ['Receita Bruta', formatBRL(dre.receitaBruta || 0)],
    ['Descontos', `- ${formatBRL(dre.deducoes?.descontos || 0)}`],
    ['Taxas de Gateway', `- ${formatBRL(dre.deducoes?.taxasGateway || 0)}`],
    ['Receita Líquida', formatBRL(dre.receitaLiquida || 0)],
    ['CMV (Custo das Vendas)', `- ${formatBRL(dre.custos?.cmv || 0)}`],
    ['Lucro Bruto', formatBRL(dre.lucroBruto || 0)],
    ['Margem Bruta', `${(dre.margemLucroBruto || 0).toFixed(1)}%`],
    ['Impostos Estimados', `- ${formatBRL(dre.impostosEstimados || 0)}`],
    ['Despesas Operacionais', `- ${formatBRL(dre.despesas?.total || 0)}`],
    ...(dre.despesas?.detalhamento || []).map((d: { categoria: string; valor: number }) => [`  ${d.categoria}`, `- ${formatBRL(d.valor)}`]),
    ['Lucro Líquido', formatBRL(dre.lucroLiquido || 0)],
    ['Margem Líquida', `${(dre.margemLucroLiquido || 0).toFixed(1)}%`],
  ] : [];

  const handleExportDrePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório Financeiro (DRE)', 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${periodLabel()}`, 14, 28);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 34);

    autoTable(doc, {
      startY: 42,
      head: [['Conta', 'Valor']],
      body: dreRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241] },
    });

    doc.save(`relatorio-dre-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exportado!');
  };

  const handleExportDreXLSX = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('DRE');
    sheet.columns = [{ header: 'Conta', key: 'conta', width: 34 }, { header: 'Valor', key: 'valor', width: 16 }];
    dreRows.forEach(([conta, valor]) => sheet.addRow({ conta, valor }));
    if (receivables.length > 0) {
      const recSheet = workbook.addWorksheet('Contas a Receber');
      recSheet.columns = [{ header: 'Cliente', key: 'cliente', width: 34 }, { header: 'Vencimento', key: 'venc', width: 14 }, { header: 'Status', key: 'status', width: 12 }, { header: 'Saldo', key: 'saldo', width: 14 }];
      receivables.forEach((r: Receivable) => {
        if ((r.statusExibicao || r.status) === 'PAGO') return;
        recSheet.addRow({
          cliente: r.customer?.nomeCompleto || '-',
          venc: format(new Date(r.dataVencimento), 'dd/MM/yyyy'),
          status: r.statusExibicao || r.status,
          saldo: Number(saldoRestante(r)),
        });
      });
    }
    await downloadWorkbook(workbook, `relatorio-dre-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleExportEstoquePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Estoque', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28);

    autoTable(doc, {
      startY: 36,
      head: [['Produto', 'Categoria', 'Estoque', 'Mínimo', 'Status']],
      body: lowStockProducts.map((p: Product) => [
        p.nome,
        p.category?.nome || '-',
        formatNumber(Number(p.qtdEstoqueAtual) || 0),
        formatNumber(Number(p.estoqueMinimo) || 0),
        'Estoque Baixo',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] },
      pageBreak: 'auto',
    });

    autoTable(doc, {
      head: [['Produto', 'Categoria', 'Estoque', 'Custo Médio', 'Total Imobilizado']],
      body: products.map((p: Product) => [
        p.nome,
        p.category?.nome || '-',
        formatNumber(Number(p.qtdEstoqueAtual) || 0),
        formatBRL(Number(p.precoCusto) || 0),
        formatBRL((Number(p.qtdEstoqueAtual) || 0) * (Number(p.precoCusto) || 0)),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
      pageBreak: 'auto',
    });

    doc.save(`relatorio-estoque-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exportado!');
  };

  const handleExportEstoqueXLSX = async () => {
    const workbook = new ExcelJS.Workbook();
    const lowSheet = workbook.addWorksheet('Estoque Baixo');
    lowSheet.columns = [
      { header: 'Produto', key: 'produto', width: 34 },
      { header: 'Categoria', key: 'categoria', width: 18 },
      { header: 'Estoque', key: 'estoque', width: 10 },
      { header: 'Mínimo', key: 'minimo', width: 10 },
    ];
    lowStockProducts.forEach((p: Product) => {
      lowSheet.addRow({
        produto: p.nome,
        categoria: p.category?.nome || '-',
        estoque: Number(p.qtdEstoqueAtual) || 0,
        minimo: Number(p.estoqueMinimo) || 0,
      });
    });

    const geralSheet = workbook.addWorksheet('Situação Geral');
    geralSheet.columns = [
      { header: 'Produto', key: 'produto', width: 34 },
      { header: 'Categoria', key: 'categoria', width: 18 },
      { header: 'Estoque', key: 'estoque', width: 10 },
      { header: 'Custo Médio', key: 'custo', width: 14 },
      { header: 'Total Imobilizado', key: 'imobilizado', width: 18 },
    ];
    products.forEach((p: Product) => {
      const qtd = Number(p.qtdEstoqueAtual) || 0;
      const custo = Number(p.precoCusto) || 0;
      geralSheet.addRow({ produto: p.nome, categoria: p.category?.nome || '-', estoque: qtd, custo, imobilizado: qtd * custo });
    });

    await downloadWorkbook(workbook, `relatorio-estoque-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const renderPeriodFilter = () => (
    <div className="flex gap-2 flex-wrap items-center mb-4">
      {[
        { key: '7d', label: '7 dias' },
        { key: '30d', label: '30 dias' },
        { key: 'este_mes', label: 'Este mês' },
        { key: 'mes_passado', label: 'Mês passado' },
        { key: 'personalizado', label: 'Personalizado' },
      ].map(({ key, label }) => (
        <button key={key} onClick={() => applyPeriod(key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
      ))}
      {period === 'personalizado' && (
        <div className="flex gap-2 items-center">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          <span className="text-gray-400">até</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        </div>
      )}
    </div>
  );

  if (isLoading && !dashboard) {
    return <div className="p-6 max-w-7xl mx-auto"><div className="text-center py-20 text-gray-500">Carregando relatórios...</div></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios Gerenciais</h1>
        <div className="flex gap-2">
          <button onClick={tab === 'vendas' ? handleExportPDF : tab === 'financeiro' ? handleExportDrePDF : handleExportEstoquePDF} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            PDF
          </button>
          <button onClick={tab === 'vendas' ? handleExportCSV : tab === 'financeiro' ? handleExportDreXLSX : handleExportEstoqueXLSX} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            XLSX
          </button>
          <button onClick={applyDates} className="px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium transition-colors">
            Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'vendas', label: 'Vendas' },
          { key: 'financeiro', label: 'Financeiro (DRE)' },
          { key: 'estoque', label: 'Estoque' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
        ))}
      </div>

      {renderPeriodFilter()}

      {/* TAB: VENDAS */}
      {tab === 'vendas' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const prev = summary?.previous;
              const delta = (atual: number, anterior: number) => anterior === 0 ? (atual === 0 ? 0 : 100) : ((atual - anterior) / anterior) * 100;
              const cards = [
                { label: 'Total de Vendas', value: formatNumber(sales.length), atual: sales.length, prev: prev?.total ?? null },
                { label: 'Faturamento', value: formatBRL(sales.reduce((acc, s) => acc + Number(s.valorTotalLiquido), 0)), atual: sales.reduce((acc, s) => acc + Number(s.valorTotalLiquido), 0), prev: prev?.valor ?? null },
                { label: 'Ticket Médio', value: sales.length > 0 ? formatBRL(sales.reduce((acc, s) => acc + Number(s.valorTotalLiquido), 0) / sales.length) : 'R$ 0,00', atual: sales.length > 0 ? sales.reduce((acc, s) => acc + Number(s.valorTotalLiquido), 0) / sales.length : 0, prev: prev?.ticketMedio ?? null },
                { label: 'Itens Vendidos', value: formatNumber(sales.reduce((acc, s) => acc + (s.saleItems || []).reduce((a: number, i: SaleItem) => a + Number(i.quantidade), 0), 0)), atual: sales.reduce((acc, s) => acc + (s.saleItems || []).reduce((a: number, i: SaleItem) => a + Number(i.quantidade), 0), 0), prev: prev?.itens ?? null },
              ];
              return cards.map(card => {
                const d = card.prev !== null ? delta(card.atual, card.prev) : null;
                return (
                  <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 font-medium uppercase">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                    {d !== null && (
                      <p className={`text-xs font-semibold mt-1 ${d === 0 ? 'text-gray-400' : d > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {d >= 0 ? '▲' : '▼'} {d === 0 ? '0,0' : Math.abs(d).toFixed(1)}% vs período anterior
                      </p>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales by day chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Vendas por Dia</h3>
              {salesChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={salesChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`} />
                    <Tooltip formatter={(value: unknown) => formatBRL(Number(value))} />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">Nenhuma venda no período</div>
              )}
            </div>

            {/* Payment method pie */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Formas de Pagamento</h3>
              {paymentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={paymentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={renderPieLabel}>
                      {paymentChartData.map((_, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: unknown) => formatBRL(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">Nenhum dado</div>
              )}
            </div>
          </div>

          {/* Top products */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 10 Produtos Mais Vendidos</h3>
            {topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Produto</th>
                      <th className="pb-2 font-medium text-right">Qtd</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topProducts.map((p, i: number) => (
                      <tr key={p.nome} className="hover:bg-gray-50">
                        <td className="py-2 text-gray-400">{i + 1}</td>
                        <td className="py-2 text-gray-800">{p.nome}</td>
                        <td className="py-2 text-right text-gray-700">{formatNumber(p.qtd)}</td>
                        <td className="py-2 text-right font-medium">{formatBRL(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">Nenhum produto vendido no período</div>
            )}
          </div>

          {/* Sales table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Vendas do Período</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Pagamento</th>
                    <th className="px-4 py-3 font-medium text-right">Valor</th>
                    <th className="px-4 py-3 font-medium">Vendedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.slice(0, 50).map((s: Sale) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{format(new Date(s.dataVenda), 'dd/MM/yy HH:mm')}</td>
                      <td className="px-4 py-3 text-gray-800">{s.customer?.nomeCompleto || 'Avulso'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{REPORT_PAYMENT_LABELS[s.formaPagamento] || s.formaPagamento}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatBRL(s.valorTotalLiquido)}</td>
                      <td className="px-4 py-3 text-gray-600">{s.user?.nome || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sales.length > 50 && (
              <div className="p-3 text-center text-sm text-gray-400">Mostrando 50 de {sales.length} vendas</div>
            )}
          </div>
        </div>
      )}

      {/* TAB: FINANCEIRO (DRE) */}
      {tab === 'financeiro' && dre && (
        <div className="space-y-6">
          {/* DRE Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Demonstração do Resultado do Exercício (DRE)</h3>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 text-gray-700">Receita Bruta</td>
                    <td className="py-3 text-right font-semibold text-gray-900">{formatBRL(dre.receitaBruta || 0)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50 text-gray-500">
                    <td className="py-2 pl-6">Descontos</td>
                    <td className="py-2 text-right">- {formatBRL(dre.deducoes?.descontos || 0)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50 text-gray-500">
                    <td className="py-2 pl-6">Taxas de Gateway</td>
                    <td className="py-2 text-right">- {formatBRL(dre.deducoes?.taxasGateway || 0)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-t border-gray-200">
                    <td className="py-3 text-gray-700 font-medium">Receita Líquida</td>
                    <td className="py-3 text-right font-bold">{formatBRL(dre.receitaLiquida || 0)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 text-gray-700">CMV (Custo das Vendas)</td>
                    <td className="py-3 text-right">- {formatBRL(dre.custos?.cmv || 0)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-t border-gray-200">
                    <td className="py-3 text-gray-700 font-medium">Lucro Bruto</td>
                    <td className="py-3 text-right font-bold text-green-600">{formatBRL(dre.lucroBruto || 0)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50 text-xs text-gray-400">
                    <td className="py-1 pl-6">Margem Bruta</td>
                    <td className="py-1 text-right">{dre.margemLucroBruto?.toFixed(1)}%</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 text-gray-700">Impostos Estimados{dre.aliquotaImposto ? ` (${dre.aliquotaImposto}%)` : ' (não configurado)'}</td>
                    <td className="py-3 text-right">- {formatBRL(dre.impostosEstimados || 0)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 text-gray-700">Despesas Operacionais</td>
                    <td className="py-3 text-right">- {formatBRL(dre.despesas?.total || 0)}</td>
                  </tr>

                  {/* Expense breakdown */}
                  {(dre.despesas?.detalhamento || []).map((d: { categoria: string; valor: number }, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 text-gray-500">
                      <td className="py-1 pl-6 text-xs">{d.categoria}</td>
                      <td className="py-1 text-right text-xs">{formatBRL(d.valor)}</td>
                    </tr>
                  ))}

                  <tr className="hover:bg-gray-50 border-t-2 border-gray-300">
                    <td className="py-4 text-gray-900 text-base font-bold">Lucro Líquido</td>
                    <td className={`py-4 text-right text-base font-bold ${(dre.lucroLiquido || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatBRL(dre.lucroLiquido || 0)}
                    </td>
                  </tr>
                  <tr className="text-xs text-gray-400">
                    <td className="py-1 pl-6">Margem Líquida</td>
                    <td className="py-1 text-right">{(dre.margemLucroLiquido || 0).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Receivables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Contas a Receber</h3>
              {receivables.length > 0 ? (
                <div className="space-y-2">
                  {(() => {
                    const pendentes = receivables.filter((r: Receivable) => (r.statusExibicao || r.status) !== 'PAGO');
                    const totalPendente = pendentes.reduce((acc: number, r: Receivable) => acc + saldoRestante(r), 0);
                    const vencidos = pendentes.filter((r: Receivable) => (r.statusExibicao || r.status) === 'VENCIDO');
                    const totalVencido = vencidos.reduce((acc: number, r: Receivable) => acc + saldoRestante(r), 0);
                    return (
                      <>
                        <div className="flex justify-between text-sm"><span className="text-gray-600">Total a Receber</span><span className="font-bold">{formatBRL(totalPendente)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-red-600">Vencidos</span><span className="font-bold text-red-600">{formatBRL(totalVencido)} ({vencidos.length})</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-600">A Vencer</span><span className="font-bold">{formatBRL(totalPendente - totalVencido)}</span></div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">Nenhum recebível pendente</div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Transações Financeiras</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {transactions.slice(0, 20).map((t: FinancialTransaction) => (
                  <div key={t.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                    <span className="text-gray-600 truncate max-w-[180px]">{t.descricao || t.categoria}</span>
                    <span className={t.tipo === 'ENTRADA' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {t.tipo === 'ENTRADA' ? '+' : '-'}{formatBRL(t.valor)}
                    </span>
                  </div>
                ))}
                {transactions.length === 0 && <div className="text-gray-400 text-sm text-center py-4">Nenhuma transação</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ESTOQUE */}
      {tab === 'estoque' && (
        <div className="space-y-6">
          {/* Low stock alerts */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">Alertas de Estoque Baixo</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${lowStockProducts.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {lowStockProducts.length} produto{lowStockProducts.length !== 1 ? 's' : ''}
              </span>
            </div>
            {lowStockProducts.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3 font-medium">Produto</th>
                    <th className="px-4 py-3 font-medium text-right">Estoque</th>
                    <th className="px-4 py-3 font-medium text-right">Mínimo</th>
                    <th className="px-4 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lowStockProducts.map((p: Product) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{p.nome}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{formatNumber(Number(p.qtdEstoqueAtual) || 0)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatNumber(Number(p.estoqueMinimo) || 0)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Estoque Baixo</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Todos os produtos estão com estoque adequado</div>
            )}
          </div>

          {/* Full stock list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Situação Geral do Estoque</h3>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3 font-medium">Produto</th>
                    <th className="px-4 py-3 font-medium">Categoria</th>
                    <th className="px-4 py-3 font-medium text-right">Estoque</th>
                    <th className="px-4 py-3 font-medium text-right">Custo Médio</th>
                    <th className="px-4 py-3 font-medium text-right">Total Imobilizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p: Product) => {
                    const qtd = Number(p.qtdEstoqueAtual);
                    const custo = Number(p.precoCusto);
                    const imobilizado = qtd * custo;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-800">{p.nome}</td>
                        <td className="px-4 py-3 text-gray-500">{p.category?.nome || '-'}</td>
                        <td className={`px-4 py-3 text-right font-medium ${qtd <= Number(p.estoqueMinimo) ? 'text-red-600' : 'text-gray-700'}`}>{formatNumber(qtd)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatBRL(custo)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatBRL(imobilizado)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

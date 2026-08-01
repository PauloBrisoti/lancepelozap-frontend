import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../lib/api';
import { useApiQuery } from '../lib/query';
import { toast } from 'react-hot-toast';
import { Download, FileText, Search, ShoppingBag, Inbox } from 'lucide-react';
import { useDateFilter } from '../hooks/useDateFilter';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { SkeletonTable } from '../components/LoadingSkeleton';
import type { Sale, SaleItem, Receivable } from '../types/api';

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  DINHEIRO: 'Dinheiro',
  CREDIARIO: 'Crediário',
  BOLETO: 'Boleto',
  OUTRO: 'Outro',
};

const STATUS_LABELS: Record<string, string> = {
  FINALIZADA: 'Concluída',
  PENDENTE: 'Pendente',
  CANCELADA: 'Cancelada',
};

const PAGE_SIZE = 20;
const CONECTIVOS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

const formatMoney = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const formatNome = (nome: string) => {
  const words = nome.trim().split(/\s+/);
  return words.map((w, i) => {
    const lower = w.toLowerCase();
    if (i > 0 && CONECTIVOS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
};

export function VendasPage() {
  const { activeStoreId, user } = useAuth();
  const storeId = activeStoreId || user?.workspaces?.[0]?.id || '';
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editForm, setEditForm] = useState({ customerId: '', formaPagamento: '', valorDesconto: '', valorSinal: '', numeroParcelas: '1', dataVenda: '' });
  const [dateFilter, setDateFilter] = useState('30d');
  const { start, end, query } = useDateFilter(dateFilter as '7d' | '30d' | 'este_mes' | 'tudo');
  const [search, setSearch] = useState('');
  const [filterPagamento, setFilterPagamento] = useState('TODOS');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const endpoint = `/sales${query}`;

  const { data: salesData, isLoading, refetch } = useApiQuery<Sale[]>(
    ['sales', storeId, dateFilter, start, end],
    endpoint,
    { staleTime: 0 }
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = salesData || [];
    if (filterPagamento !== 'TODOS') list = list.filter(s => s.formaPagamento === filterPagamento);
    if (filterStatus !== 'TODOS') list = list.filter(s => s.status === filterStatus);
    if (term) {
      list = list.filter(s => {
        const cliente = (s.customer?.nomeCompleto || '').toLowerCase();
        const produtos = (s.saleItems || []).map(i => i.product?.nome || '').join(' ').toLowerCase();
        return cliente.includes(term) || produtos.includes(term);
      });
    }
    return [...list].sort((a, b) => {
      const diff = new Date(a.dataVenda).getTime() - new Date(b.dataVenda).getTime();
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [salesData, search, filterPagamento, filterStatus, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [search, filterPagamento, filterStatus, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSales = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = search.trim() !== '' || filterPagamento !== 'TODOS' || filterStatus !== 'TODOS';

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const { token } = await fetchApi<{ token: string }>(`/sales/${deleteTargetId}/request-delete`, { method: 'POST' });
      await fetchApi(`/sales/${deleteTargetId}/confirm-delete`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      toast.success('Venda excluída permanentemente!');
      setShowDeleteModal(false);
      setDeleteTargetId(null);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir venda');
    } finally {
      setDeleting(false);
    }
  };

  const abrirEditar = (sale: Sale) => {
    setEditForm({
      customerId: sale.customerId || '',
      formaPagamento: sale.formaPagamento,
      valorDesconto: String(sale.valorDesconto || 0),
      valorSinal: String(sale.valorSinal || 0),
      numeroParcelas: String(sale.numeroParcelas || 1),
      dataVenda: sale.dataVenda ? new Date(sale.dataVenda).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setEditingSale(sale);
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    try {
      await fetchApi(`/sales/${editingSale.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          customerId: editForm.customerId || undefined,
          formaPagamento: editForm.formaPagamento,
          valorDesconto: Number(editForm.valorDesconto),
          valorSinal: Number(editForm.valorSinal),
          numeroParcelas: Number(editForm.numeroParcelas),
          dataVenda: editForm.dataVenda || undefined,
        })
      });
      toast.success('Venda atualizada!');
      setEditingSale(null);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar venda');
    }
  };

  const itensResumo = (sale: Sale) =>
    (sale.saleItems || []).map(i => `${Number(i.quantidade)}x ${i.product?.nome || 'Produto Removido'}`).join(' | ');

  const fileName = `relatorio-vendas-${new Date().toISOString().split('T')[0]}`;

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Vendas', 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${periodLabel()} | Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);

    const tableData = filtered.map(sale => [
      formatDataHora(sale.dataVenda),
      formatNome(sale.customer?.nomeCompleto || 'Cliente Balcão'),
      itensResumo(sale),
      `R$ ${formatMoney(Number(sale.valorTotalLiquido))}`,
      PAYMENT_LABELS[sale.formaPagamento] || sale.formaPagamento,
      STATUS_LABELS[sale.status] || sale.status,
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Data', 'Cliente', 'Produtos', 'Valor', 'Pagamento', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      foot: [[
        `Total (${filtered.length} venda(s))`,
        '',
        '',
        `R$ ${formatMoney(valorTotalVendas)}`,
        '',
        '',
      ]],
      footStyles: { fillColor: [17, 94, 89], textColor: 255, fontStyle: 'bold' },
    });

    doc.save(`${fileName}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Vendas');

    sheet.columns = [
      { header: 'Data', key: 'data', width: 18 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Produtos', key: 'produtos', width: 45 },
      { header: 'Valor (R$)', key: 'valor', width: 15 },
      { header: 'Pagamento', key: 'pagamento', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    filtered.forEach(sale => {
      sheet.addRow({
        data: formatDataHora(sale.dataVenda),
        cliente: formatNome(sale.customer?.nomeCompleto || 'Cliente Balcão'),
        produtos: itensResumo(sale),
        valor: Number(sale.valorTotalLiquido),
        pagamento: PAYMENT_LABELS[sale.formaPagamento] || sale.formaPagamento,
        status: STATUS_LABELS[sale.status] || sale.status,
      });
    });

    const summary = workbook.addWorksheet('Resumo');
    summary.addRow(['Indicador', 'Valor']);
    summary.addRow(['Total de Vendas', `R$ ${formatMoney(valorTotalVendas)}`]);
    summary.addRow(['Produtos Vendidos', `${totalProdutosVendidos} itens`]);
    summary.addRow(['Vendas Concluídas', `${vendasConcluidas} pedidos`]);
    summary.addRow(['Pagamentos Pendentes', `R$ ${formatMoney(valorPagamentosPendentes)}`]);
    summary.addRow(['Margem Média', `${margemMedia.toFixed(1)}%`]);
    summary.addRow(['CMV', `R$ ${formatMoney(cmvTotalPeriodo)}`]);
    summary.addRow(['Lucro Bruto', `R$ ${formatMoney(lucroLiquidoPeriodo)}`]);
    summary.getColumn(1).width = 25;
    summary.getColumn(2).width = 20;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Excel gerado com sucesso!');
  };

  const periodLabel = () => {
    const map: Record<string, string> = { '7d': 'Últimos 7 dias', '30d': 'Últimos 30 dias', este_mes: 'Este mês', tudo: 'Todo o período' };
    return map[dateFilter] || dateFilter;
  };

  const totalProdutosVendidos = filtered.reduce((acc, sale) => {
    if (sale.status === 'CANCELADA') return acc;
    return acc + (sale.saleItems?.reduce((sum: number, item: SaleItem) => sum + Number(item.quantidade), 0) || 0);
  }, 0);

  const valorTotalVendas = filtered.reduce((acc, sale) => {
    if (sale.status === 'CANCELADA') return acc;
    return acc + Number(sale.valorTotalLiquido);
  }, 0);

  const valorPagamentosPendentes = filtered.reduce((acc, sale) => {
    if (sale.receivables && sale.receivables.length > 0) {
      return acc + sale.receivables.filter((r: Receivable) => (r.statusExibicao || r.status) !== 'PAGO').reduce((sum: number, r: Receivable) => sum + (r.saldoRestante ?? Number(r.valorParcela)), 0);
    }
    if (sale.formaPagamento === 'CREDIARIO' && sale.status === 'PENDENTE') {
      return acc + (Number(sale.valorTotalLiquido) - Number(sale.valorSinal));
    }
    return acc;
  }, 0);

  const vendasConcluidas = filtered.filter(s => s.status === 'FINALIZADA').length;

  const margemMedia = filtered.reduce((acc, sale) => {
    if (sale.status === 'CANCELADA' || !sale.margemLiquida) return acc;
    return acc + Number(sale.margemLiquida);
  }, 0) / (filtered.filter(s => s.status !== 'CANCELADA' && s.margemLiquida).length || 1);

  const cmvTotalPeriodo = filtered.reduce((acc, sale) => {
    if (sale.status === 'CANCELADA') return acc;
    return acc + Number(sale.cmvTotal || 0);
  }, 0);

  const lucroLiquidoPeriodo = filtered.reduce((acc, sale) => {
    if (sale.status === 'CANCELADA') return acc;
    return acc + (Number(sale.margemLiquidaValor || 0));
  }, 0);

  const statusBadge = (status: string) => `px-2 py-1 text-xs font-medium rounded-full ${
    status === 'FINALIZADA' ? 'bg-green-100 text-green-700' :
    status === 'CANCELADA' ? 'bg-red-100 text-red-700' :
    'bg-orange-100 text-orange-700'
  }`;

  const pagamentoLabel = (sale: Sale) => PAYMENT_LABELS[sale.formaPagamento] || sale.formaPagamento;
  const fiadoValor = (sale: Sale) => Math.max(0, Number(sale.valorTotalLiquido) - Number(sale.valorSinal));
  const temParcelaPendente = (sale: Sale) => sale.receivables?.some((r: Receivable) => (r.statusExibicao || r.status) !== 'PAGO');

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">Histórico de Vendas</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5 md:mt-1">Acompanhe todos os pedidos e gere relatórios.</p>
        </div>

        <div className="flex flex-row items-center gap-2 md:gap-3">
          <div className="flex gap-1 md:gap-2">
            <button
              onClick={exportToPDF}
              className="flex items-center justify-center gap-1 md:gap-2 bg-rose-50 text-rose-700 border border-rose-200 p-1.5 md:px-3 md:py-2 rounded-lg font-medium hover:bg-rose-100 transition-colors text-xs md:text-sm" title="Exportar PDF"
            >
              <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden md:inline">PDF</span>
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-1 md:gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 p-1.5 md:px-3 md:py-2 rounded-lg font-medium hover:bg-emerald-100 transition-colors text-xs md:text-sm" title="Exportar Excel"
            >
              <Download className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden md:inline">Excel</span>
            </button>
          </div>

          <div className="flex bg-white rounded-lg p-0.5 md:p-1 border shadow-sm">
            <button onClick={() => setDateFilter('7d')} className={`px-1.5 md:px-3 py-1 md:py-1.5 text-[11px] md:text-sm font-medium rounded-md ${dateFilter === '7d' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>7 Dias</button>
            <button onClick={() => setDateFilter('30d')} className={`px-1.5 md:px-3 py-1 md:py-1.5 text-[11px] md:text-sm font-medium rounded-md ${dateFilter === '30d' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>30 Dias</button>
            <button onClick={() => setDateFilter('este_mes')} className={`px-1.5 md:px-3 py-1 md:py-1.5 text-[11px] md:text-sm font-medium rounded-md ${dateFilter === 'este_mes' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Este Mês</button>
            <button onClick={() => setDateFilter('tudo')} className={`px-1.5 md:px-3 py-1 md:py-1.5 text-[11px] md:text-sm font-medium rounded-md ${dateFilter === 'tudo' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Tudo</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <span className="font-semibold text-gray-500 text-[10px] md:text-sm">Total de Vendas</span>
          </div>
          <p className="text-sm md:text-2xl font-bold text-gray-900 leading-tight">R$ {formatMoney(valorTotalVendas)}</p>
        </div>

        <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <span className="font-semibold text-gray-500 text-[10px] md:text-sm">Produtos Vendidos</span>
          </div>
          <p className="text-sm md:text-2xl font-bold text-gray-900 leading-tight">{totalProdutosVendidos} itens</p>
        </div>

        <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <span className={`font-semibold text-[10px] md:text-sm ${valorPagamentosPendentes > 0 ? 'text-red-500' : 'text-gray-500'}`}>Pagamentos Pendentes</span>
          </div>
          <p className={`text-sm md:text-2xl font-bold leading-tight ${valorPagamentosPendentes > 0 ? 'text-red-600' : 'text-emerald-600'}`}>R$ {formatMoney(valorPagamentosPendentes)}</p>
        </div>

        <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-2 md:p-4 rounded-xl shadow-sm text-white">
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <span className="font-semibold text-brand-100 text-[10px] md:text-sm">Vendas Concluídas</span>
          </div>
          <p className="text-sm md:text-2xl font-bold leading-tight">{vendasConcluidas} <span className="text-[10px] md:text-sm font-normal text-brand-200">pedidos</span></p>
        </div>

        <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <span className="font-semibold text-gray-500 text-[10px] md:text-sm">Margem Média</span>
          </div>
          <p className="text-sm md:text-2xl font-bold text-emerald-600 leading-tight">{margemMedia.toFixed(1)}%</p>
        </div>

        <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <span className="font-semibold text-gray-500 text-[10px] md:text-sm">CMV</span>
          </div>
          <p className="text-sm md:text-xl font-bold text-gray-900 leading-tight">R$ {formatMoney(cmvTotalPeriodo)}</p>
        </div>

        <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <span className="font-semibold text-gray-500 text-[10px] md:text-sm">Lucro Bruto</span>
          </div>
          <p className="text-sm md:text-2xl font-bold text-emerald-700 leading-tight">R$ {formatMoney(lucroLiquidoPeriodo)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex flex-col md:flex-row gap-2 md:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou produto..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterPagamento}
            onChange={e => setFilterPagamento(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="TODOS">Todos os pagamentos</option>
            {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="TODOS">Todos os status</option>
            <option value="FINALIZADA">Concluídas</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} cols={5} />
        ) : pageSales.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            {hasFilters ? (
              <>
                <p className="font-medium text-gray-700 mb-1">Nenhuma venda com os filtros aplicados</p>
                <p className="text-sm">Ajuste a busca ou remova os filtros para ver mais resultados.</p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-700 mb-1">Nenhuma venda registrada ainda</p>
                <Link to="/app/pdv" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                  <ShoppingBag className="w-4 h-4" /> Nova Venda (PDV)
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            {pageSales.length > 0 && (
              <div className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                <span>
                  {filtered.length} venda(s) · {periodLabel()}
                  {hasFilters && <button onClick={() => { setSearch(''); setFilterPagamento('TODOS'); setFilterStatus('TODOS'); }} className="ml-2 text-brand-600 hover:underline font-medium">Limpar filtros</button>}
                </span>
                <span>{totalProdutosVendidos} produtos</span>
              </div>
            )}

            {/* Desktop: Tabela */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 cursor-pointer select-none" onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}>
                      Data {sortDir === 'desc' ? '↓' : '↑'}
                    </th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Produtos</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Pagamento</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedSale(sale)}>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatDataHora(sale.dataVenda)}</td>
                      <td className="px-6 py-4">{formatNome(sale.customer?.nomeCompleto || 'Cliente Balcão')}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 max-w-sm">
                          {sale.saleItems?.map((i: SaleItem) => (
                            <div key={i.id} className="text-xs text-gray-600 truncate">
                              <span className="font-medium text-gray-800">{Number(i.quantidade)}x</span> {i.product?.nome || 'Produto Removido'}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold">R$ {formatMoney(Number(sale.valorTotalLiquido || 0))}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{pagamentoLabel(sale)}</span>
                          {sale.formaPagamento === 'CREDITO' && sale.receivables && sale.receivables.length > 0 && (
                            <span className="text-xs text-gray-500 mt-0.5">
                              Parcelado em {sale.receivables.length}x
                            </span>
                          )}
                          {sale.formaPagamento === 'CREDIARIO' && (
                            <span className="text-xs text-orange-600 font-bold mt-0.5">
                              Fiado: R$ {formatMoney(fiadoValor(sale))}
                            </span>
                          )}
                          {temParcelaPendente(sale) && sale.status !== 'CANCELADA' && (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-red-600 bg-red-100 px-1.5 py-0.5 rounded mt-1 w-max">
                              Pagamento Pendente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={statusBadge(sale.status)}>
                          {STATUS_LABELS[sale.status] || sale.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          {sale.status !== 'CANCELADA' && (
                            <>
                              <button onClick={() => abrirEditar(sale)} className="px-3 py-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded border border-brand-200 transition-colors">
                                Editar
                              </button>
                              <button onClick={(e) => handleDeleteClick(e, sale.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 transition-colors">
                                Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {pageSales.map((sale) => (
                <div key={sale.id} className="p-3 active:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedSale(sale)}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{formatNome(sale.customer?.nomeCompleto || 'Cliente Balcão')}</p>
                      <p className="text-[11px] text-gray-400">{formatDataHora(sale.dataVenda)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">R$ {formatMoney(Number(sale.valorTotalLiquido || 0))}</p>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                        sale.status === 'FINALIZADA' ? 'bg-green-100 text-green-700' :
                        sale.status === 'CANCELADA' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>{STATUS_LABELS[sale.status] || sale.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{pagamentoLabel(sale)}</span>
                    {sale.formaPagamento === 'CREDITO' && sale.receivables && sale.receivables.length > 0 && (
                      <span className="text-gray-400">· {sale.receivables.length}x</span>
                    )}
                    {sale.formaPagamento === 'CREDIARIO' && (
                      <span className="text-orange-600 font-bold">· Fiado: R$ {formatMoney(fiadoValor(sale))}</span>
                    )}
                    {temParcelaPendente(sale) && sale.status !== 'CANCELADA' && (
                      <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100 px-1 rounded">Pendente</span>
                    )}
                  </div>
                  {sale.saleItems && sale.saleItems.length > 0 && (
                    <div className="mt-1.5 text-xs text-gray-400 truncate">
                      {sale.saleItems.map((i: SaleItem, idx: number) => (
                        <span key={i.id}>{idx > 0 && ' · '}{Number(i.quantidade)}x {i.product?.nome || 'Produto Removido'}</span>
                      ))}
                    </div>
                  )}
                  {sale.status !== 'CANCELADA' && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={(e) => { e.stopPropagation(); abrirEditar(sale); }} className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2.5 py-1 rounded border border-brand-200">Editar</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(e, sale.id); }} className="text-xs font-medium text-red-600 hover:text-red-700 px-2.5 py-1 rounded border border-red-200">Excluir</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-xs text-gray-500">
                  Página {page} de {totalPages} · {filtered.length} venda(s)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL EDITAR VENDA */}
      {editingSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Editar Venda</h2>
              <button onClick={() => setEditingSale(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Venda</label>
                <input type="date" value={editForm.dataVenda} onChange={e => setEditForm({...editForm, dataVenda: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pagamento</label>
                <select value={editForm.formaPagamento} onChange={e => setEditForm({...editForm, formaPagamento: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                  <option value="PIX">Pix</option>
                  <option value="CARTAO_CREDITO">Cartão Crédito</option>
                  <option value="CARTAO_DEBITO">Cartão Débito</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CREDIARIO">Crediário (A Prazo)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (R$)</label>
                  <input type="number" min="0" step="0.01" value={editForm.valorDesconto} onChange={e => setEditForm({...editForm, valorDesconto: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                {editForm.formaPagamento === 'CREDIARIO' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sinal (R$)</label>
                    <input type="number" min="0" step="0.01" value={editForm.valorSinal} onChange={e => setEditForm({...editForm, valorSinal: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                )}
              </div>
              {editForm.formaPagamento === 'CREDIARIO' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas</label>
                  <select value={editForm.numeroParcelas} onChange={e => setEditForm({...editForm, numeroParcelas: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                    {[1, 2, 3, 4, 5, 6, 10, 12].map(n => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </div>
              )}
              <div className="pt-2 text-sm text-gray-500">
                Total atual: <strong>R$ {formatMoney(Number(editingSale.valorTotalLiquido))}</strong>
                {editForm.formaPagamento === 'CREDIARIO' && Number(editForm.valorSinal) > 0 && (
                  <span className="ml-2">Fiado: R$ {formatMoney(Math.max(0, Number(editingSale.valorTotalLiquido) - Number(editForm.valorSinal)))}</span>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingSale(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Detalhes do Pedido #{selectedSale.id.substring(0,8)}</h3>
              <button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <span className="block text-gray-500">Data</span>
                  <span className="font-medium text-gray-900">{formatDataHora(selectedSale.dataVenda)}</span>
                </div>
                <div>
                  <span className="block text-gray-500">Cliente</span>
                  <span className="font-medium text-gray-900">{formatNome(selectedSale.customer?.nomeCompleto || 'Cliente Balcão')}</span>
                </div>
                <div>
                  <span className="block text-gray-500">Forma de Pagamento</span>
                  <span className="font-medium text-gray-900">{pagamentoLabel(selectedSale)}</span>
                </div>
                <div>
                  <span className="block text-gray-500">Status</span>
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge(selectedSale.status)}`}>{STATUS_LABELS[selectedSale.status] || selectedSale.status}</span>
                </div>
              </div>

              {selectedSale.observacoes && (
                <div className="mb-6 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                  <span className="block font-semibold mb-1">Informações Adicionais da Planilha:</span>
                  <p>{selectedSale.observacoes}</p>
                </div>
              )}

              <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2">Itens do Pedido</h4>
              <div className="space-y-3">
                {selectedSale.saleItems?.map((item: SaleItem) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.product?.nome || 'Produto Removido / Sem Nome'}</p>
                      <p className="text-xs text-gray-500">{item.quantidade}x R$ {formatMoney(Number(item.precoUnitarioVendido))}</p>
                    </div>
                    <div className="font-semibold text-gray-900">
                      R$ {formatMoney(item.quantidade * Number(item.precoUnitarioVendido))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">R$ {formatMoney(Number(selectedSale.valorTotalBruto))}</span>
                </div>
                {Number(selectedSale.valorDesconto) > 0 && (
                  <div className="flex justify-between items-center mb-2 text-red-500">
                    <span>Desconto</span>
                    <span>- R$ {formatMoney(Number(selectedSale.valorDesconto))}</span>
                  </div>
                )}
                {Number(selectedSale.valorTaxasGateway) > 0 && (
                  <div className="flex justify-between items-center mb-2 text-orange-500">
                    <span>Taxas (cartão)</span>
                    <span>- R$ {formatMoney(Number(selectedSale.valorTaxasGateway))}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Custo das Mercadorias (CMV)</span>
                  <span className="font-medium text-red-600">- R$ {formatMoney(Number(selectedSale.cmvTotal))}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-gray-900 mt-2 pt-2 border-t border-gray-100">
                  <span>Total Pago</span>
                  <span>R$ {formatMoney(Number(selectedSale.valorTotalLiquido))}</span>
                </div>
                {selectedSale.margemLiquida !== undefined && (
                  <div className="flex justify-between items-center mt-2 p-3 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Margem Bruta</p>
                      <p className="text-xs text-emerald-600">R$ {formatMoney(Number(selectedSale.margemBrutaValor || 0))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-800">Margem Líquida</p>
                      <p className="text-lg font-bold text-emerald-700">{Number(selectedSale.margemLiquida).toFixed(1)}%</p>
                    </div>
                  </div>
                )}
                {selectedSale.formaPagamento === 'CREDIARIO' && (
                  <div className="mt-2 text-sm">
                    <div className="flex justify-between items-center text-orange-600 font-medium mb-2">
                      <span>Sinal Recebido: R$ {formatMoney(Number(selectedSale.valorSinal))}</span>
                      <span>Ficou Fiado: R$ {formatMoney(fiadoValor(selectedSale))}</span>
                    </div>
                    {selectedSale.receivables && selectedSale.receivables.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-orange-800 uppercase tracking-wider">Parcelas do Fiado</p>
                        {selectedSale.receivables.map((r: Receivable) => {
                          const totalPago = r.valorJaPago ?? 0;
                          const saldo = r.saldoRestante ?? (Number(r.valorParcela) - totalPago);
                          const status = r.statusExibicao || r.status;
                          const isQuitado = status === 'PAGO';
                          const isParcial = status === 'PAGO_PARCIAL';
                          return (
                            <div key={r.id} className="flex justify-between items-center text-xs">
                              <span className="text-gray-700">
                                {r.numeroParcela}/{r.totalParcelas} — {new Date(r.dataVencimento).toLocaleDateString('pt-BR')}
                              </span>
                              <span className={`font-bold ${isQuitado ? 'text-green-600' : isParcial ? 'text-blue-600' : 'text-orange-700'}`}>
                                R$ {formatMoney(saldo > 0 ? saldo : Number(r.valorParcela))}
                                {isQuitado ? ' ✓ Quitado' : isParcial ? ` (pago R$ ${formatMoney(Number(totalPago))})` : ` (falta R$ ${formatMoney(saldo)})`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-right">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão (sem senha) */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">🗑️ Confirmar Exclusão</h3>
            <p className="text-sm text-gray-500 mb-4">Tem certeza que deseja excluir permanentemente esta venda? O estoque será revertido e os registros financeiros serão ajustados. Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancelar
              </button>
              <button onClick={handleConfirmDelete} disabled={deleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

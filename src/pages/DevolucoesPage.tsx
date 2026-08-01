import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import type { Sale, SaleItem } from '../types/api';

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  CONCLUIDO: 'Concluído',
  REJEITADO: 'Rejeitado',
};

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: 'bg-amber-100 text-amber-700',
  APROVADO: 'bg-blue-100 text-blue-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
  REJEITADO: 'bg-red-100 text-red-700',
};

function formatCurrency(v: number | string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
}

export function DevolucoesPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [motivo, setMotivo] = useState('');

  const limit = 20;

  useEffect(() => { loadReturns(); }, [page, statusFilter]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      let query = `?page=${page}&limit=${limit}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      const data = await fetchApi(`/returns${query}`);
      setReturns(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Erro ao carregar devoluções'); }
    finally { setLoading(false); }
  };

  const openCreate = async () => {
    try {
      const data = await fetchApi('/sales');
      setSales(Array.isArray(data) ? data.filter((s: Sale) => s.status !== 'CANCELADA') : []);
      setSelectedSale(null);
      setSelectedItems({});
      setMotivo('');
      setShowCreateModal(true);
    } catch { toast.error('Erro ao carregar vendas'); }
  };

  const handleSaleSelect = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    setSelectedSale(sale || null);
    setSelectedItems({});
  };

  const toggleItem = (saleItemId: string, maxQtd: number) => {
    setSelectedItems(prev => {
      if (prev[saleItemId]) {
        const next = { ...prev };
        delete next[saleItemId];
        return next;
      }
      return { ...prev, [saleItemId]: maxQtd };
    });
  };

  const updateQtd = (saleItemId: string, qtd: number, maxQtd: number) => {
    if (qtd <= 0) {
      const next = { ...selectedItems };
      delete next[saleItemId];
      setSelectedItems(next);
    } else {
      setSelectedItems(prev => ({ ...prev, [saleItemId]: Math.min(qtd, maxQtd) }));
    }
  };

  const handleCreate = async () => {
    if (!selectedSale || Object.keys(selectedItems).length === 0) {
      toast.error('Selecione uma venda e pelo menos 1 item');
      return;
    }
    try {
      setSaving(true);
      const items = Object.entries(selectedItems).map(([saleItemId, quantidade]) => ({ saleItemId, quantidade }));
      await fetchApi('/returns', {
        method: 'POST',
        body: JSON.stringify({ saleId: selectedSale.id, items, motivo: motivo || undefined }),
      });
      toast.success('Devolução solicitada!');
      setShowCreateModal(false);
      loadReturns();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro ao criar devolução'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetchApi(`/returns/${id}/approve`, { method: 'POST' });
      toast.success('Devolução aprovada!');
      loadReturns();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const handleReject = async (id: string) => {
    const motivoRejeicao = window.prompt('Motivo da rejeição:');
    if (motivoRejeicao === null) return;
    try {
      await fetchApi(`/returns/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ motivoRejeicao: motivoRejeicao || undefined }),
      });
      toast.success('Devolução rejeitada');
      loadReturns();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const handleComplete = async (id: string) => {
    if (!window.confirm('Confirmar restoque dos produtos e conclusão da devolução?')) return;
    try {
      await fetchApi(`/returns/${id}/complete`, { method: 'POST' });
      toast.success('Devolução concluída! Estoque atualizado.');
      loadReturns();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const totalPages = Math.ceil(total / limit);

  const calcReturnTotal = () => {
    if (!selectedSale) return 0;
    return Object.entries(selectedItems).reduce((acc, [saleItemId, qtd]) => {
      const item = selectedSale.saleItems?.find((si: SaleItem) => si.id === saleItemId);
      return acc + (Number(item?.precoUnitarioVendido || 0) * qtd);
    }, 0);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Devoluções</h1>
        <button onClick={openCreate} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium transition-colors">
          + Nova Devolução
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => { setStatusFilter(''); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todos</button>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => { setStatusFilter(key); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : returns.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Nenhuma devolução encontrada</div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Venda</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Valor Devolvido</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Itens</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returns.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">#{r.sale?.id?.slice(0, 8) || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.customer?.nomeCompleto || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(r.valorTotal)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(r.createdAt), 'dd/MM/yy')}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.items?.length || 0} item(ns)</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {r.status === 'PENDENTE' && (
                          <>
                            <button onClick={() => handleApprove(r.id)} className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">Aprovar</button>
                            <button onClick={() => handleReject(r.id)} className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium">Rejeitar</button>
                          </>
                        )}
                        {r.status === 'APROVADO' && (
                          <button onClick={() => handleComplete(r.id)} className="px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium">Concluir (Restocar)</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 disabled:opacity-50">Anterior</button>
              <span className="px-3 py-1.5 text-sm text-gray-500">Página {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 disabled:opacity-50">Próxima</button>
            </div>
          )}
        </>
      )}

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nova Devolução</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a Venda</label>
              <select onChange={e => handleSaleSelect(e.target.value)} value={selectedSale?.id || ''} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Escolha uma venda...</option>
                {sales.map((s: Sale) => (
                  <option key={s.id} value={s.id}>
                    {format(new Date(s.dataVenda), 'dd/MM/yy')} - {s.customer?.nomeCompleto || 'Avulso'} - {formatCurrency(s.valorTotalLiquido)}
                  </option>
                ))}
              </select>
            </div>

            {selectedSale && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Itens da Venda</label>
                  <div className="space-y-2">
                    {selectedSale.saleItems?.map((item: SaleItem) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={!!selectedItems[item.id]}
                          onChange={() => toggleItem(item.id, Number(item.quantidade))}
                          className="rounded border-gray-300"
                        />
                        <span className="flex-1 text-sm text-gray-800">{item.product?.nome || 'Produto'}</span>
                        <span className="text-sm text-gray-500">Qtd: {Number(item.quantidade)}</span>
                        <span className="text-sm text-gray-500">{formatCurrency(item.precoUnitarioVendido)}</span>
                        {selectedItems[item.id] && (
                          <input
                            type="number"
                            value={selectedItems[item.id]}
                            onChange={e => updateQtd(item.id, Number(e.target.value), Number(item.quantidade))}
                            min="1"
                            max={Number(item.quantidade)}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                  <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Cliente desistiu, produto com defeito..." />
                </div>

                <div className="text-right text-lg font-bold text-gray-900 mb-4">
                  Total a restituir: {formatCurrency(calcReturnTotal())}
                </div>
              </>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !selectedSale || Object.keys(selectedItems).length === 0} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Solicitar Devolução'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

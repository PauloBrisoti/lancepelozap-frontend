import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApiQuery, STALE_TIMES, useProducts, useCustomers } from '../lib/query';
import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { SkeletonTable } from '../components/LoadingSkeleton';
import type { Quote, QuoteItem, Customer as CustType, Product as ProdType } from '../types/api';

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho', ENVIADO: 'Enviado', APROVADO: 'Aprovado',
  CONVERTIDO: 'Convertido', CANCELADO: 'Cancelado', VENCIDO: 'Vencido',
};

const STATUS_COLORS: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-700', ENVIADO: 'bg-blue-100 text-blue-700',
  APROVADO: 'bg-green-100 text-green-700', CONVERTIDO: 'bg-purple-100 text-purple-700',
  CANCELADO: 'bg-red-100 text-red-700', VENCIDO: 'bg-amber-100 text-amber-700',
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

interface QuoteItemForm { productId: string; nome: string; quantidade: number; precoUnitario: number; }

export function OrcamentosPage() {
  const { activeStoreId } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<any>(null);
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formItems, setFormItems] = useState<QuoteItemForm[]>([]);
  const [formDesconto, setFormDesconto] = useState(0);
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formValidade, setFormValidade] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: quotesData, isLoading, refetch } = useApiQuery<any>(
    ['quotes', activeStoreId, page, statusFilter],
    `/quotes?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`,
    { enabled: !!activeStoreId, staleTime: STALE_TIMES.FREQUENT }
  );
  const quotes = quotesData?.data || [];
  const total = quotesData?.total || 0;

  const { data: products, refetch: refetchProducts } = useProducts(activeStoreId);
  const { data: customers, refetch: refetchCustomers } = useCustomers(activeStoreId);

  const loadProducts = () => { refetchProducts(); };
  const loadCustomers = () => { refetchCustomers(); };
  const loadQuotes = () => { refetch(); };

  const openNew = () => {
    setEditingQuote(null);
    setFormCustomerId('');
    setFormItems([]);
    setFormDesconto(0);
    setFormObservacoes('');
    setFormValidade('');
    loadProducts();
    loadCustomers();
    setShowModal(true);
  };

  const openEdit = async (quote: Quote) => {
    try {
      const data = await fetchApi(`/quotes/${quote.id}`);
      setEditingQuote(data);
      setFormCustomerId(data.customer?.id || '');
      setFormItems(data.items.map((i: QuoteItem) => ({
        productId: i.product?.id || '',
        nome: i.product?.nome || '',
        quantidade: Number(i.quantidade),
        precoUnitario: Number(i.precoUnitario),
      })));
      setFormDesconto(Number(data.valorDesconto));
      setFormObservacoes(data.observacoes || '');
      setFormValidade(data.validade ? format(new Date(data.validade), 'yyyy-MM-dd') : '');
      loadProducts();
      loadCustomers();
      setShowModal(true);
    } catch {
      toast.error('Erro ao carregar orçamento');
    }
  };

  const addItem = () => {
    setFormItems([...formItems, { productId: '', nome: '', quantidade: 1, precoUnitario: 0 }]);
  };

  const removeItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...formItems];
    (updated[idx] as any)[field] = value;
    if (field === 'productId') {
      const product = products?.find(p => p.id === value);
      if (product) {
        updated[idx].nome = product.nome;
        updated[idx].precoUnitario = Number(product.precoVendaSugerido);
      }
    }
    if (field === 'quantidade' || field === 'precoUnitario') {
      updated[idx][field] = Number(value) || 0;
    }
    setFormItems(updated);
  };

  const calcTotal = () => {
    const bruto = formItems.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);
    return bruto - formDesconto;
  };

  const handleSave = async () => {
    if (formItems.length === 0 || formItems.some(i => !i.productId)) {
      toast.error('Adicione pelo menos 1 produto completo');
      return;
    }

    try {
      setSaving(true);
      const body = {
        customerId: formCustomerId || undefined,
        items: formItems.map(i => ({
          productId: i.productId,
          quantidade: i.quantidade,
          precoUnitario: i.precoUnitario,
        })),
        valorDesconto: formDesconto,
        observacoes: formObservacoes || undefined,
        validade: formValidade || undefined,
      };

      if (editingQuote) {
        await fetchApi(`/quotes/${editingQuote.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        toast.success('Orçamento atualizado!');
      } else {
        await fetchApi('/quotes', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        toast.success('Orçamento criado!');
      }
      setShowModal(false);
      loadQuotes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetchApi(`/quotes/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success(`Status alterado para ${STATUS_LABELS[status]}`);
      loadQuotes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este orçamento?')) return;
    try {
      await fetchApi(`/quotes/${id}`, { method: 'DELETE' });
      toast.success('Orçamento excluído');
      loadQuotes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  const handleConvert = async (quote: Quote) => {
    const pagamento = window.prompt('Forma de pagamento (PIX/DINHEIRO/CARTAO_CREDITO/CREDIARIO):', 'PIX');
    if (!pagamento) return;
    try {
      await fetchApi(`/quotes/${quote.id}/convert`, {
        method: 'POST',
        body: JSON.stringify({ formaPagamento: pagamento.toUpperCase() }),
      });
      toast.success('Orçamento convertido em venda!');
      loadQuotes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao converter');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
        <button onClick={openNew} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium transition-colors">
          + Novo Orçamento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => { setStatusFilter(''); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todos</button>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => { setStatusFilter(key); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : quotes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Nenhum orçamento encontrado</div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Validade</th>
                  <th className="px-4 py-3">Vendedor</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map((quote: Quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">#{quote.quoteNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{quote.customer?.nomeCompleto || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(quote.valorTotalLiquido ?? 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[quote.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[quote.status] || quote.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(quote.createdAt), 'dd/MM/yy')}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{quote.validade ? format(new Date(quote.validade), 'dd/MM/yy') : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{quote.user?.nome || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {quote.status === 'RASCUNHO' && (
                          <>
                            <button onClick={() => openEdit(quote)} className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleStatusChange(quote.id, 'ENVIADO')} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Marcar como Enviado">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                            <button onClick={() => handleDelete(quote.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                        {quote.status === 'ENVIADO' && (
                          <>
                            <button onClick={() => handleStatusChange(quote.id, 'APROVADO')} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Aprovar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button onClick={() => handleConvert(quote)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors font-medium text-xs" title="Converter em Venda">
                              Vender
                            </button>
                            <button onClick={() => handleStatusChange(quote.id, 'CANCELADO')} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </>
                        )}
                        {quote.status === 'APROVADO' && (
                          <button onClick={() => handleConvert(quote)} className="px-2 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium text-xs" title="Converter em Venda">
                            Converter em Venda
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">Anterior</button>
              <span className="px-3 py-1.5 text-sm text-gray-500">Página {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">Próxima</button>
            </div>
          )}
        </>
      )}

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editingQuote ? `Editar Orçamento #${editingQuote.quoteNumber}` : 'Novo Orçamento'}</h2>

            {/* Cliente */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select value={formCustomerId} onChange={e => setFormCustomerId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                <option value="">Sem cliente (avulso)</option>
                {customers?.map((c: CustType) => (
                  <option key={c.id} value={c.id}>{c.nomeCompleto}</option>
                ))}
              </select>
            </div>

            {/* Itens */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Itens</label>
                <button onClick={addItem} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Adicionar Item</button>
              </div>
              {formItems.length === 0 && (
                <p className="text-sm text-gray-400 py-2">Nenhum item adicionado</p>
              )}
              {formItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start mb-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <select value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                      <option value="">Selecione um produto</option>
                      {products?.map((p: ProdType) => (
                        <option key={p.id} value={p.id}>{p.nome} — {formatCurrency(p.precoVendaSugerido ?? 0)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <input type="number" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', e.target.value)} min="0.001" step="1" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center" placeholder="Qtd" />
                  </div>
                  <div className="w-28">
                    <input type="number" value={item.precoUnitario} onChange={e => updateItem(idx, 'precoUnitario', e.target.value)} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right" placeholder="Preço" />
                  </div>
                  <div className="w-24 text-sm font-medium text-gray-700 pt-1.5 text-right">
                    {formatCurrency(item.quantidade * item.precoUnitario)}
                  </div>
                  <button onClick={() => removeItem(idx)} className="p-1.5 text-gray-400 hover:text-red-500 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (R$)</label>
                <input type="number" value={formDesconto} onChange={e => setFormDesconto(Number(e.target.value) || 0)} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
                <input type="date" value={formValidade} onChange={e => setFormValidade(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea value={formObservacoes} onChange={e => setFormObservacoes(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="text-right text-lg font-bold text-gray-900 mb-4">
              Total: {formatCurrency(calcTotal())}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50">
                {saving ? 'Salvando...' : editingQuote ? 'Atualizar Orçamento' : 'Criar Orçamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

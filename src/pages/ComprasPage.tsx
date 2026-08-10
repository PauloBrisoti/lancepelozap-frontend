import { useState } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import type { PurchaseOrder, PurchaseItem, Customer, Product } from '../types/api';
import { Modal } from '../components/Modal';
import { useModal } from '../hooks/useModal';
import { Pagination } from '../components/Pagination';
import { useApiQuery, STALE_TIMES } from '../lib/query';
import { useAuth } from '../context/AuthContext';
import { formatBRL } from '../utils/format';
import { PURCHASE_STATUS_LABELS, PURCHASE_STATUS_COLORS } from '../utils/domainMaps';

interface OrderItemForm {
  productId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
}

interface OrderFormState {
  supplierId: string;
  customerId: string;
  valorVenda: string;
  items: OrderItemForm[];
  desconto: number;
  frete: string;
  observacoes: string;
  dataCompra: string;
  dataPrevisao: string;
  formaPagamento: 'A_VISTA' | 'PARCELADO_FORNECEDOR' | 'CARTAO_CREDITO';
  numeroParcelas: number;
  primeiroVencimento: string;
  valorEntrada: string;
  walletIdEntrada: string;
  creditCardId: string;
}

export function ComprasPage() {
  const { activeStoreId } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
      const [receiveOrder, setReceiveOrder] = useState<any>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const productsQ = useApiQuery<any[]>(['products', activeStoreId], '/products', { staleTime: STALE_TIMES.NORMAL });
  const suppliersQ = useApiQuery<any[]>(['suppliers', activeStoreId], '/suppliers', { staleTime: STALE_TIMES.NORMAL });
  const customersQ = useApiQuery<Customer[]>(['customers', activeStoreId], '/customers', { staleTime: STALE_TIMES.NORMAL });
  const products = productsQ.data ?? [];
  const suppliers = suppliersQ.data ?? [];
  const customers = customersQ.data ?? [];

  const [saving, setSaving] = useState(false);
  const orderModal = useModal();
  const receiveModal = useModal();
  const invoiceModal = useModal();
  const [formOrder, setFormOrder] = useState<OrderFormState>({
    supplierId: '', customerId: '', valorVenda: '', items: [], desconto: 0, frete: '',
    observacoes: '', dataCompra: format(new Date(), 'yyyy-MM-dd'), dataPrevisao: '',
    formaPagamento: 'A_VISTA', numeroParcelas: 3, primeiroVencimento: '', valorEntrada: '',
    walletIdEntrada: '', creditCardId: '',
  });
    const [invoiceTarget, setInvoiceTarget] = useState<{ cardId: string; cardNome: string; mes: string; total: number } | null>(null);
  const [invoiceWalletId, setInvoiceWalletId] = useState('');

  const limit = 20;

  const { data: ordersData, isLoading, refetch } = useApiQuery<{ data: any[]; total: number }>(
    ['purchases', page, statusFilter],
    `/purchases?page=${page}&limit=${limit}${statusFilter ? `&status=${statusFilter}` : ''}`,
    { staleTime: STALE_TIMES.NORMAL }
  );
  const orders = ordersData?.data ?? [];
  const total = ordersData?.total ?? 0;

  const { data: invoices = [], refetch: refetchInvoices } = useApiQuery<any[]>(
    ['purchases', 'invoices'],
    '/purchases/cards/invoices',
    { staleTime: STALE_TIMES.NORMAL }
  );

  const { data: wallets = [] } = useApiQuery<any[]>(
    ['finance', 'dashboard'],
    '/finance/dashboard',
    { staleTime: STALE_TIMES.NORMAL, select: (d) => (d as any)?.wallets ?? [] }
  );

  const { data: creditCards = [] } = useApiQuery<any[]>(
    ['purchases', 'credit-cards'],
    '/purchases/credit-cards',
    { staleTime: STALE_TIMES.NORMAL }
  );

  const openNew = () => {
    setEditingOrder(null);
    setFormOrder({
      supplierId: '', customerId: '', valorVenda: '', items: [], desconto: 0, frete: '',
      observacoes: '', dataCompra: format(new Date(), 'yyyy-MM-dd'), dataPrevisao: '',
      formaPagamento: 'A_VISTA', numeroParcelas: 3, primeiroVencimento: '', valorEntrada: '',
      walletIdEntrada: '', creditCardId: '',
    });
    void productsQ.refetch();
    void suppliersQ.refetch();
    void customersQ.refetch();
    orderModal.openModal();
  };

  const openEdit = async (order: PurchaseOrder) => {
    try {
      const data = await fetchApi(`/purchases/${order.id}`);
      setEditingOrder(data);
      setFormOrder({
        supplierId: data.supplier?.id || '',
        customerId: data.customer?.id || '',
        valorVenda: data.valorVenda ? String(Number(data.valorVenda)) : '',
        items: data.items.map((i: PurchaseItem) => ({
          productId: i.product.id,
          nome: i.product.nome,
          quantidade: Number(i.quantidade),
          precoUnitario: Number(i.precoUnitario),
        })),
        desconto: Number(data.valorDesconto),
        frete: data.valorFrete ? String(Number(data.valorFrete)) : '',
        observacoes: data.observacoes || '',
        dataCompra: data.dataPedido ? format(new Date(data.dataPedido), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        dataPrevisao: data.dataPrevisao ? format(new Date(data.dataPrevisao), 'yyyy-MM-dd') : '',
        formaPagamento: 'A_VISTA', numeroParcelas: 3, primeiroVencimento: '',
        valorEntrada: '', walletIdEntrada: '', creditCardId: '',
      });
      void productsQ.refetch();
      void suppliersQ.refetch();
      void customersQ.refetch();
      orderModal.openModal();
    } catch {
      toast.error('Erro ao carregar pedido');
    }
  };

  const openReceive = async (order: PurchaseOrder) => {
    const data = await fetchApi(`/purchases/${order.id}`);
    setReceiveOrder(data);
    const qtds: Record<string, number> = {};
    data.items.forEach((i: PurchaseItem) => {
      const pendente = Number(i.quantidade) - Number(i.quantidadeRecebida);
      qtds[i.id] = pendente > 0 ? pendente : 0;
    });
    setReceiveQuantities(qtds);
    receiveModal.openModal();
  };

  const addItem = () => {
    setFormOrder(prev => ({ ...prev, items: [...prev.items, { productId: '', nome: '', quantidade: 1, precoUnitario: 0 }] }));
  };

  const removeItem = (idx: number) => {
    setFormOrder(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setFormOrder(prev => {
      const updated = [...prev.items];
      (updated[idx] as any)[field] = value;
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product) {
          updated[idx].nome = product.nome;
          updated[idx].precoUnitario = Number(product.precoCusto) || 0;
        }
      }
      if (field === 'quantidade' || field === 'precoUnitario') {
        updated[idx][field] = Number(value) || 0;
      }
      return { ...prev, items: updated };
    });
  };

  const calcTotal = () => {
    return formOrder.items.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0) - formOrder.desconto;
  };

  const handlePayInvoice = async () => {
    if (!invoiceTarget) return;
    if (!invoiceWalletId) {
      toast.error('Selecione a carteira de pagamento');
      return;
    }
    try {
      setSaving(true);
      await fetchApi(`/purchases/cards/${invoiceTarget.cardId}/invoice/pay`, {
        method: 'POST',
        body: JSON.stringify({ mes: invoiceTarget.mes, walletId: invoiceWalletId }),
      });
      toast.success('Fatura paga com sucesso!');
      invoiceModal.closeModal();
      setInvoiceTarget(null);
      setInvoiceWalletId('');
      refetchInvoices();
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao pagar fatura');
    } finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (formOrder.items.length === 0 || formOrder.items.some(i => !i.productId)) {
      toast.error('Adicione pelo menos 1 produto completo');
      return;
    }
    if (formOrder.formaPagamento === 'A_VISTA' && !formOrder.walletIdEntrada) {
      toast.error('Selecione a carteira de pagamento');
      return;
    }
    if (formOrder.formaPagamento === 'CARTAO_CREDITO' && !formOrder.creditCardId) {
      toast.error('Selecione o cartão de crédito da loja');
      return;
    }
    if (formOrder.formaPagamento !== 'A_VISTA' && formOrder.numeroParcelas > 1 && !formOrder.primeiroVencimento) {
      toast.error('Informe o primeiro vencimento');
      return;
    }
    try {
      setSaving(true);
      const body: Record<string, unknown> = {
        supplierId: formOrder.supplierId || undefined,
        customerId: formOrder.customerId || undefined,
        valorVenda: formOrder.valorVenda ? Number(formOrder.valorVenda) : undefined,
        items: formOrder.items.map(i => ({ productId: i.productId, quantidade: i.quantidade, precoUnitario: i.precoUnitario })),
        valorDesconto: formOrder.desconto,
        valorFrete: formOrder.frete ? Number(formOrder.frete) : undefined,
        observacoes: formOrder.observacoes || undefined,
        dataPedido: formOrder.dataCompra || undefined,
        dataPrevisao: formOrder.dataPrevisao || undefined,
        formaPagamento: formOrder.formaPagamento,
        numeroParcelas: formOrder.formaPagamento === 'A_VISTA' ? 1 : formOrder.numeroParcelas,
        valorEntrada: formOrder.formaPagamento === 'A_VISTA' ? undefined : (formOrder.valorEntrada ? Number(formOrder.valorEntrada) : undefined),
        walletIdEntrada: formOrder.walletIdEntrada || undefined,
        creditCardId: formOrder.formaPagamento === 'CARTAO_CREDITO' ? (formOrder.creditCardId || undefined) : undefined,
        primeiroVencimento: formOrder.formaPagamento !== 'A_VISTA' && formOrder.primeiroVencimento ? formOrder.primeiroVencimento : undefined,
      };
      if (editingOrder) {
        await fetchApi(`/purchases/${editingOrder.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('Pedido atualizado!');
      } else {
        await fetchApi('/purchases', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Pedido criado!');
      }
      orderModal.closeModal();
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetchApi(`/purchases/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      toast.success(`Status alterado`);
      refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este pedido?')) return;
    try {
      await fetchApi(`/purchases/${id}`, { method: 'DELETE' });
      toast.success('Pedido excluído');
      refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro ao excluir'); }
  };

  const handleReceive = async () => {
    if (!receiveOrder) return;
    try {
      setSaving(true);
      const itens = Object.entries(receiveQuantities)
        .filter(([_, qtd]) => qtd > 0)
        .map(([itemId, quantidadeRecebida]) => ({ itemId, quantidadeRecebida }));

      if (itens.length === 0) {
        toast.error('Informe ao menos 1 item para receber');
        return;
      }

      await fetchApi(`/purchases/${receiveOrder.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({ itens }),
      });
      toast.success('Itens recebidos com sucesso!');
      receiveModal.closeModal();
      setReceiveOrder(null);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao receber');
    } finally { setSaving(false); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compras / Pedidos</h1>
        <button onClick={openNew} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium transition-colors">
          + Novo Pedido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => { setStatusFilter(''); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todos</button>
        {Object.entries(PURCHASE_STATUS_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => { setStatusFilter(key); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {/* Faturas de Cartão (baixa em lote — contrato 3.3) */}
      {invoices.length > 0 && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Faturas de Cartão a Pagar</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {invoices.map((inv: any) => (
              <div key={inv.card.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-800 mb-2">{inv.card.nome}{inv.card.bandeira ? ` (${inv.card.bandeira})` : ''} · fatura vence dia {inv.card.diaVencimento}</p>
                <div className="flex flex-col gap-2">
                  {inv.meses.map((mesInv: any) => (
                    <div key={mesInv.mes} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">{format(new Date(mesInv.mes + '-01T12:00:00'), 'MM/yyyy')}</span>
                        <span className="text-xs text-gray-500 ml-2">{mesInv.parcelas} parcela(s) · vencimento {format(new Date(mesInv.vencimento), 'dd/MM')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-900">{formatBRL(mesInv.total)}</span>
                        <button
                          onClick={() => {
                            setInvoiceTarget({ cardId: inv.card.id, cardNome: inv.card.nome, mes: mesInv.mes, total: mesInv.total });
                            setInvoiceWalletId('');
                            invoiceModal.openModal();
                          }}
                          className="px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-xs font-medium"
                        >
                          Pagar Fatura
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Nenhum pedido encontrado</div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Fornecedor</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Data Pedido</th>
                  <th className="px-4 py-3">Previsão Entrega</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Valor Venda</th>
                  <th className="px-4 py-3">Qtd</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order: PurchaseOrder) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">#{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.supplier?.nome || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatBRL(order.valorTotalLiquido)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PURCHASE_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {PURCHASE_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(order.dataPedido), 'dd/MM/yy')}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{order.dataPrevisao ? format(new Date(order.dataPrevisao), 'dd/MM/yy') : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.customer?.nomeCompleto || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-700">{order.valorVenda ? formatBRL(order.valorVenda) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{order.items?.reduce((s: number, i: PurchaseItem) => s + Number(i.quantidade), 0) || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {order.status === 'RASCUNHO' && (
                          <>
                            <button onClick={() => openEdit(order)} className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleStatusChange(order.id, 'PENDENTE')} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Enviar pedido">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                            <button onClick={() => handleDelete(order.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                        {(order.status === 'PENDENTE' || order.status === 'PARCIAL') && (
                          <>
                            <button onClick={() => openReceive(order)} className="px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-xs">
                              Receber
                            </button>
                            <button onClick={() => handleStatusChange(order.id, 'CANCELADO')} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Modal de Criação/Edição */}
      {orderModal.open && (
        <Modal open onClose={orderModal.closeModal} closeDisabled={saving} title={editingOrder ? `Editar Pedido #${editingOrder.orderNumber}` : 'Novo Pedido'} size="lg">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                <select value={formOrder.supplierId} onChange={e => setFormOrder(prev => ({ ...prev, supplierId: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione um fornecedor</option>
                  {suppliers.filter(s => s.status !== 'INATIVO').map((s: { id: string; nome: string; status: string; cnpjCpf?: string }) => (
                    <option key={s.id} value={s.id}>{s.nome}{s.cnpjCpf ? ` (${s.cnpjCpf})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (Encomenda)</label>
                <select value={formOrder.customerId} onChange={e => setFormOrder(prev => ({ ...prev, customerId: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Sem cliente</option>
                  {customers.map((c: Customer) => (
                    <option key={c.id} value={c.id}>{c.nomeCompleto}{c.telefoneWhatsapp ? ` (${c.telefoneWhatsapp})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Itens</label>
                <button onClick={addItem} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Adicionar Item</button>
              </div>
              {formOrder.items.length === 0 && <p className="text-sm text-gray-400 py-2">Nenhum item adicionado</p>}
              {formOrder.items.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mb-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1 w-full sm:w-auto">
                    <select value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                      <option value="">Selecione</option>
                      {products.map((p: Product) => (
                        <option key={p.id} value={p.id}>{p.nome} (R$ {Number(p.precoCusto).toFixed(2)})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="w-20">
                      <input type="number" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', e.target.value)} min="0.001" step="1" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center" />
                    </div>
                    <div className="w-28">
                      <input type="number" value={item.precoUnitario} onChange={e => updateItem(idx, 'precoUnitario', e.target.value)} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right" />
                    </div>
                    <div className="w-24 text-sm font-medium text-gray-700 sm:pt-1.5 text-right">
                      {formatBRL(item.quantidade * item.precoUnitario)}
                    </div>
                    <button onClick={() => removeItem(idx)} className="p-1.5 text-gray-400 hover:text-red-500 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Compra <span className="text-gray-400">(retroativa)</span></label>
                <input type="date" value={formOrder.dataCompra} onChange={e => setFormOrder(prev => ({ ...prev, dataCompra: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Previsão de Entrega</label>
                <input type="date" value={formOrder.dataPrevisao} onChange={e => setFormOrder(prev => ({ ...prev, dataPrevisao: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (R$)</label>
                <input type="number" value={formOrder.desconto} onChange={e => setFormOrder(prev => ({ ...prev, desconto: Number(e.target.value) || 0 }))} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frete (R$) <span className="text-gray-400">(vira custo do estoque)</span></label>
                <input type="number" value={formOrder.frete} onChange={e => setFormOrder(prev => ({ ...prev, frete: e.target.value }))} min="0" step="0.01" placeholder="0,00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Venda (R$)</label>
                <input type="number" value={formOrder.valorVenda} onChange={e => setFormOrder(prev => ({ ...prev, valorVenda: e.target.value }))} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            {!editingOrder && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Condições de Pagamento</p>
                <div className="flex gap-2 mb-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFormOrder(prev => ({ ...prev, formaPagamento: 'A_VISTA' }))}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${formOrder.formaPagamento === 'A_VISTA' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'}`}
                  >
                    À Vista
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOrder(prev => ({ ...prev, formaPagamento: 'PARCELADO_FORNECEDOR' }))}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${formOrder.formaPagamento === 'PARCELADO_FORNECEDOR' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'}`}
                  >
                    Parcelado com Fornecedor
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOrder(prev => ({ ...prev, formaPagamento: 'CARTAO_CREDITO' }))}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${formOrder.formaPagamento === 'CARTAO_CREDITO' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'}`}
                  >
                    Cartão de Crédito da Loja
                  </button>
                </div>

                {formOrder.formaPagamento === 'A_VISTA' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Carteira de Pagamento</label>
                      <select value={formOrder.walletIdEntrada} onChange={e => setFormOrder(prev => ({ ...prev, walletIdEntrada: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="">Selecione</option>
                        {wallets.map((w: any) => (
                          <option key={w.id} value={w.id}>{w.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <p className="text-xs text-gray-500 pb-2">O valor total sai da carteira na data da compra.</p>
                    </div>
                  </div>
                )}

                {formOrder.formaPagamento === 'PARCELADO_FORNECEDOR' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas</label>
                      <input type="number" value={formOrder.numeroParcelas} onChange={e => setFormOrder(prev => ({ ...prev, numeroParcelas: Math.max(1, Number(e.target.value) || 1) }))} min="1" max="120" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">1º Vencimento</label>
                      <input type="date" value={formOrder.primeiroVencimento} onChange={e => setFormOrder(prev => ({ ...prev, primeiroVencimento: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Entrada (opcional)</label>
                      <input type="number" value={formOrder.valorEntrada} onChange={e => setFormOrder(prev => ({ ...prev, valorEntrada: e.target.value }))} min="0" step="0.01" placeholder="0,00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Carteira da Entrada</label>
                      <select value={formOrder.walletIdEntrada} onChange={e => setFormOrder(prev => ({ ...prev, walletIdEntrada: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="">Selecione</option>
                        {wallets.map((w: any) => (
                          <option key={w.id} value={w.id}>{w.nome}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 col-span-1 sm:col-span-2 md:col-span-4">Cada parcela vira uma conta a pagar com vencimento — sem saída de caixa no ato.</p>
                  </div>
                )}

                {formOrder.formaPagamento === 'CARTAO_CREDITO' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas</label>
                      <input type="number" value={formOrder.numeroParcelas} onChange={e => setFormOrder(prev => ({ ...prev, numeroParcelas: Math.max(1, Number(e.target.value) || 1) }))} min="1" max="120" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">1º Vencimento (opcional)</label>
                      <input type="date" value={formOrder.primeiroVencimento} onChange={e => setFormOrder(prev => ({ ...prev, primeiroVencimento: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Cartão de Crédito</label>
                      <select value={formOrder.creditCardId} onChange={e => setFormOrder(prev => ({ ...prev, creditCardId: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="">Selecione o cartão (as parcelas vencem na fatura)</option>
                        {creditCards.length === 0 && (
                          <option value="" disabled>Nenhum cartão cadastrado — cadastre em Configurações</option>
                        )}
                        {creditCards.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.nome}{c.bandeira ? ` (${c.bandeira})` : ''} · vence dia {c.diaVencimento}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 col-span-1 sm:col-span-2 md:col-span-4">Sem saída de caixa no ato: as parcelas agregam na fatura do cartão e são pagas em lote.</p>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea value={formOrder.observacoes} onChange={e => setFormOrder(prev => ({ ...prev, observacoes: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="text-right text-lg font-bold text-gray-900 mb-4">
              Total: {formatBRL(calcTotal())}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={orderModal.closeModal} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Salvando...' : editingOrder ? 'Atualizar' : 'Criar Pedido'}
              </button>
            </div>
        </Modal>
      )}

      {/* Modal de Pagamento de Fatura */}
      {invoiceModal.open && invoiceTarget && (
        <Modal open onClose={invoiceModal.closeModal} closeDisabled={saving} title={`Pagar Fatura ${invoiceTarget.cardNome}`} size="sm">
            <p className="text-sm text-gray-500 mb-4">{format(new Date(invoiceTarget.mes + '-01T12:00:00'), 'MM/yyyy')} · {formatBRL(invoiceTarget.total)}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Carteira de Pagamento</label>
              <select value={invoiceWalletId} onChange={e => setInvoiceWalletId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione</option>
                {wallets.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={invoiceModal.closeModal} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
              <button onClick={handlePayInvoice} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Pagando...' : 'Confirmar Pagamento'}
              </button>
            </div>
        </Modal>
      )}

      {/* Modal de Recebimento */}
      {receiveModal.open && receiveOrder && (
        <Modal open onClose={receiveModal.closeModal} closeDisabled={saving} title={`Receber Pedido #${receiveOrder.orderNumber}`} size="md">
            {receiveOrder.supplier?.nome && <p className="text-sm text-gray-500 mb-4">{receiveOrder.supplier.nome}</p>}

            <div className="space-y-3 mb-4">
              {receiveOrder.items.map((item: PurchaseItem) => {
                const pendente = Number(item.quantidade) - Number(item.quantidadeRecebida);
                return (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{item.product.nome}</span>
                      <span className="text-xs text-gray-500">Pedido: {Number(item.quantidade)} | Recebido: {Number(item.quantidadeRecebida)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Receber agora:</label>
                      <input
                        type="number"
                        value={receiveQuantities[item.id] || 0}
                        onChange={e => setReceiveQuantities(prev => ({ ...prev, [item.id]: Number(e.target.value) || 0 }))}
                        min="0"
                        max={pendente}
                        step="1"
                        className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center"
                      />
                      <span className="text-xs text-gray-400">máx: {pendente}</span>
                      <button
                        onClick={() => setReceiveQuantities(prev => ({ ...prev, [item.id]: pendente }))}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Receber tudo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {receiveOrder.status === 'RECEBIDO' && (
              <div className="text-center py-4 text-amber-600 font-medium text-sm">Este pedido já foi totalmente recebido.</div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={receiveModal.closeModal} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Fechar</button>
              <button onClick={handleReceive} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Processando...' : 'Confirmar Recebimento'}
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}

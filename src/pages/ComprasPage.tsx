import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import type { PurchaseOrder, PurchaseItem, Customer, Product } from '../types/api';

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  PENDENTE: 'Pendente',
  PARCIAL: 'Recebido Parcial',
  RECEBIDO: 'Recebido',
  CANCELADO: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-700',
  PENDENTE: 'bg-blue-100 text-blue-700',
  PARCIAL: 'bg-amber-100 text-amber-700',
  RECEBIDO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

interface OrderItemForm {
  productId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
}

export function ComprasPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveOrder, setReceiveOrder] = useState<any>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [formSupplierId, setFormSupplierId] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formValorVenda, setFormValorVenda] = useState('');
  const [formItems, setFormItems] = useState<OrderItemForm[]>([]);
  const [formDesconto, setFormDesconto] = useState(0);
  const [formFrete, setFormFrete] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formDataCompra, setFormDataCompra] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [formDataPrevisao, setFormDataPrevisao] = useState('');
  const [saving, setSaving] = useState(false);
  const [formFormaPagamento, setFormFormaPagamento] = useState<'A_VISTA' | 'PARCELADO_FORNECEDOR' | 'CARTAO_CREDITO'>('A_VISTA');
  const [formNumeroParcelas, setFormNumeroParcelas] = useState(3);
  const [formPrimeiroVencimento, setFormPrimeiroVencimento] = useState('');
  const [formValorEntrada, setFormValorEntrada] = useState('');
  const [formWalletIdEntrada, setFormWalletIdEntrada] = useState('');
  const [formCreditCardId, setFormCreditCardId] = useState('');
  const [wallets, setWallets] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<{ cardId: string; cardNome: string; mes: string; total: number } | null>(null);
  const [invoiceWalletId, setInvoiceWalletId] = useState('');

  const limit = 20;

  useEffect(() => {
    loadOrders();
    loadInvoices();
    loadPaymentOptions();
  }, [page, statusFilter]);

  const loadInvoices = async () => {
    try {
      const data = await fetchApi('/purchases/cards/invoices');
      setInvoices(Array.isArray(data) ? data : []);
    } catch { setInvoices([]); }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      let query = `?page=${page}&limit=${limit}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      const data = await fetchApi(`/purchases${query}`);
      setOrders(data.data || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await fetchApi('/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch { setProducts([]); }
  };

  const loadSuppliers = async () => {
    try {
      const data = await fetchApi('/suppliers');
      setSuppliers(Array.isArray(data) ? data : []);
    } catch { setSuppliers([]); }
  };

  const loadCustomers = async () => {
    try {
      const data = await fetchApi('/customers');
      setCustomers(Array.isArray(data) ? data : []);
    } catch { setCustomers([]); }
  };

  const loadPaymentOptions = async () => {
    try {
      const dash = await fetchApi('/finance/dashboard');
      setWallets(dash?.wallets || []);
    } catch { setWallets([]); }
    try {
      const cards = await fetchApi('/purchases/credit-cards');
      setCreditCards(Array.isArray(cards) ? cards : []);
    } catch { setCreditCards([]); }
  };

  const openNew = () => {
    setEditingOrder(null);
    setFormSupplierId('');
    setFormCustomerId('');
    setFormValorVenda('');
    setFormItems([]);
    setFormDesconto(0);
    setFormFrete('');
    setFormObservacoes('');
    setFormDataCompra(format(new Date(), 'yyyy-MM-dd'));
    setFormDataPrevisao('');
    setFormFormaPagamento('A_VISTA');
    setFormNumeroParcelas(3);
    setFormPrimeiroVencimento('');
    setFormValorEntrada('');
    setFormWalletIdEntrada('');
    setFormCreditCardId('');
    loadProducts();
    loadSuppliers();
    loadCustomers();
    loadPaymentOptions();
    setShowModal(true);
  };

  const openEdit = async (order: PurchaseOrder) => {
    try {
      const data = await fetchApi(`/purchases/${order.id}`);
      setEditingOrder(data);
      setFormSupplierId(data.supplier?.id || '');
      setFormCustomerId(data.customer?.id || '');
      setFormValorVenda(data.valorVenda ? String(Number(data.valorVenda)) : '');
      setFormItems(data.items.map((i: PurchaseItem) => ({
        productId: i.product.id,
        nome: i.product.nome,
        quantidade: Number(i.quantidade),
        precoUnitario: Number(i.precoUnitario),
      })));
      setFormDesconto(Number(data.valorDesconto));
      setFormFrete(data.valorFrete ? String(Number(data.valorFrete)) : '');
      setFormObservacoes(data.observacoes || '');
      setFormDataCompra(data.dataPedido ? format(new Date(data.dataPedido), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setFormDataPrevisao(data.dataPrevisao ? format(new Date(data.dataPrevisao), 'yyyy-MM-dd') : '');
      loadProducts();
      loadSuppliers();
      loadCustomers();
      setShowModal(true);
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
    setShowReceiveModal(true);
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
      const product = products.find(p => p.id === value);
      if (product) {
        updated[idx].nome = product.nome;
        updated[idx].precoUnitario = Number(product.precoCusto) || 0;
      }
    }
    if (field === 'quantidade' || field === 'precoUnitario') {
      updated[idx][field] = Number(value) || 0;
    }
    setFormItems(updated);
  };

  const calcTotal = () => {
    return formItems.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0) - formDesconto;
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
      setShowInvoiceModal(false);
      setInvoiceTarget(null);
      setInvoiceWalletId('');
      loadInvoices();
      loadOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao pagar fatura');
    } finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (formItems.length === 0 || formItems.some(i => !i.productId)) {
      toast.error('Adicione pelo menos 1 produto completo');
      return;
    }
    if (formFormaPagamento === 'A_VISTA' && !formWalletIdEntrada) {
      toast.error('Selecione a carteira de pagamento');
      return;
    }
    if (formFormaPagamento === 'CARTAO_CREDITO' && !formCreditCardId) {
      toast.error('Selecione o cartão de crédito da loja');
      return;
    }
    if (formFormaPagamento !== 'A_VISTA' && formNumeroParcelas > 1 && !formPrimeiroVencimento) {
      toast.error('Informe o primeiro vencimento');
      return;
    }
    try {
      setSaving(true);
      const body: Record<string, unknown> = {
        supplierId: formSupplierId || undefined,
        customerId: formCustomerId || undefined,
        valorVenda: formValorVenda ? Number(formValorVenda) : undefined,
        items: formItems.map(i => ({ productId: i.productId, quantidade: i.quantidade, precoUnitario: i.precoUnitario })),
        valorDesconto: formDesconto,
        valorFrete: formFrete ? Number(formFrete) : undefined,
        observacoes: formObservacoes || undefined,
        dataPedido: formDataCompra || undefined,
        dataPrevisao: formDataPrevisao || undefined,
        formaPagamento: formFormaPagamento,
        numeroParcelas: formFormaPagamento === 'A_VISTA' ? 1 : formNumeroParcelas,
        valorEntrada: formFormaPagamento === 'A_VISTA' ? undefined : (formValorEntrada ? Number(formValorEntrada) : undefined),
        walletIdEntrada: formWalletIdEntrada || undefined,
        creditCardId: formFormaPagamento === 'CARTAO_CREDITO' ? (formCreditCardId || undefined) : undefined,
        primeiroVencimento: formFormaPagamento !== 'A_VISTA' && formPrimeiroVencimento ? formPrimeiroVencimento : undefined,
      };
      if (editingOrder) {
        await fetchApi(`/purchases/${editingOrder.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('Pedido atualizado!');
      } else {
        await fetchApi('/purchases', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Pedido criado!');
      }
      setShowModal(false);
      loadOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetchApi(`/purchases/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      toast.success(`Status alterado`);
      loadOrders();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este pedido?')) return;
    try {
      await fetchApi(`/purchases/${id}`, { method: 'DELETE' });
      toast.success('Pedido excluído');
      loadOrders();
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
      setShowReceiveModal(false);
      setReceiveOrder(null);
      loadOrders();
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
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
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
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(mesInv.total)}</span>
                        <button
                          onClick={() => {
                            setInvoiceTarget({ cardId: inv.card.id, cardNome: inv.card.nome, mes: mesInv.mes, total: mesInv.total });
                            setInvoiceWalletId('');
                            setShowInvoiceModal(true);
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
      {loading ? (
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
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(order.valorTotalLiquido)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(order.dataPedido), 'dd/MM/yy')}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{order.dataPrevisao ? format(new Date(order.dataPrevisao), 'dd/MM/yy') : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.customer?.nomeCompleto || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-700">{order.valorVenda ? formatCurrency(order.valorVenda) : '—'}</td>
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
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editingOrder ? `Editar Pedido #${editingOrder.orderNumber}` : 'Novo Pedido'}</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                <select value={formSupplierId} onChange={e => setFormSupplierId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione um fornecedor</option>
                  {suppliers.filter(s => s.status !== 'INATIVO').map((s: { id: string; nome: string; status: string; cnpjCpf?: string }) => (
                    <option key={s.id} value={s.id}>{s.nome}{s.cnpjCpf ? ` (${s.cnpjCpf})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (Encomenda)</label>
                <select value={formCustomerId} onChange={e => setFormCustomerId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
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
              {formItems.length === 0 && <p className="text-sm text-gray-400 py-2">Nenhum item adicionado</p>}
              {formItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start mb-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <select value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                      <option value="">Selecione</option>
                      {products.map((p: Product) => (
                        <option key={p.id} value={p.id}>{p.nome} (R$ {Number(p.precoCusto).toFixed(2)})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <input type="number" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', e.target.value)} min="0.001" step="1" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center" />
                  </div>
                  <div className="w-28">
                    <input type="number" value={item.precoUnitario} onChange={e => updateItem(idx, 'precoUnitario', e.target.value)} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right" />
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Compra <span className="text-gray-400">(retroativa)</span></label>
                <input type="date" value={formDataCompra} onChange={e => setFormDataCompra(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Previsão de Entrega</label>
                <input type="date" value={formDataPrevisao} onChange={e => setFormDataPrevisao(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (R$)</label>
                <input type="number" value={formDesconto} onChange={e => setFormDesconto(Number(e.target.value) || 0)} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frete (R$) <span className="text-gray-400">(vira custo do estoque)</span></label>
                <input type="number" value={formFrete} onChange={e => setFormFrete(e.target.value)} min="0" step="0.01" placeholder="0,00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Venda (R$)</label>
                <input type="number" value={formValorVenda} onChange={e => setFormValorVenda(e.target.value)} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            {!editingOrder && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Condições de Pagamento</p>
                <div className="flex gap-2 mb-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFormFormaPagamento('A_VISTA')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${formFormaPagamento === 'A_VISTA' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'}`}
                  >
                    À Vista
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormFormaPagamento('PARCELADO_FORNECEDOR')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${formFormaPagamento === 'PARCELADO_FORNECEDOR' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'}`}
                  >
                    Parcelado com Fornecedor
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormFormaPagamento('CARTAO_CREDITO')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${formFormaPagamento === 'CARTAO_CREDITO' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'}`}
                  >
                    Cartão de Crédito da Loja
                  </button>
                </div>

                {formFormaPagamento === 'A_VISTA' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Carteira de Pagamento</label>
                      <select value={formWalletIdEntrada} onChange={e => setFormWalletIdEntrada(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
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

                {formFormaPagamento === 'PARCELADO_FORNECEDOR' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas</label>
                      <input type="number" value={formNumeroParcelas} onChange={e => setFormNumeroParcelas(Math.max(1, Number(e.target.value) || 1))} min="1" max="120" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">1º Vencimento</label>
                      <input type="date" value={formPrimeiroVencimento} onChange={e => setFormPrimeiroVencimento(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Entrada (opcional)</label>
                      <input type="number" value={formValorEntrada} onChange={e => setFormValorEntrada(e.target.value)} min="0" step="0.01" placeholder="0,00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Carteira da Entrada</label>
                      <select value={formWalletIdEntrada} onChange={e => setFormWalletIdEntrada(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="">Selecione</option>
                        {wallets.map((w: any) => (
                          <option key={w.id} value={w.id}>{w.nome}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 col-span-2 md:col-span-4">Cada parcela vira uma conta a pagar com vencimento — sem saída de caixa no ato.</p>
                  </div>
                )}

                {formFormaPagamento === 'CARTAO_CREDITO' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas</label>
                      <input type="number" value={formNumeroParcelas} onChange={e => setFormNumeroParcelas(Math.max(1, Number(e.target.value) || 1))} min="1" max="120" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">1º Vencimento (opcional)</label>
                      <input type="date" value={formPrimeiroVencimento} onChange={e => setFormPrimeiroVencimento(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Cartão de Crédito</label>
                      <select value={formCreditCardId} onChange={e => setFormCreditCardId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="">Selecione o cartão (as parcelas vencem na fatura)</option>
                        {creditCards.length === 0 && (
                          <option value="" disabled>Nenhum cartão cadastrado — cadastre em Configurações</option>
                        )}
                        {creditCards.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.nome}{c.bandeira ? ` (${c.bandeira})` : ''} · vence dia {c.diaVencimento}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 col-span-2 md:col-span-4">Sem saída de caixa no ato: as parcelas agregam na fatura do cartão e são pagas em lote.</p>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea value={formObservacoes} onChange={e => setFormObservacoes(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="text-right text-lg font-bold text-gray-900 mb-4">
              Total: {formatCurrency(calcTotal())}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Salvando...' : editingOrder ? 'Atualizar' : 'Criar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento de Fatura */}
      {showInvoiceModal && invoiceTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && setShowInvoiceModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Pagar Fatura {invoiceTarget.cardNome}</h2>
            <p className="text-sm text-gray-500 mb-4">{format(new Date(invoiceTarget.mes + '-01T12:00:00'), 'MM/yyyy')} · {formatCurrency(invoiceTarget.total)}</p>
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
              <button onClick={() => setShowInvoiceModal(false)} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
              <button onClick={handlePayInvoice} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Pagando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recebimento */}
      {showReceiveModal && receiveOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && setShowReceiveModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Receber Pedido #{receiveOrder.orderNumber}</h2>
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
              <button onClick={() => setShowReceiveModal(false)} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Fechar</button>
              <button onClick={handleReceive} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Processando...' : 'Confirmar Recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

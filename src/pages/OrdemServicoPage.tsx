import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import toast from 'react-hot-toast';

interface Customer { id: string; nomeCompleto: string; telefoneWhatsapp: string; }
interface Product { id: string; nome: string; qtdEstoqueAtual: number; precoVendaSugerido: number; }
interface ServiceType { id: string; nome: string; descricao: string; precoPadrao: number; tempoEstimado: number | null; categoria: string; ativo: boolean; }

interface OsItem {
  id?: string; tipo: 'SERVICO' | 'PECA'; descricao: string;
  serviceTypeId?: string; productId?: string;
  quantidade: number; precoUnitario: number; valorTotal: number;
  serviceType?: { id: string; nome: string };
  product?: { id: string; nome: string; qtdEstoqueAtual: number };
}

interface ServiceOrder {
  id: string; osNumber: number; status: string; descricao: string;
  observacoes: string; dataEntrada: string; dataPrevisao: string | null;
  dataConclusao: string | null; dataEntrega: string | null;
  maoDeObraValor: number; pecasValor: number; valorDesconto: number;
  valorTotal: number; formaPagamento: string | null;
  modeloEquipamento: string | null; numeroSerie: string | null;
  garantiaDias: number | null;
  customer: Customer | null; user: { id: string; nome: string };
  items: OsItem[];
}

const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto', EM_ANDAMENTO: 'Em Andamento', AGUARDANDO_PECAS: 'Aguardando Peças',
  CONCLUIDO: 'Concluído', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  ABERTO: 'bg-blue-100 text-blue-700', EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
  AGUARDANDO_PECAS: 'bg-orange-100 text-orange-700', CONCLUIDO: 'bg-green-100 text-green-700',
  ENTREGUE: 'bg-gray-100 text-gray-700', CANCELADO: 'bg-red-100 text-red-700',
};

export function OrdemServicoPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const [modal, setModal] = useState<'criar' | 'detalhe' | null>(null);
  const [selected, setSelected] = useState<ServiceOrder | null>(null);
  const [form, setForm] = useState({
    customerId: '', descricao: '', observacoes: '', dataPrevisao: '',
    modeloEquipamento: '', numeroSerie: '', garantiaDias: '',
  });
  const [formItems, setFormItems] = useState<OsItem[]>([]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchApi('/service-orders'),
      fetchApi('/customers'),
      fetchApi('/products?status=ATIVO'),
      fetchApi('/service-orders/service-types'),
    ])
      .then(([o, c, p, st]) => { setOrders(o); setCustomers(c); setProducts(p); setServiceTypes(st); })
      .catch(() => toast.error('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const openCreate = () => {
    setForm({ customerId: '', descricao: '', observacoes: '', dataPrevisao: '', modeloEquipamento: '', numeroSerie: '', garantiaDias: '' });
    setFormItems([]);
    setModal('criar');
  };

  const openDetail = async (id: string) => {
    try {
      const data = await fetchApi(`/service-orders/${id}`);
      setSelected(data);
      setModal('detalhe');
    } catch { toast.error('Erro ao carregar OS'); }
  };

  const addServiceItem = () => {
    setFormItems([...formItems, { tipo: 'SERVICO', descricao: '', quantidade: 1, precoUnitario: 0, valorTotal: 0 }]);
  };

  const addPartItem = () => {
    setFormItems([...formItems, { tipo: 'PECA', descricao: '', quantidade: 1, precoUnitario: 0, valorTotal: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...formItems];
    (items as any)[index][field] = value;
    // Auto-fill from product
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        items[index].descricao = prod.nome;
        items[index].precoUnitario = Number(prod.precoVendaSugerido);
      }
    }
    // Auto-fill from service type
    if (field === 'serviceTypeId') {
      const st = serviceTypes.find(s => s.id === value);
      if (st) {
        items[index].descricao = st.nome;
        items[index].precoUnitario = Number(st.precoPadrao);
      }
    }
    items[index].valorTotal = Number(items[index].quantidade || 1) * Number(items[index].precoUnitario || 0);
    setFormItems(items);
  };

  const removeItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const calcTotal = (items: OsItem[]) =>
    items.reduce((s, i) => s + Number(i.quantidade || 1) * Number(i.precoUnitario || 0), 0);

  const handleCreate = async () => {
    if (!form.customerId) { toast.error('Selecione um cliente'); return; }
    if (formItems.length === 0) { toast.error('Adicione ao menos um serviço ou peça'); return; }

    try {
      const res = await fetchApi('/service-orders', {
        method: 'POST',
        body: JSON.stringify({ ...form, items: formItems }),
      });
      toast.success(`OS #${res.osNumber} criada!`);
      setModal(null);
      loadData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro ao criar OS'); }
  };

  const transition = async (id: string, action: string, body?: Record<string, unknown>) => {
    try {
      const res = await fetchApi(`/service-orders/${id}/${action}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      if (res.error) { toast.error(res.error); return; }
      toast.success('Status atualizado!');
      setModal(null);
      loadData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const filteredOrders = orders.filter(o =>
    !filter || o.osNumber.toString().includes(filter) || o.customer?.nomeCompleto.toLowerCase().includes(filter.toLowerCase())
  );

  const formatCurrency = (v: number | string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const formatDateTime = (d: string) => new Date(d).toLocaleString('pt-BR');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie serviços, reparos e assistência técnica.</p>
        </div>
        <button onClick={openCreate} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition shadow-sm">
          + Nova OS
        </button>
      </div>

      <div className="flex gap-2">
        <input type="text" placeholder="Buscar por nº ou cliente..." className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none w-64"
          value={filter} onChange={e => setFilter(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">#</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Equipamento</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Entrada</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>
              ) : filteredOrders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(o.id)}>
                  <td className="px-6 py-4 font-medium text-gray-900">#{o.osNumber}</td>
                  <td className="px-6 py-4">{o.customer?.nomeCompleto || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{o.modeloEquipamento || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || ''}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{formatCurrency(o.valorTotal)}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{formatDateTime(o.dataEntrada)}</td>
                  <td className="px-6 py-4">
                    <button onClick={(e) => { e.stopPropagation(); openDetail(o.id); }}
                      className="text-brand-600 hover:text-brand-900 text-sm font-medium">Detalhes</button>
                  </td>
                </tr>
              ))}
              {!loading && filteredOrders.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Nenhuma OS encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Criar OS */}
      {modal === 'criar' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900">Nova Ordem de Serviço</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}>
                    <option value="">— Selecionar —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.nomeCompleto}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Previsão</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    value={form.dataPrevisao} onChange={e => setForm({ ...form, dataPrevisao: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo / Equipamento</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    value={form.modeloEquipamento} onChange={e => setForm({ ...form, modeloEquipamento: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nº de Série</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    value={form.numeroSerie} onChange={e => setForm({ ...form, numeroSerie: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Garantia (dias)</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    value={form.garantiaDias} onChange={e => setForm({ ...form, garantiaDias: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Serviço</label>
                <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">Itens da OS</h4>
                  <div className="flex gap-2">
                    <button onClick={addServiceItem} className="text-xs bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg font-medium hover:bg-brand-100">+ Serviço</button>
                    <button onClick={addPartItem} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100">+ Peça</button>
                  </div>
                </div>
                {formItems.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Nenhum item adicionado</p>}
                {formItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start mb-2 p-3 border border-gray-200 rounded-lg">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full mt-1 ${item.tipo === 'SERVICO' ? 'bg-brand-100 text-brand-700' : 'bg-blue-100 text-blue-700'}`}>
                      {item.tipo === 'SERVICO' ? 'Serviço' : 'Peça'}
                    </span>
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      {item.tipo === 'SERVICO' ? (
                        <select className="col-span-4 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          value={item.serviceTypeId || ''} onChange={e => updateItem(i, 'serviceTypeId', e.target.value)}>
                          <option value="">Tipo</option>
                          {serviceTypes.filter(st => st.ativo).map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}
                        </select>
                      ) : (
                        <select className="col-span-4 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          value={item.productId || ''} onChange={e => updateItem(i, 'productId', e.target.value)}>
                          <option value="">Produto</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.nome} (est: {Number(p.qtdEstoqueAtual)})</option>)}
                        </select>
                      )}
                      <input type="text" placeholder="Descrição" className="col-span-3 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        value={item.descricao} onChange={e => updateItem(i, 'descricao', e.target.value)} />
                      <input type="number" placeholder="Qtd" className="col-span-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        value={item.quantidade} onChange={e => updateItem(i, 'quantidade', Number(e.target.value))} min={1} />
                      <input type="number" placeholder="R$" className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        value={item.precoUnitario} onChange={e => updateItem(i, 'precoUnitario', Number(e.target.value))} min={0} step={0.01} />
                      <div className="col-span-1 flex items-center text-sm font-medium text-gray-700">
                        {formatCurrency(item.valorTotal)}
                      </div>
                      <button onClick={() => removeItem(i)} className="col-span-1 text-red-500 hover:text-red-700 text-lg leading-none mt-1">&times;</button>
                    </div>
                  </div>
                ))}
                {formItems.length > 0 && (
                  <div className="text-right text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                    Total: {formatCurrency(calcTotal(formItems))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-5 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={handleCreate} className="px-5 py-2 rounded-lg font-medium text-white bg-brand-600 hover:bg-brand-700 transition shadow-sm">Criar OS</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detalhes OS */}
      {modal === 'detalhe' && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900">OS #{selected.osNumber}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[selected.status] || ''}`}>
                    {STATUS_LABELS[selected.status] || selected.status}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">Aberta em {formatDateTime(selected.dataEntrada)}</p>
                  {selected.dataConclusao && <p className="text-sm text-gray-500">Concluída em {formatDateTime(selected.dataConclusao)}</p>}
                  {selected.dataEntrega && <p className="text-sm text-gray-500">Entregue em {formatDateTime(selected.dataEntrega)}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(selected.valorTotal)}</p>
                  <p className="text-xs text-gray-500">Mão de obra: {formatCurrency(selected.maoDeObraValor)} / Peças: {formatCurrency(selected.pecasValor)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div><span className="text-xs text-gray-500">Cliente</span><p className="font-medium">{selected.customer?.nomeCompleto || '-'}</p></div>
                <div><span className="text-xs text-gray-500">WhatsApp</span><p className="font-medium">{selected.customer?.telefoneWhatsapp || '-'}</p></div>
                <div><span className="text-xs text-gray-500">Modelo</span><p className="font-medium">{selected.modeloEquipamento || '-'}</p></div>
                <div><span className="text-xs text-gray-500">Nº Série</span><p className="font-medium">{selected.numeroSerie || '-'}</p></div>
                {selected.dataPrevisao && <div><span className="text-xs text-gray-500">Previsão</span><p className="font-medium">{formatDate(selected.dataPrevisao)}</p></div>}
                {selected.garantiaDias && <div><span className="text-xs text-gray-500">Garantia</span><p className="font-medium">{selected.garantiaDias} dias</p></div>}
                <div><span className="text-xs text-gray-500">Técnico</span><p className="font-medium">{selected.user?.nome || '-'}</p></div>
                {selected.formaPagamento && <div><span className="text-xs text-gray-500">Pagamento</span><p className="font-medium">{selected.formaPagamento}</p></div>}
              </div>

              {selected.descricao && (
                <div><h4 className="text-sm font-medium text-gray-700 mb-1">Descrição</h4><p className="text-gray-600">{selected.descricao}</p></div>
              )}

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Itens</h4>
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-500 text-xs border-b">
                    <th className="pb-2 text-left">Tipo</th><th className="pb-2 text-left">Descrição</th>
                    <th className="pb-2 text-right">Qtd</th><th className="pb-2 text-right">R$ Unit</th><th className="pb-2 text-right">Total</th>
                  </tr></thead>
                  <tbody>
                    {selected.items.map((item, i) => (
                      <tr key={item.id || i} className="border-b border-gray-100">
                        <td className="py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.tipo === 'SERVICO' ? 'bg-brand-100 text-brand-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.tipo === 'SERVICO' ? 'Serviço' : 'Peça'}
                          </span>
                        </td>
                        <td className="py-2">{item.descricao}</td>
                        <td className="py-2 text-right">{Number(item.quantidade)}</td>
                        <td className="py-2 text-right">{formatCurrency(item.precoUnitario)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(item.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.observacoes && (
                <div><h4 className="text-sm font-medium text-gray-700 mb-1">Observações</h4><p className="text-gray-600">{selected.observacoes}</p></div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                {selected.status === 'ABERTO' && (
                  <button onClick={() => transition(selected.id, 'start')} className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-yellow-700">Iniciar Serviço</button>
                )}
                {selected.status === 'EM_ANDAMENTO' && (
                  <>
                    <button onClick={() => transition(selected.id, 'waiting-parts')} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-orange-700">Aguardando Peças</button>
                    <button onClick={() => transition(selected.id, 'complete')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-green-700">Concluir</button>
                  </>
                )}
                {selected.status === 'AGUARDANDO_PECAS' && (
                  <button onClick={() => transition(selected.id, 'complete')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-green-700">Concluir</button>
                )}
                {selected.status === 'CONCLUIDO' && (
                  <button onClick={() => transition(selected.id, 'deliver', { formaPagamento: 'DINHEIRO' })} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-brand-700">Entregar</button>
                )}
                {!['ENTREGUE', 'CANCELADO'].includes(selected.status) && (
                  <button onClick={() => transition(selected.id, 'cancel')} className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-red-700">Cancelar OS</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

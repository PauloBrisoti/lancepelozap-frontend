import toast from 'react-hot-toast';
import React, { useState } from 'react';
import { fetchApi } from '../lib/api';
import { formatDateTimeBR } from '../lib/dates';
import { useApiQuery, STALE_TIMES } from '../lib/query';

interface Store {
  id: string;
  nomeFantasia: string;
}

interface Product {
  id: string;
  nome: string;
  qtdEstoqueAtual: number;
  codigoVisual?: string;
}

interface TransferItem {
  productId: string;
  nome: string;
  quantidade: number;
  quantidadeRecebida?: number;
}

interface Transfer {
  id: string;
  originStore: { id: string; nomeFantasia: string };
  destinationStore: { id: string; nomeFantasia: string };
  user: { nome: string };
  status: string;
  observacao: string | null;
  createdAt: string;
  items: (TransferItem & { product: { id: string; nome: string; codigoVisual?: string } })[];
}

export function TransferenciasPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [destinoId, setDestinoId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [itens, setItens] = useState<{ productId: string; quantidade: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: transfers = [], isLoading, refetch } = useApiQuery<Transfer[]>(
    ['stock-transfers'],
    '/stock-transfers',
    { staleTime: STALE_TIMES.NORMAL }
  );

  const { data: storesRes } = useApiQuery<Store[] | Store>(
    ['stores', 'my'],
    '/stores/my',
    { staleTime: STALE_TIMES.STATIC }
  );
  const stores = Array.isArray(storesRes) ? storesRes : storesRes ? [storesRes] : [];

  const { data: produtos = [] } = useApiQuery<Product[]>(
    ['products'],
    '/products',
    { staleTime: STALE_TIMES.NORMAL }
  );

  const adicionarItem = () => {
    setItens([...itens, { productId: '', quantidade: '1' }]);
  };

  const atualizarItem = (index: number, field: string, value: string) => {
    const novos = [...itens];
    (novos[index] as any)[field] = value;
    setItens(novos);
  };

  const removerItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinoId || itens.length === 0) return toast.error('Selecione destino e adicione itens');
    setSaving(true);
    try {
      const payload = {
        destinationStoreId: destinoId,
        observacao,
        items: itens.map(i => ({ productId: i.productId, quantidade: Number(i.quantidade) })),
      };
      await fetchApi('/stock-transfers', { method: 'POST', body: JSON.stringify(payload) });
      toast.success('Transferência criada!');
      setModalAberto(false);
      setDestinoId('');
      setObservacao('');
      setItens([]);
      refetch();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleEnviar = async (id: string) => {
    try {
      await fetchApi(`/stock-transfers/${id}/send`, { method: 'POST' });
      toast.success('Transferência enviada!');
      refetch();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleReceber = async (id: string) => {
    try {
      await fetchApi(`/stock-transfers/${id}/receive`, { method: 'POST' });
      toast.success('Transferência recebida!');
      refetch();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleCancelar = async (id: string) => {
    try {
      await fetchApi(`/stock-transfers/${id}/cancel`, { method: 'POST' });
      toast.success('Transferência cancelada');
      refetch();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const statusBadge = (status: string) => {
    const cores: Record<string, string> = {
      PENDENTE: 'bg-yellow-100 text-yellow-800',
      ENVIADO: 'bg-blue-100 text-blue-800',
      RECEBIDO: 'bg-green-100 text-green-800',
      CANCELADO: 'bg-gray-100 text-gray-500',
    };
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${cores[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transferências de Estoque</h1>
        <button onClick={() => setModalAberto(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition shadow-sm">
          + Nova Transferência
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {transfers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma transferência encontrada</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transfers.map(t => (
              <div key={t.id} className="p-4 md:p-5 hover:bg-gray-50 transition">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{t.originStore.nomeFantasia}</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      <span className="font-semibold text-gray-800">{t.destinationStore.nomeFantasia}</span>
                      <span className="ml-2">{statusBadge(t.status)}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {t.items.length} {t.items.length === 1 ? 'item' : 'itens'} • {t.user.nome} • {formatDateTimeBR(t.createdAt)}
                    </div>
                    {t.observacao && <div className="text-sm text-gray-400 mt-1 italic">{t.observacao}</div>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {t.items.map(item => (
                        <span key={item.productId} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {item.product.nome} ({Number(item.quantidade)})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {t.status === 'PENDENTE' && (
                      <>
                        <button onClick={() => handleEnviar(t.id)} className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition">Enviar</button>
                        <button onClick={() => handleCancelar(t.id)} className="px-3 py-1.5 bg-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-300 transition">Cancelar</button>
                      </>
                    )}
                    {t.status === 'ENVIADO' && (
                      <button onClick={() => handleReceber(t.id)} className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition">Receber</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE NOVA TRANSFERÊNCIA */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full md:max-w-2xl max-h-[90dvh] flex flex-col animate-slide-up md:animate-fade-in-up">
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Nova Transferência</h2>
              <button onClick={() => setModalAberto(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleCriar} className="p-4 md:p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loja de Destino *</label>
                <select required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                  value={destinoId} onChange={e => setDestinoId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.nomeFantasia}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <input type="text" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                  value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Motivo da transferência..." />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Itens *</label>
                  <button type="button" onClick={adicionarItem} className="text-sm text-brand-600 font-medium hover:text-brand-800">+ Adicionar Produto</button>
                </div>
                <div className="space-y-2">
                  {itens.map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <select required className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                        value={item.productId} onChange={e => atualizarItem(i, 'productId', e.target.value)}>
                        <option value="">Selecione...</option>
                        {produtos.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nome} ({p.qtdEstoqueAtual} em estoque)
                          </option>
                        ))}
                      </select>
                      <input type="number" min="1" required className="w-24 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                        value={item.quantidade} onChange={e => atualizarItem(i, 'quantidade', e.target.value)} />
                      <button type="button" onClick={() => removerItem(i)} className="p-2 text-red-400 hover:text-red-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                  {itens.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhum item adicionado</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setModalAberto(false)} className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition disabled:opacity-50 shadow-sm">
                  {saving ? 'Criando...' : 'Criar Transferência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

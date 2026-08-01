import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';

interface CountItem {
  id: string;
  productId: string;
  quantidadeSistema: number;
  quantidadeContada: number;
  diferenca: number;
  observacao: string | null;
  product: { id: string; nome: string; codigoVisual?: string };
}

interface InventoryCount {
  id: string;
  dataContagem: string;
  status: string;
  observacao: string | null;
  user: { nome: string };
  items: CountItem[];
  _count: { items: number };
}

export function InventarioPage() {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [_, setCountAberto] = useState<string | null>(null);
  const [editedItems, setEditedItems] = useState<Record<string, string>>({});

  const carregarDados = async () => {
    try {
      const res = await fetchApi('/inventory-counts');
      setCounts(res);
    } catch (error) {
      toast.error('Erro ao carregar contagens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleNovaContagem = async () => {
    setSaving(true);
    try {
      const res = await fetchApi('/inventory-counts', { method: 'POST' });
      setCounts([res, ...counts]);
      setCountAberto(res.id);
      toast.success('Contagem criada! Registre as quantidades.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSalvarItem = async (itemId: string) => {
    const val = editedItems[itemId];
    if (val === undefined) return;
    try {
      const res = await fetchApi(`/inventory-counts/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantidadeContada: Number(val) }),
      });
      setCounts(prev => prev.map(c => ({
        ...c,
        items: c.items.map(i => i.id === itemId ? { ...i, ...res } : i),
      })));
      setEditedItems(prev => { const n = { ...prev }; delete n[itemId]; return n; });
      toast.success('Item atualizado');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleFinalizar = async (id: string) => {
    try {
      await fetchApi(`/inventory-counts/${id}/finalize`, { method: 'POST' });
      toast.success('Contagem finalizada');
      carregarDados();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleConciliar = async (id: string) => {
    try {
      await fetchApi(`/inventory-counts/${id}/reconcile`, { method: 'POST' });
      toast.success('Contagem conciliada! Estoque ajustado.');
      carregarDados();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const statusBadge = (status: string) => {
    const cores: Record<string, string> = {
      ABERTO: 'bg-yellow-100 text-yellow-800',
      FINALIZADO: 'bg-blue-100 text-blue-800',
      CONCILIADO: 'bg-green-100 text-green-800',
    };
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${cores[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventário Físico</h1>
        <button onClick={handleNovaContagem} disabled={saving}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50 shadow-sm">
          {saving ? 'Criando...' : '+ Nova Contagem'}
        </button>
      </div>

      {counts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
          Nenhuma contagem realizada. Clique em "+ Nova Contagem" para iniciar.
        </div>
      ) : (
        <div className="space-y-6">
          {counts.map(count => (
            <div key={count.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-gray-50">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">Contagem #{count.id.slice(0, 8)}</span>
                    {statusBadge(count.status)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {count._count.items} produtos • {count.user.nome} • {new Date(count.dataContagem).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="flex gap-2">
                  {count.status === 'ABERTO' && (
                    <button onClick={() => handleFinalizar(count.id)} className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition">
                      Finalizar
                    </button>
                  )}
                  {count.status === 'FINALIZADO' && (
                    <button onClick={() => handleConciliar(count.id)} className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition">
                      Conciliar
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="text-left p-3 font-medium">Produto</th>
                      <th className="text-right p-3 font-medium">Sistema</th>
                      <th className="text-right p-3 font-medium">Contado</th>
                      <th className="text-right p-3 font-medium">Diferença</th>
                      {count.status === 'ABERTO' && <th className="text-right p-3 font-medium">Ação</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {count.items.map(item => {
                      const editVal = editedItems[item.id] !== undefined ? editedItems[item.id] : item.quantidadeContada.toString();
                      return (
                        <tr key={item.id} className={`hover:bg-gray-50 ${item.diferenca !== 0 && count.status !== 'ABERTO' ? 'bg-red-50' : ''}`}>
                          <td className="p-3 text-gray-800">
                            {item.product.nome}
                            {item.product.codigoVisual && <span className="text-gray-400 ml-1">({item.product.codigoVisual})</span>}
                          </td>
                          <td className="p-3 text-right text-gray-600">{Number(item.quantidadeSistema).toFixed(3)}</td>
                          <td className="p-3 text-right">
                            {count.status === 'ABERTO' ? (
                              <input type="number" step="0.001"
                                className="w-24 text-right px-2 py-1 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                value={editVal}
                                onChange={e => setEditedItems({ ...editedItems, [item.id]: e.target.value })}
                                onBlur={() => handleSalvarItem(item.id)}
                              />
                            ) : (
                              <span className={Number(item.quantidadeContada) !== Number(item.quantidadeSistema) ? 'font-bold text-brand-600' : ''}>
                                {Number(item.quantidadeContada).toFixed(3)}
                              </span>
                            )}
                          </td>
                          <td className={`p-3 text-right font-medium ${item.diferenca > 0 ? 'text-green-600' : item.diferenca < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {item.diferenca > 0 ? '+' : ''}{Number(item.diferenca).toFixed(3)}
                          </td>
                          {count.status === 'ABERTO' && (
                            <td className="p-3 text-right">
                              <button onClick={() => handleSalvarItem(item.id)}
                                className="text-xs text-brand-600 font-medium hover:text-brand-800">
                                Salvar
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

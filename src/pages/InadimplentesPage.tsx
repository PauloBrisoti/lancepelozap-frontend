import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { AlertTriangle, Phone, Mail, Eye, Ban, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApiQuery, STALE_TIMES } from '../lib/query';
import { formatBRL } from '../utils/format';

interface OverdueItem {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  storeName: string;
  planName: string;
  valorMensalidade: number;
  statusPagamento: string;
  dataVencimento: string;
  diasVencido: number;
  invoices: { mesReferencia: string; valorCobrado: number; status: string }[];
}

interface OverdueData {
  total: number;
  totalDevido: number;
  inadimplentes: OverdueItem[];
}

export function InadimplentesPage() {
  const { impersonate } = useAuth();
  const [filter, setFilter] = useState<'TODOS' | 'VENCIDO' | 'PENDENTE'>('TODOS');

  const { data, isLoading, refetch } = useApiQuery<OverdueData>(
    ['super-admin', 'overdue'],
    '/super-admin/overdue',
    { staleTime: STALE_TIMES.FREQUENT }
  );

  const cancelSub = async (id: string) => {
    if (!confirm('Cancelar esta assinatura?')) return;
    try {
      await fetchApi(`/super-admin/subscriptions/${id}/cancel`, { method: 'PUT' });
      toast.success('Assinatura cancelada');
      refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
  };
  
  const markPaid = async (subId: string) => {
    try {
      await fetchApi(`/super-admin/subscriptions/${subId}/plan`, {
        method: 'PUT',
        body: JSON.stringify({ statusPagamento: 'PAGO' }),
      });
      toast.success('Assinatura marcada como paga');
      refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
  };

  const filtered = data?.inadimplentes.filter(i => filter === 'TODOS' || i.statusPagamento === filter) || [];
  const totalFiltered = filtered.reduce((acc, i) => acc + i.valorMensalidade, 0);

  const diasColor = (d: number) => d > 30 ? 'text-red-600' : d > 15 ? 'text-amber-600' : 'text-yellow-600';

  if (isLoading) return <div className="p-8 text-gray-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inadimplentes</h1>
          <p className="text-gray-500 text-sm">{data?.total || 0} assinatura(s) com pagamento pendente</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filtrar:</span>
          {(['TODOS', 'VENCIDO', 'PENDENTE'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f === 'TODOS' ? 'Todos' : f === 'VENCIDO' ? 'Vencidos' : 'Pendentes'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-red-500">
          <p className="text-sm font-medium text-gray-500">Total Inadimplentes</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">{filtered.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-amber-500">
          <p className="text-sm font-medium text-gray-500">Valor Total Devido</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">{formatBRL(totalFiltered)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-brand-500">
          <p className="text-sm font-medium text-gray-500">Média por Inadimplente</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">{filtered.length > 0 ? formatBRL(totalFiltered / filtered.length) : formatBRL(0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold">Loja</th>
                <th className="text-left px-4 py-3 font-semibold">Plano</th>
                <th className="text-right px-4 py-3 font-semibold">Valor</th>
                <th className="text-center px-4 py-3 font-semibold">Dias</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-center px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.clientName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.clientEmail && (
                        <a href={`mailto:${item.clientEmail}`} className="text-gray-400 hover:text-brand-600">
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {item.clientPhone && (
                        <a href={`https://wa.me/55${item.clientPhone.replace(/\D/g, '')}`} target="_blank" className="text-gray-400 hover:text-emerald-600">
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <span className="text-xs text-gray-400">{item.clientEmail}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.storeName}</td>
                  <td className="px-4 py-3 text-gray-600">{item.planName}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatBRL(item.valorMensalidade)}</td>
                  <td className={`px-4 py-3 text-center font-bold ${diasColor(item.diasVencido)}`}>
                    {item.diasVencido}d
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      item.statusPagamento === 'VENCIDO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <AlertTriangle className="w-3 h-3" />
                      {item.statusPagamento === 'VENCIDO' ? 'Vencido' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => impersonate(item.storeName ? item.clientId : '')}
                        className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition" title="Ver como cliente">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => markPaid(item.id)}
                        className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Marcar como pago">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => cancelSub(item.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Cancelar assinatura">
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Nenhum inadimplente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

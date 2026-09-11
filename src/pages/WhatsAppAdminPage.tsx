import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { useApiQuery } from '../lib/query';

interface WhatsAppInstance {
  id: string;
  instanceName: string;
  phone: string;
  status: string;
  storeId: string;
  createdAt: string;
  store?: { nomeFantasia: string };
}

const STATUS_COLORS: Record<string, string> = {
  QR_PENDING: 'bg-yellow-100 text-yellow-700',
  CONNECTED: 'bg-green-100 text-green-700',
  DISCONNECTED: 'bg-gray-100 text-gray-500',
};

export function WhatsAppAdminPage() {
  const { data: sessions = [], isLoading, refetch } = useApiQuery<WhatsAppInstance[]>(
    ['admin-whatsapp-sessions'],
    '/super-admin/whatsapp-sessions',
    { staleTime: 15_000 }
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover esta sessão permanentemente?')) return;
    try {
      await fetchApi(`/super-admin/whatsapp-sessions/${id}`, { method: 'DELETE' });
      toast.success('Sessão removida');
      await refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  const connected = sessions.filter(s => s.status === 'CONNECTED').length;
  const pending = sessions.filter(s => s.status === 'QR_PENDING').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp — Painel Admin</h1>
      <p className="text-sm text-gray-500 mb-6">Visão global de todas as sessões WhatsApp do sistema</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{sessions.length}</div>
          <div className="text-sm text-gray-500">Total de sessões</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{connected}</div>
          <div className="text-sm text-gray-500">Conectadas</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">{pending}</div>
          <div className="text-sm text-gray-500">Aguardando QR</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Nenhuma sessão WhatsApp registrada</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Instância</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-700">{s.store?.nomeFantasia || s.storeId}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.instanceName}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{s.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || STATUS_COLORS.DISCONNECTED}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

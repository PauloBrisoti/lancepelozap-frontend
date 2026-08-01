import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface PendingClient {
  id: string; nome: string; email: string; telefone: string;
  createdAt: string; user: { id: string; nome: string; email: string } | null;
  store: { id: string; nomeFantasia: string } | null;
}

export function AprovacaoCadastrosPage() {
  const [pendentes, setPendentes] = useState<PendingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/super-admin/pending-registrations');
      setPendentes(data);
    } catch { toast.error('Erro ao carregar'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetchApi(`/super-admin/pending-registrations/${id}/approve`, { method: 'POST' });
      toast.success(res.message || 'Aprovado!');
      setPendentes(p => p.filter(c => c.id !== id));
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setActionId(null); }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Rejeitar este cadastro?')) return;
    setActionId(id);
    try {
      const res = await fetchApi(`/super-admin/pending-registrations/${id}/reject`, { method: 'POST' });
      toast.success(res.message || 'Rejeitado');
      setPendentes(p => p.filter(c => c.id !== id));
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setActionId(null); }
  };

  if (loading) return <div className="p-8 text-gray-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aprovação de Cadastros</h1>
          <p className="text-gray-500 text-sm">{pendentes.length} pendente(s)</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg font-medium hover:bg-gray-200">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {pendentes.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 border border-gray-200">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
          <p className="text-lg font-medium">Nenhum cadastro pendente</p>
          <p className="text-sm">Todos os cadastros foram processados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendentes.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{c.nome}</h3>
                      <p className="text-sm text-gray-500">{c.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div><span className="text-gray-400">Telefone:</span> {c.telefone || '-'}</div>
                    <div><span className="text-gray-400">Data:</span> {new Date(c.createdAt).toLocaleDateString('pt-BR')}</div>
                    <div><span className="text-gray-400">Usuário:</span> {c.user?.nome || '-'}</div>
                    <div><span className="text-gray-400">Loja:</span> {c.store?.nomeFantasia || '-'}</div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => handleApprove(c.id)} disabled={actionId === c.id}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition">
                    <CheckCircle className="w-4 h-4" /> {actionId === c.id ? '...' : 'Aprovar'}
                  </button>
                  <button onClick={() => handleReject(c.id)} disabled={actionId === c.id}
                    className="flex items-center gap-1.5 bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 transition">
                    <XCircle className="w-4 h-4" /> Rejeitar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

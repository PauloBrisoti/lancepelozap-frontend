import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { Send, AlertTriangle, CheckCircle, Info, CheckCheck } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  readBy: string[];
  read: boolean;
}

export function NotificacoesAdminPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', message: '', type: 'info' });
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const data = await fetchApi('/super-admin/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch { toast.error('Erro ao carregar notificações'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!form.title || !form.message) return toast.error('Título e mensagem obrigatórios');
    setSending(true);
    try {
      await fetchApi('/super-admin/notifications', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Notificação enviada para todos os lojistas!');
      setForm({ title: '', message: '', type: 'info' });
      load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setSending(false); }
  };

  const typeIcon = (t: string) => {
    switch (t) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notificações Push</h1>
        <p className="text-gray-500 text-sm">Envie notificações para todos os lojistas da plataforma.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-brand-600" /> Nova Notificação
        </h2>
        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
            <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="border border-gray-300 rounded-lg px-3 py-2 outline-none">
                <option value="info">Informativo</option>
                <option value="warning">Alerta</option>
                <option value="success">Sucesso</option>
              </select>
            </div>
            <button onClick={send} disabled={sending}
              className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50">
              <Send className="w-4 h-4" /> {sending ? 'Enviando...' : 'Enviar Notificação'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Histórico de Notificações</h2>
          <span className="text-sm text-gray-500">{notifications.length} notificação(ões)</span>
        </div>
        <div className="divide-y divide-gray-100">
          {notifications.map(n => (
            <div key={n.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50">
              <div className="mt-1">{typeIcon(n.type)}</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{n.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{new Date(n.createdAt).toLocaleString('pt-BR')}</span>
                  <span className="flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" /> {n.readBy?.length || 0} lida(s)
                  </span>
                </div>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-12 text-gray-400">Nenhuma notificação enviada.</div>
          )}
        </div>
      </div>
    </div>
  );
}

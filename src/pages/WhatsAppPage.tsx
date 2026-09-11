import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { useApiQuery } from '../lib/query';
import { useModal } from '../hooks/useModal';
import { Modal } from '../components/Modal';

interface WhatsAppInstance {
  id: string;
  instanceName: string;
  phone: string;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  QR_PENDING: 'bg-yellow-100 text-yellow-700',
  CONNECTED: 'bg-green-100 text-green-700',
  DISCONNECTED: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  QR_PENDING: 'Aguardando QR',
  CONNECTED: 'Conectado',
  DISCONNECTED: 'Desconectado',
};

export function WhatsAppPage() {
  const qrModal = useModal();
  const sendModal = useModal();
  const [saving, setSaving] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [pollingId, setPollingId] = useState<string | null>(null);

  const [sendForm, setSendForm] = useState({ phone: '', message: '' });
  const [sending, setSending] = useState(false);

  const { data: sessions = [], isLoading, refetch } = useApiQuery<WhatsAppInstance[]>(
    ['whatsapp-sessions'],
    '/whatsapp/sessions',
    { staleTime: 10_000 }
  );

  const pollStatus = useCallback(async (id: string) => {
    try {
      const resp = await fetchApi<{ connected: boolean; status: string }>(`/whatsapp/sessions/${id}/status`);
      if (resp.connected) {
        toast.success('WhatsApp conectado!');
        setPollingId(null);
        await refetch();
      }
    } catch {
      // keep polling
    }
  }, [refetch]);

  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(() => pollStatus(pollingId), 3000);
    return () => clearInterval(interval);
  }, [pollingId, pollStatus]);

  const handleCreateSession = async () => {
    try {
      setSaving(true);
      const resp = await fetchApi<{ id: string; qrCode: string; status: string }>(
        '/whatsapp/sessions',
        { method: 'POST', body: JSON.stringify({}) }
      );
      if (resp.qrCode) {
        setQrCode(resp.qrCode);
        setPollingId(resp.id);
        qrModal.openModal();
        toast.success('Sessão criada! Escaneie o QR Code.');
      }
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar sessão';
      if (msg.includes('já existe')) {
        toast.error('Já existe uma sessão conectada. Faça logout primeiro.');
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshQR = async (id: string) => {
    try {
      const resp = await fetchApi<{ qrCode: string }>(`/whatsapp/sessions/${id}/qr`);
      if (resp.qrCode) {
        setQrCode(resp.qrCode);
        setPollingId(id);
        qrModal.openModal();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao obter QR');
    }
  };

  const handleLogout = async (id: string) => {
    if (!window.confirm('Encerrar esta sessão WhatsApp?')) return;
    try {
      await fetchApi(`/whatsapp/sessions/${id}/logout`, { method: 'POST' });
      toast.success('Sessão encerrada');
      await refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover esta sessão permanentemente?')) return;
    try {
      await fetchApi(`/whatsapp/sessions/${id}`, { method: 'DELETE' });
      toast.success('Sessão removida');
      await refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  const handleSend = async () => {
    if (!sendForm.phone.trim() || !sendForm.message.trim()) {
      toast.error('Preencha telefone e mensagem');
      return;
    }
    try {
      setSending(true);
      await fetchApi('/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({ phone: sendForm.phone, message: sendForm.message }),
      });
      toast.success('Mensagem enviada!');
      sendModal.closeModal();
      setSendForm({ phone: '', message: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie as sessões WhatsApp da sua loja</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => sendModal.openModal()}
            disabled={!sessions.some(s => s.status === 'CONNECTED')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar Mensagem
          </button>
          <button
            onClick={handleCreateSession}
            disabled={saving || sessions.some(s => s.status === 'CONNECTED')}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Criando...' : '+ Nova Sessão'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📱</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma sessão WhatsApp</h3>
          <p className="text-gray-500 mb-6">Crie uma sessão para conectar seu WhatsApp ao sistema.</p>
          <button
            onClick={handleCreateSession}
            disabled={saving}
            className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 font-medium transition-colors"
          >
            {saving ? 'Criando...' : 'Conectar WhatsApp'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.instanceName}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{s.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || STATUS_COLORS.DISCONNECTED}`}>
                      {STATUS_LABELS[s.status] || s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {s.status === 'QR_PENDING' && (
                        <button
                          onClick={() => handleRefreshQR(s.id)}
                          className="px-2 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-medium"
                        >
                          Ver QR
                        </button>
                      )}
                      {s.status === 'CONNECTED' && (
                        <button
                          onClick={() => {
                            setSendForm({ phone: '', message: '' });
                            sendModal.openModal();
                          }}
                          className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                        >
                          Enviar
                        </button>
                      )}
                      <button
                        onClick={() => handleLogout(s.id)}
                        className="px-2 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-medium"
                      >
                        Logout
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Code Modal */}
      <Modal open={qrModal.open} onClose={() => { qrModal.closeModal(); setPollingId(null); }} title="Escaneie o QR Code" size="sm">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-600 text-center">
            Abra o WhatsApp no seu celular, vá em <strong>Aparelhos conectados</strong> e escaneie o código.
          </p>
          {qrCode && (
            <img
              src={qrCode}
              alt="QR Code WhatsApp"
              className="w-64 h-64 border border-gray-200 rounded-lg"
            />
          )}
          {pollingId && (
            <p className="text-sm text-amber-600 animate-pulse">Aguardando leitura do QR Code...</p>
          )}
          <button
            onClick={() => { qrModal.closeModal(); setPollingId(null); }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Fechar
          </button>
        </div>
      </Modal>

      {/* Send Message Modal */}
      <Modal open={sendModal.open} onClose={sendModal.closeModal} closeDisabled={sending} title="Enviar Mensagem WhatsApp" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
            <input
              value={sendForm.phone}
              onChange={e => setSendForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Ex: 11999998888"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Número com DDD, sem espaços ou traços</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem *</label>
            <textarea
              value={sendForm.message}
              onChange={e => setSendForm(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              placeholder="Digite sua mensagem..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={sendModal.closeModal}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !sendForm.phone.trim() || !sendForm.message.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState } from 'react';
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
  storeId: string;
  createdAt: string;
  store?: { nomeFantasia: string };
}

interface Store {
  id: string;
  nomeFantasia: string;
}

const STATUS_COLORS: Record<string, string> = {
  QR_PENDING: 'bg-yellow-100 text-yellow-700',
  CONNECTED: 'bg-green-100 text-green-700',
  DISCONNECTED: 'bg-gray-100 text-gray-500',
};

export function WhatsAppAdminPage() {
  const createModal = useModal();
  const qrModal = useModal();
  const sendModal = useModal();
  const [selectedStore, setSelectedStore] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [sendForm, setSendForm] = useState({ phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sendSessionId, setSendSessionId] = useState('');

  const { data: sessions = [], isLoading, refetch } = useApiQuery<WhatsAppInstance[]>(
    ['admin-whatsapp-sessions'],
    '/super-admin/whatsapp-sessions',
    { staleTime: 15_000 }
  );

  const { data: stores = [] } = useApiQuery<Store[]>(
    ['admin-stores'],
    '/super-admin/stores',
    { staleTime: 60_000 }
  );

  const handleCreate = async () => {
    try {
      setCreating(true);
      const resp = await fetchApi<{ id: string; qrCode: string }>(
        '/super-admin/whatsapp-sessions',
        { method: 'POST', body: JSON.stringify({ storeId: selectedStore || undefined }) }
      );
      if (resp.qrCode) {
        setQrCode(resp.qrCode);
        setPollingId(resp.id);
        createModal.closeModal();
        qrModal.openModal();
        toast.success('Sessão criada! Escaneie o QR Code.');
      }
      await refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar sessão');
    } finally {
      setCreating(false);
    }
  };

  const handleRefreshQR = async (id: string) => {
    try {
      const resp = await fetchApi<{ qrCode: string }>(`/super-admin/whatsapp-sessions/${id}/qr`);
      if (resp.qrCode) {
        setQrCode(resp.qrCode);
        setPollingId(id);
        qrModal.openModal();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao obter QR');
    }
  };

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

  const handleSend = async () => {
    if (!sendForm.phone.trim() || !sendForm.message.trim()) {
      toast.error('Preencha telefone e mensagem');
      return;
    }
    try {
      setSending(true);
      await fetchApi(`/super-admin/whatsapp-sessions/${sendSessionId}/send`, {
        method: 'POST',
        body: JSON.stringify(sendForm),
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

  const openSendModal = (sessionId: string) => {
    setSendSessionId(sessionId);
    setSendForm({ phone: '', message: '' });
    sendModal.openModal();
  };

  const connected = sessions.filter(s => s.status === 'CONNECTED').length;
  const pending = sessions.filter(s => s.status === 'QR_PENDING').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp — Painel Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Visão global de todas as sessões WhatsApp do sistema</p>
        </div>
        <button
          onClick={createModal.openModal}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium transition-colors"
        >
          + Nova Sessão
        </button>
      </div>

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
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📱</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma sessão WhatsApp</h3>
          <p className="text-gray-500 mb-6">Crie uma sessão para conectar o WhatsApp de uma loja.</p>
          <button
            onClick={createModal.openModal}
            className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 font-medium transition-colors"
          >
            Conectar WhatsApp
          </button>
        </div>
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
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {s.storeId === null ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        Super Admin
                      </span>
                    ) : (
                      s.store?.nomeFantasia || s.storeId
                    )}
                  </td>
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
                    <div className="flex justify-end gap-1">
                      {s.status === 'CONNECTED' && (
                        <button
                          onClick={() => openSendModal(s.id)}
                          className="px-2 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-xs font-medium"
                        >
                          Enviar
                        </button>
                      )}
                      {s.status === 'QR_PENDING' && (
                        <button
                          onClick={() => handleRefreshQR(s.id)}
                          className="px-2 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-medium"
                        >
                          Ver QR
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Session Modal */}
      <Modal open={createModal.open} onClose={createModal.closeModal} closeDisabled={creating} title="Nova Sessão WhatsApp" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vincular a</label>
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Super Admin (pessoal)</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.nomeFantasia}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={createModal.closeModal}
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {creating ? 'Criando...' : 'Criar Sessão'}
            </button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal open={qrModal.open} onClose={() => { qrModal.closeModal(); setPollingId(null); }} title="Escaneie o QR Code" size="sm">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-600 text-center">
            Abra o WhatsApp no celular, vá em <strong>Aparelhos conectados</strong> e escaneie.
          </p>
          {qrCode && (
            <img src={qrCode} alt="QR Code" className="w-64 h-64 border border-gray-200 rounded-lg" />
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

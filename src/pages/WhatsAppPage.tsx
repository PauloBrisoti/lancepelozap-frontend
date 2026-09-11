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

interface WhatsAppConfig {
  id: string;
  billingEnabled: boolean;
  disclaimerAccepted: boolean;
  sendReceiptText: boolean;
  sendReceiptPdf: boolean;
  rules: BillingRule[];
}

interface BillingRule {
  id: string;
  ruleType: string;
  diasOffset: number;
  mensagem: string;
  ativo: boolean;
}

interface MessageLog {
  id: string;
  tipo: string;
  phone: string;
  message: string;
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

const RULE_TYPE_LABELS: Record<string, string> = {
  DIAS_ANTES_VENC: 'Dias antes do vencimento',
  DIA_VENC: 'No dia do vencimento',
  DIAS_APOS_VENC: 'Dias após o vencimento',
};

type Tab = 'sessoes' | 'config' | 'logs';

export function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>('sessoes');
  const qrModal = useModal();
  const sendModal = useModal();
  const ruleModal = useModal();
  const [saving, setSaving] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<BillingRule | null>(null);

  const [sendForm, setSendForm] = useState({ phone: '', message: '' });
  const [sending, setSending] = useState(false);

  const [ruleForm, setRuleForm] = useState({ ruleType: 'DIAS_ANTES_VENC', diasOffset: -2, mensagem: '', ativo: true });

  const { data: sessions = [], isLoading, refetch } = useApiQuery<WhatsAppInstance[]>(
    ['whatsapp-sessions'],
    '/whatsapp/sessions',
    { staleTime: 10_000 }
  );

  const { data: config, refetch: refetchConfig } = useApiQuery<WhatsAppConfig>(
    ['whatsapp-config'],
    '/whatsapp/config',
    { staleTime: 30_000 }
  );

  const { data: logsData } = useApiQuery<{ logs: MessageLog[] }>(
    ['whatsapp-logs'],
    '/whatsapp/logs?limit=50',
    { staleTime: 10_000 }
  );

  const pollStatus = useCallback(async (id: string) => {
    try {
      const resp = await fetchApi<{ connected: boolean }>(`/whatsapp/sessions/${id}/status`);
      if (resp.connected) {
        toast.success('WhatsApp conectado!');
        setPollingId(null);
        await refetch();
      }
    } catch { /* keep polling */ }
  }, [refetch]);

  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(() => pollStatus(pollingId), 3000);
    return () => clearInterval(interval);
  }, [pollingId, pollStatus]);

  const handleCreateSession = async () => {
    try {
      setSaving(true);
      const resp = await fetchApi<{ id: string; qrCode: string }>('/whatsapp/sessions', { method: 'POST', body: JSON.stringify({}) });
      if (resp.qrCode) {
        setQrCode(resp.qrCode);
        setPollingId(resp.id);
        qrModal.openModal();
        toast.success('Sessão criada! Escaneie o QR Code.');
      }
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar sessão';
      toast.error(msg.includes('já existe') ? 'Já existe uma sessão conectada.' : msg);
    } finally { setSaving(false); }
  };

  const handleRefreshQR = async (id: string) => {
    try {
      const resp = await fetchApi<{ qrCode: string }>(`/whatsapp/sessions/${id}/qr`);
      if (resp.qrCode) { setQrCode(resp.qrCode); setPollingId(id); qrModal.openModal(); }
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const handleLogout = async (id: string) => {
    if (!window.confirm('Encerrar esta sessão WhatsApp?')) return;
    try { await fetchApi(`/whatsapp/sessions/${id}/logout`, { method: 'POST' }); toast.success('Sessão encerrada'); await refetch(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover esta sessão permanentemente?')) return;
    try { await fetchApi(`/whatsapp/sessions/${id}`, { method: 'DELETE' }); toast.success('Sessão removida'); await refetch(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const handleSend = async () => {
    if (!sendForm.phone.trim() || !sendForm.message.trim()) { toast.error('Preencha telefone e mensagem'); return; }
    try {
      setSending(true);
      await fetchApi('/whatsapp/send', { method: 'POST', body: JSON.stringify(sendForm) });
      toast.success('Mensagem enviada!'); sendModal.closeModal(); setSendForm({ phone: '', message: '' });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro ao enviar'); }
    finally { setSending(false); }
  };

  const handleToggleConfig = async (field: string, value: boolean) => {
    try {
      const body: any = { [field]: value };
      if (field === 'billingEnabled' && value) body.disclaimerAccepted = true;
      await fetchApi('/whatsapp/config', { method: 'PUT', body: JSON.stringify(body) });
      toast.success('Configuração atualizada');
      await refetchConfig();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const handleSaveRule = async () => {
    try {
      if (editingRule) {
        await fetchApi(`/whatsapp/config/rules/${editingRule.id}`, { method: 'PUT', body: JSON.stringify(ruleForm) });
        toast.success('Regra atualizada');
      } else {
        await fetchApi('/whatsapp/config/rules', { method: 'POST', body: JSON.stringify(ruleForm) });
        toast.success('Regra criada');
      }
      ruleModal.closeModal();
      setEditingRule(null);
      await refetchConfig();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('Remover esta regra?')) return;
    try { await fetchApi(`/whatsapp/config/rules/${ruleId}`, { method: 'DELETE' }); toast.success('Regra removida'); await refetchConfig(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const openEditRule = (rule: BillingRule) => {
    setEditingRule(rule);
    setRuleForm({ ruleType: rule.ruleType, diasOffset: rule.diasOffset, mensagem: rule.mensagem, ativo: rule.ativo });
    ruleModal.openModal();
  };

  const connected = sessions.some(s => s.status === 'CONNECTED');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie sessões, envio de mensagens e régua de cobrança</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => sendModal.openModal()} disabled={!connected}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Enviar Mensagem
          </button>
          <button onClick={handleCreateSession} disabled={saving || connected}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium transition-colors disabled:opacity-50">
            {saving ? 'Criando...' : '+ Nova Sessão'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['sessoes', 'Sessões'], ['config', 'Cobrança & Recibos'], ['logs', 'Histórico']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Sessões */}
      {tab === 'sessoes' && (
        isLoading ? <div className="text-center py-12 text-gray-500">Carregando...</div>
        : sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma sessão WhatsApp</h3>
            <p className="text-gray-500 mb-6">Crie uma sessão para conectar seu WhatsApp ao sistema.</p>
            <button onClick={handleCreateSession} disabled={saving}
              className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 font-medium transition-colors">
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
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {s.status === 'QR_PENDING' && (
                          <button onClick={() => handleRefreshQR(s.id)} className="px-2 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-medium">Ver QR</button>
                        )}
                        <button onClick={() => handleLogout(s.id)} className="px-2 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-medium">Logout</button>
                        <button onClick={() => handleDelete(s.id)} className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Tab: Configuração */}
      {tab === 'config' && config && (
        <div className="space-y-6">
          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-3">
              <span className="text-amber-600 text-xl">⚠️</span>
              <div>
                <h4 className="font-medium text-amber-800">Política Antispam do WhatsApp</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Para evitar bloqueio do número: use um chip <strong>aquecido</strong> (com histórico de uso regular),
                  tenha <strong>consentimento</strong> dos clientes para receber mensagens, e
                  <strong>evite volumes altos</strong> de disparos simultâneos. Envie no máximo 50 mensagens/hora.
                  O sistema envia automaticamente com intervalo entre envios.
                </p>
              </div>
            </div>
          </div>

          {/* Toggle: Régua de Cobrança */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Régua de Cobrança Automática</h3>
                <p className="text-sm text-gray-500">Envie lembretes de vencimento e atraso automaticamente</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.billingEnabled} onChange={e => handleToggleConfig('billingEnabled', e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {config.billingEnabled && (
              <div className="space-y-4 mt-4 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={config.disclaimerAccepted} onChange={e => handleToggleConfig('disclaimerAccepted', e.target.checked)}
                    className="h-4 w-4 text-brand-600 rounded" />
                  <span className="text-sm text-gray-700">Li e aceito as políticas de uso responsável do WhatsApp</span>
                </div>
              </div>
            )}
          </div>

          {/* Toggle: Formato de Recibo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Formato de Recibo de Pagamento</h3>
            <p className="text-sm text-gray-500 mb-4">Escolha como enviar o comprovante ao cliente após baixa de pagamento</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={config.sendReceiptText} onChange={() => handleToggleConfig('sendReceiptText', true)} className="text-brand-600" />
                <span className="text-sm text-gray-700">Texto formatado</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={config.sendReceiptPdf} onChange={() => { handleToggleConfig('sendReceiptPdf', true); handleToggleConfig('sendReceiptText', false); }} className="text-brand-600" />
                <span className="text-sm text-gray-700">Documento PDF</span>
              </label>
            </div>
          </div>

          {/* Regras de Cobrança */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Regras de Cobrança</h3>
              <button onClick={() => { setEditingRule(null); setRuleForm({ ruleType: 'DIAS_ANTES_VENC', diasOffset: -2, mensagem: 'Olá! Lembrete: sua parcela vence em {dias}. Valor: {valor}. Pix Copia e Cola: {pix}', ativo: true }); ruleModal.openModal(); }}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Nova Regra</button>
            </div>
            {config.rules.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma regra configurada</p>
            ) : (
              <div className="space-y-3">
                {config.rules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${rule.ativo ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        <span className="text-sm font-medium text-gray-900">{RULE_TYPE_LABELS[rule.ruleType] || rule.ruleType}</span>
                        <span className="text-xs text-gray-500">({rule.diasOffset > 0 ? `+${rule.diasOffset}` : rule.diasOffset} dias)</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate max-w-lg">{rule.mensagem}</p>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <button onClick={() => openEditRule(rule)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">Editar</button>
                      <button onClick={() => handleDeleteRule(rule.id)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Logs */}
      {tab === 'logs' && (
        logsData?.logs && logsData.logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Nenhuma mensagem enviada ainda</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Mensagem</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logsData?.logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-medium text-gray-700">{log.tipo}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{log.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs">{log.message}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${log.status === 'ENVIADO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* QR Code Modal */}
      <Modal open={qrModal.open} onClose={() => { qrModal.closeModal(); setPollingId(null); }} title="Escaneie o QR Code" size="sm">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-600 text-center">Abra o WhatsApp no celular, vá em <strong>Aparelhos conectados</strong> e escaneie.</p>
          {qrCode && <img src={qrCode} alt="QR Code" className="w-64 h-64 border border-gray-200 rounded-lg" />}
          {pollingId && <p className="text-sm text-amber-600 animate-pulse">Aguardando leitura do QR Code...</p>}
          <button onClick={() => { qrModal.closeModal(); setPollingId(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Fechar</button>
        </div>
      </Modal>

      {/* Send Message Modal */}
      <Modal open={sendModal.open} onClose={sendModal.closeModal} closeDisabled={sending} title="Enviar Mensagem WhatsApp" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
            <input value={sendForm.phone} onChange={e => setSendForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="Ex: 11999998888" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Número com DDD, sem espaços ou traços</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem *</label>
            <textarea value={sendForm.message} onChange={e => setSendForm(prev => ({ ...prev, message: e.target.value }))} rows={4} placeholder="Digite sua mensagem..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={sendModal.closeModal} disabled={sending} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button onClick={handleSend} disabled={sending || !sendForm.phone.trim() || !sendForm.message.trim()} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Rule Modal */}
      <Modal open={ruleModal.open} onClose={() => { ruleModal.closeModal(); setEditingRule(null); }} title={editingRule ? 'Editar Regra' : 'Nova Regra de Cobrança'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Regra</label>
            <select value={ruleForm.ruleType} onChange={e => setRuleForm(prev => ({ ...prev, ruleType: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="DIAS_ANTES_VENC">Dias antes do vencimento</option>
              <option value="DIA_VENC">No dia do vencimento</option>
              <option value="DIAS_APOS_VENC">Dias após o vencimento</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dias (offset)</label>
            <input type="number" value={ruleForm.diasOffset} onChange={e => setRuleForm(prev => ({ ...prev, diasOffset: Number(e.target.value) }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Negativo = antes, 0 = no dia, positivo = após</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
            <textarea value={ruleForm.mensagem} onChange={e => setRuleForm(prev => ({ ...prev, mensagem: e.target.value }))} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Variáveis: {'{valor}'} {'{pix}'} {'{cliente}'} {'{parcela}'}</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={ruleForm.ativo} onChange={e => setRuleForm(prev => ({ ...prev, ativo: e.target.checked }))} className="h-4 w-4 text-brand-600 rounded" />
            <span className="text-sm text-gray-700">Regra ativa</span>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => { ruleModal.closeModal(); setEditingRule(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button onClick={handleSaveRule} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700">Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
